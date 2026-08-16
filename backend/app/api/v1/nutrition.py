from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.nutrition import (
    MealLogCreate,
    MealLogResponse,
    DailyNutritionSummaryResponse,
)
from app.services.nutrition_service import NutritionService

router = APIRouter()


@router.get("/today", response_model=DailyNutritionSummaryResponse)
def get_today_nutrition_summary(
    target_date: Optional[date] = Query(None, description="Target date in YYYY-MM-DD format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyNutritionSummaryResponse:
    """Get daily nutrition summary for target_date (defaults to today)."""
    return NutritionService.get_today_summary(db, current_user, target_date=target_date)


@router.get("/logs", response_model=List[MealLogResponse])
def get_meal_logs(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[MealLogResponse]:
    """Get meal logging history for authenticated user (paginated)."""
    return NutritionService.get_meal_logs(db, current_user, limit=limit, skip=skip)


@router.post("/log", response_model=MealLogResponse, status_code=status.HTTP_201_CREATED)
def log_meal(
    req: MealLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MealLogResponse:
    """Log a meal session with food items and quantities in grams."""
    return NutritionService.log_meal(db, current_user, req)


@router.get("/logs/{log_id}", response_model=MealLogResponse)
def get_meal_log_by_id(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MealLogResponse:
    """Get specific meal log session details (User Isolated)."""
    log = NutritionService.get_meal_log_by_id(db, current_user, log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal log session not found"
        )
    return log
