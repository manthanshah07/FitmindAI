from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.fitness_score import FitnessScoreResponse, FitnessScoreItem
from app.services.fitness_score_service import FitnessScoreService

router = APIRouter()


@router.get("/fitness-score", response_model=FitnessScoreResponse)
def get_fitness_score(
    target_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FitnessScoreResponse:
    """Get current and historical 0-100 fitness score breakdown."""
    return FitnessScoreService.get_fitness_score_summary(db, current_user, target_date=target_date)


@router.post("/fitness-score/recalculate", response_model=FitnessScoreItem)
def recalculate_fitness_score(
    target_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FitnessScoreItem:
    """Recalculate and persist fitness score for 7-day evaluation window."""
    return FitnessScoreService.calculate_and_save_fitness_score(db, current_user, target_date=target_date)
