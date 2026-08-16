from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.workout import ExerciseResponse
from app.services.exercise_service import ExerciseService

router = APIRouter()


@router.get("", response_model=List[ExerciseResponse])
def get_exercises(
    muscle: Optional[str] = Query(None, description="Filter by primary muscle group"),
    category: Optional[str] = Query(None, description="Filter by category"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    search: Optional[str] = Query(None, description="Search exercise by name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ExerciseResponse]:
    """Browse exercise database catalog."""
    return ExerciseService.get_exercises(
        db, muscle=muscle, category=category, difficulty=difficulty, search=search
    )


@router.post("/seed", response_model=List[ExerciseResponse], status_code=status.HTTP_201_CREATED)
def seed_exercises(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ExerciseResponse]:
    """Seed baseline exercise catalog."""
    return ExerciseService.seed_default_exercises(db)


@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise_by_id(
    exercise_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExerciseResponse:
    """Get specific exercise details by ID."""
    exercise = ExerciseService.get_exercise_by_id(db, exercise_id)
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found"
        )
    return exercise
