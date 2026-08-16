from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.nutrition import FoodResponse
from app.services.food_service import FoodService

router = APIRouter()


@router.get("", response_model=List[FoodResponse])
def get_foods(
    search: Optional[str] = Query(None, description="Search food catalog by name"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[FoodResponse]:
    """Browse or search standardized food database catalog."""
    return FoodService.get_foods(db, search=search, limit=limit, skip=skip)


@router.post("/seed", response_model=List[FoodResponse], status_code=status.HTTP_201_CREATED)
def seed_foods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[FoodResponse]:
    """Seed baseline food database catalog (Idempotent)."""
    return FoodService.seed_default_foods(db)


@router.get("/{food_id}", response_model=FoodResponse)
def get_food_by_id(
    food_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FoodResponse:
    """Get specific food item details by UUID."""
    food = FoodService.get_food_by_id(db, food_id)
    if not food:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found"
        )
    return food
