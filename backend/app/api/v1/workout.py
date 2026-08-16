from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.workout import (
    WorkoutPlanCreate,
    WorkoutPlanResponse,
    WorkoutLogCreate,
    WorkoutLogResponse,
)
from app.services.workout_service import WorkoutService

router = APIRouter()


@router.get("/plan", response_model=Optional[WorkoutPlanResponse])
def get_active_workout_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Optional[WorkoutPlanResponse]:
    """Get active workout plan for current user."""
    return WorkoutService.get_active_plan(db, current_user)


@router.post("/plan", response_model=WorkoutPlanResponse, status_code=status.HTTP_201_CREATED)
def create_or_generate_workout_plan(
    req: Optional[WorkoutPlanCreate] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkoutPlanResponse:
    """Create or generate a personalized workout plan matching user goal and equipment."""
    return WorkoutService.generate_workout_plan(db, current_user, req)


@router.get("/logs", response_model=List[WorkoutLogResponse])
def get_workout_logs(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[WorkoutLogResponse]:
    """Get workout log execution history for current user."""
    return WorkoutService.get_workout_logs(db, current_user, limit=limit, skip=skip)


@router.post("/logs", response_model=WorkoutLogResponse, status_code=status.HTTP_201_CREATED)
def log_workout_session(
    req: WorkoutLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkoutLogResponse:
    """Log a completed workout session with sets, reps, weight_kg, and RPE."""
    return WorkoutService.log_workout_session(db, current_user, req)


@router.get("/logs/{log_id}", response_model=WorkoutLogResponse)
def get_workout_log_by_id(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkoutLogResponse:
    """Get specific workout log session details."""
    log = WorkoutService.get_workout_log_by_id(db, current_user, log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Workout log session not found"
        )
    return log
