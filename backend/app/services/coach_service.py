import json
import logging
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.core.ai_client import ai_client
from app.core.ai_exceptions import (
    AIException,
    AIMissingAPIKeyError,
    AIAuthenticationError,
    AITimeoutError,
    AIRateLimitError,
    AIProviderUnavailableError,
    AIResponseError,
)
from app.schemas.ai import LLMMessage, LLMCompletionRequest
from app.schemas.coach import CoachChatRequest, CoachChatResponse
from app.services.context_builder import ContextBuilder

from app.models.chat_message import ChatMessage
from app.schemas.chat_message import ChatMessageResponse
from app.services.ai_memory_service import AIMemoryService

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are FitMind AI Coach, an intelligent fitness assistant grounded strictly in verified physiological data.
Your job is to provide clear, empathetic, and actionable guidance based on the user's supplied FitMind data and pre-calculated ground facts.

Core Behavioral Principles (Decision 12):
- THE AI COACH ONLY REASONS AND EXPLAINS — IT NEVER CALCULATES OR PERFORMS ARITHMETIC.
- Output MUST be valid JSON conforming strictly to the requested response schema.
- The supplied GROUNDED FACTS in USER CONTEXT are authoritative and final.
- Cite ONLY provided computed numbers (current weight, targets, intake averages, precomputed protein range). Never invent estimates or perform arithmetic.
- If missing data is flagged in `missing_data_flags` (e.g. no weigh-ins, no meal logs), you MUST acknowledge the missing data honestly and set data_quality to 'sparse' or 'minimal'.
- Distinguish known user facts (observations) from actionable suggestions (recommendations). Recommendations are advisory only and non-binding.
- Refer to ACTIVE USER MEMORIES and RECENT CONVERSATION HISTORY in USER CONTEXT for coaching continuity.
- NUTRITION AVERAGES SEMANTICS:
  * Figures like avg_daily_calories_on_logged_days apply STRICTLY to logged days. An unlogged day is NOT equivalent to zero food intake.
  * When nutrition data is sparse (fewer than 7 logged days), state clearly that the numbers represent averages ONLY for the logged days.
- Do not diagnose medical conditions or provide medical advice.
- Avoid extreme or hazardous dietary and fitness advice.

Required JSON Structure:
{
  "answer": "Concise natural-language coaching response directly addressing the user question",
  "observations": [
    {
      "category": "nutrition | workout | progress | goal | general",
      "text": "Fact derived strictly from user context or pre-calculated ground facts",
      "severity": "info | caution | important"
    }
  ],
  "recommendations": [
    {
      "category": "nutrition | workout | progress | goal | general",
      "title": "Short recommendation title",
      "action": "Specific actionable guidance step",
      "priority": "low | medium | high"
    }
  ],
  "warnings": [
    "Safety note or data quality limitation warning string"
  ],
  "data_quality": "comprehensive | moderate | sparse | minimal"
}"""



class CoachService:
    @staticmethod
    def get_coach_response(db: Session, user: User, req: CoachChatRequest) -> CoachChatResponse:
        """
        Main entry point for handling Coach chat requests.
        Authenticates user via injected User model, fetches structured fitness context
        via ContextBuilder, constructs LLM messages, calls AIClient for structured JSON,
        validates output against CoachChatResponse schema, persists user & assistant messages,
        and maps AI errors to HTTP status codes.
        """
        # Safely extract and store preference memories if stated
        try:
            AIMemoryService.extract_and_save_preferences(db, user, req.message)
        except Exception as mem_err:
            logger.warning("Failed preference memory extraction: %s", mem_err)

        fitness_context = ContextBuilder.build_fitness_context(db, user)
        context_json_str = fitness_context.model_dump_json(exclude_none=True, indent=2)

        user_content_payload = (
            f"USER CONTEXT:\n{context_json_str}\n\n"
            f"USER QUESTION:\n{req.message}"
        )

        messages = [
            LLMMessage(role="system", content=SYSTEM_PROMPT),
            LLMMessage(role="user", content=user_content_payload),
        ]

        llm_request = LLMCompletionRequest(
            messages=messages,
            response_mime_type="application/json",
        )

        try:
            llm_response = ai_client.generate(llm_request)

            # Strict validation: Parse JSON and validate against CoachChatResponse schema
            try:
                raw_json = json.loads(llm_response.content)
                parsed_response = CoachChatResponse.model_validate(raw_json)

                # Persist user message & validated assistant response atomically upon success
                user_msg = ChatMessage(
                    user_id=user.id,
                    role="user",
                    content=req.message,
                )
                assistant_msg = ChatMessage(
                    user_id=user.id,
                    role="assistant",
                    content=parsed_response.answer,
                    response_json=parsed_response.model_dump(mode="json"),
                )
                db.add_all([user_msg, assistant_msg])
                db.commit()

                return parsed_response
            except (json.JSONDecodeError, Exception) as parse_err:
                logger.error("Failed to parse structured AI response JSON: %s. Raw: %r", parse_err, llm_response.content)
                raise AIResponseError("AI service returned an invalid structured response format.") from parse_err

        except (AIMissingAPIKeyError, AIAuthenticationError) as e:
            logger.error("AI service configuration/auth error: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI service configuration error.",
            ) from e
        except AIRateLimitError as e:
            logger.warning("AI rate limit / quota exceeded: %s", e)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI service rate limit or free-tier quota exceeded. Please try again later.",
            ) from e
        except AITimeoutError as e:
            logger.warning("AI request timed out: %s", e)
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="AI service request timed out. Please try again.",
            ) from e
        except AIProviderUnavailableError as e:
            logger.error("AI provider unavailable: %s", e)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service is currently unavailable. Please try again later.",
            ) from e
        except AIResponseError as e:
            logger.error("AI response invalid/empty: %s", e)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI service returned an invalid or empty response.",
            ) from e
        except AIException as e:
            logger.error("General AI exception: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while communicating with the AI service.",
            ) from e

    @staticmethod
    def get_chat_history(db: Session, user: User, limit: int = 50) -> List[ChatMessageResponse]:
        """
        Retrieves chronological chat message history for the current user.
        Excludes other users' chat messages for strict isolation.
        """
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == user.id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
            .all()
        )

        history_responses: List[ChatMessageResponse] = []
        for msg in messages:
            parsed_resp = None
            if msg.response_json and isinstance(msg.response_json, dict):
                try:
                    parsed_resp = CoachChatResponse.model_validate(msg.response_json)
                except Exception as val_err:
                    logger.warning("Could not validate persisted response_json for msg %s: %s", msg.id, val_err)

            history_responses.append(
                ChatMessageResponse(
                    id=msg.id,
                    user_id=msg.user_id,
                    role=msg.role,
                    content=msg.content,
                    response=parsed_resp,
                    created_at=msg.created_at,
                )
            )

        return history_responses

    @staticmethod
    def clear_chat_history(db: Session, user: User) -> int:
        """
        Deletes all chat messages for the current user.
        Strict user isolation enforced (only messages where user_id == user.id are deleted).
        """
        deleted_count = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == user.id)
            .delete(synchronize_session=False)
        )
        db.commit()
        return deleted_count


