import logging
from typing import Optional, List
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.core.config import settings
from app.core.ai_exceptions import (
    AIException,
    AIMissingAPIKeyError,
    AIAuthenticationError,
    AITimeoutError,
    AIRateLimitError,
    AIProviderUnavailableError,
    AIResponseError,
)
from app.schemas.ai import LLMCompletionRequest, LLMCompletionResponse

logger = logging.getLogger(__name__)


class AIClient:
    """
    Provider-agnostic client abstraction backed by Google Gemini API (Developer API Free Tier).
    Handles client initialization, configuration, timeouts, SDK invocation,
    and provider exception normalization into application-level AI exceptions.
    
    Contains NO domain models, database logic, user context, or prompt templates.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ):
        self._api_key = api_key
        self._model = model
        self._timeout_seconds = timeout_seconds
        self._client: Optional[genai.Client] = None

    @property
    def api_key(self) -> Optional[str]:
        return self._api_key if self._api_key is not None else settings.GEMINI_API_KEY

    @property
    def model(self) -> str:
        return self._model if self._model is not None else settings.GEMINI_MODEL

    @property
    def timeout_seconds(self) -> float:
        return (
            self._timeout_seconds
            if self._timeout_seconds is not None
            else settings.GEMINI_TIMEOUT_SECONDS
        )

    def _get_client(self) -> genai.Client:
        """Lazily initialize and return the Google Gemini client instance."""
        effective_key = self.api_key
        if not effective_key or not effective_key.strip():
            raise AIMissingAPIKeyError("Gemini API key is missing or blank.")

        if self._client is None:
            # Configure HTTP timeout options if supported
            http_opts = (
                types.HttpOptions(timeout=int(self.timeout_seconds * 1000))
                if self.timeout_seconds
                else None
            )
            self._client = genai.Client(
                api_key=effective_key,
                http_options=http_opts,
            )
        return self._client

    def generate_completion(self, request: LLMCompletionRequest) -> LLMCompletionResponse:
        """
        Send a completion request to the Gemini provider SDK and return a normalized response schema.
        Normalizes provider-level errors into application-level AI exceptions.
        """
        client = self._get_client()
        target_model = request.model or self.model

        system_instructions: List[str] = []
        contents: List[types.Content] = []

        for msg in request.messages:
            if msg.role == "system":
                system_instructions.append(msg.content)
            elif msg.role in ("assistant", "model"):
                contents.append(
                    types.Content(
                        role="model",
                        parts=[types.Part.from_text(text=msg.content)],
                    )
                )
            else:  # user or other roles
                contents.append(
                    types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=msg.content)],
                    )
                )

        sys_instruct = "\n\n".join(system_instructions) if system_instructions else None

        config_kwargs = {}
        if sys_instruct:
            config_kwargs["system_instruction"] = sys_instruct
        if request.temperature is not None:
            config_kwargs["temperature"] = request.temperature
        if request.max_tokens is not None:
            config_kwargs["max_output_tokens"] = request.max_tokens

        config = types.GenerateContentConfig(**config_kwargs) if config_kwargs else None

        try:
            response = client.models.generate_content(
                model=target_model,
                contents=contents if contents else sys_instruct or "",
                config=config,
            )
        except APIError as e:
            logger.error("Gemini API error (code=%s): %s", getattr(e, "code", None), e)
            code = getattr(e, "code", None)
            err_msg = (str(e) + " " + str(getattr(e, "message", ""))).lower()

            if code in (401, 403) or "api_key" in err_msg or "invalid" in err_msg or "permission_denied" in err_msg:
                raise AIAuthenticationError("Gemini API authentication failed.") from e
            elif code == 429 or "resource_exhausted" in err_msg or "rate" in err_msg or "quota" in err_msg:
                raise AIRateLimitError("Gemini API rate limit or free tier quota exceeded.") from e
            elif code in (408, 504) or "timeout" in err_msg or "deadline" in err_msg:
                raise AITimeoutError("Gemini API request timed out.") from e
            else:
                raise AIProviderUnavailableError("Gemini API provider service is unavailable.") from e

        except TimeoutError as e:
            logger.error("Gemini timeout error: %s", e)
            raise AITimeoutError("Gemini API request timed out.") from e
        except Exception as e:
            logger.error("Unexpected error during Gemini completion: %s", e)
            err_str = str(e).lower()
            if "timeout" in err_str:
                raise AITimeoutError("Gemini API request timed out.") from e
            elif "quota" in err_str or "rate limit" in err_str or "429" in err_str:
                raise AIRateLimitError("Gemini API rate limit exceeded.") from e
            elif "auth" in err_str or "key" in err_str or "401" in err_str or "403" in err_str:
                raise AIAuthenticationError("Gemini API authentication failed.") from e
            raise AIException("Unexpected error during AI completion processing.") from e

        if not response:
            raise AIResponseError("Gemini API returned an empty response object.")

        content_text = getattr(response, "text", None)
        if content_text is None or not str(content_text).strip():
            raise AIResponseError("Gemini API returned a response with empty content.")

        # Extract usage metadata if available
        usage = getattr(response, "usage_metadata", None)
        prompt_tokens = getattr(usage, "prompt_token_count", None) if usage else None
        completion_tokens = getattr(usage, "candidates_token_count", None) if usage else None
        total_tokens = getattr(usage, "total_token_count", None) if usage else None

        # Extract finish reason if candidates present
        candidates = getattr(response, "candidates", None)
        finish_reason = None
        if candidates and len(candidates) > 0:
            raw_reason = getattr(candidates[0], "finish_reason", None)
            finish_reason = str(raw_reason) if raw_reason is not None else None

        return LLMCompletionResponse(
            content=str(content_text),
            model=target_model,
            finish_reason=finish_reason,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
        )

    def generate(self, request: LLMCompletionRequest) -> LLMCompletionResponse:
        """Alias for generate_completion to support provider-neutral interface."""
        return self.generate_completion(request)


ai_client = AIClient()
