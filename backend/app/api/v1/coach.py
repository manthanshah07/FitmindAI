from typing import List
from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.coach import CoachChatRequest, CoachChatResponse
from app.schemas.chat_message import ChatMessageResponse
from app.services.coach_service import CoachService

router = APIRouter()


@router.post("/chat", response_model=CoachChatResponse, status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_COACH)
def chat_with_coach(
    request: Request,
    req: CoachChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CoachChatResponse:
    """
    Authenticated endpoint for sending a message to the AI Coach.
    Uses JWT authentication to identify user, retrieves minimal trusted profile/goal context,
    and returns a natural language response from the AI engine.
    """
    return CoachService.get_coach_response(db, current_user, req)


@router.get("/history", response_model=List[ChatMessageResponse], status_code=status.HTTP_200_OK)
def get_chat_history(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ChatMessageResponse]:
    """
    Authenticated endpoint for retrieving conversation history for the current user.
    """
    return CoachService.get_chat_history(db, current_user, limit=limit)
