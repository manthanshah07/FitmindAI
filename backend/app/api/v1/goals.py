from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalResponse
from app.services.goal_service import GoalService

router = APIRouter()


@router.get("", response_model=Optional[GoalResponse])
def get_active_goal(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Optional[GoalResponse]:
    """Get active goal for current user."""
    return GoalService.get_active_goal(db, current_user)


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_goal(
    req: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalResponse:
    """Create or update primary active goal."""
    return GoalService.create_or_update_goal(db, current_user, req)
