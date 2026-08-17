from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.coach import CoachChatRequest, CoachChatResponse
from app.services.coach_service import CoachService

router = APIRouter()


@router.post("/chat", response_model=CoachChatResponse, status_code=status.HTTP_200_OK)
def chat_with_coach(
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
