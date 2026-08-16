from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# ----------------------------------------------------
# Food Catalog Schemas
# ----------------------------------------------------

class FoodBase(BaseModel):
    name: str = Field(..., max_length=200)
    brand: Optional[str] = Field(None, max_length=100)
    calories_per_100g: float = Field(..., ge=0.0, le=2000.0)
    protein_per_100g: float = Field(..., ge=0.0, le=100.0)
    carbs_per_100g: float = Field(..., ge=0.0, le=100.0)
    fat_per_100g: float = Field(..., ge=0.0, le=100.0)
    fiber_per_100g: Optional[float] = Field(None, ge=0.0, le=100.0)
    is_verified: bool = True


class FoodCreate(FoodBase):
    pass


class FoodResponse(FoodBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Meal Log Schemas
# ----------------------------------------------------

class MealLogItemCreate(BaseModel):
    food_id: UUID
    quantity_grams: float = Field(..., ge=1.0, le=5000.0)


class MealLogItemResponse(BaseModel):
    id: UUID
    meal_log_id: UUID
    food_id: UUID
    quantity_grams: float
    calculated_calories: float
    calculated_protein: float
    calculated_carbs: float
    calculated_fat: float
    food: Optional[FoodResponse] = None

    model_config = ConfigDict(from_attributes=True)


class MealLogCreate(BaseModel):
    meal_type: str = Field(..., pattern="^(breakfast|lunch|dinner|snack)$")
    logged_at: datetime
    notes: Optional[str] = Field(None, max_length=2000)
    items: List[MealLogItemCreate] = Field(..., min_length=1)


class MealLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    meal_type: str
    logged_at: datetime
    notes: Optional[str] = None
    created_at: datetime
    items: List[MealLogItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Daily Nutrition Summary Schemas
# ----------------------------------------------------

class MacroNutrients(BaseModel):
    calories: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0


class DailyNutritionSummaryResponse(BaseModel):
    date: str
    targets: MacroNutrients
    consumed: MacroNutrients
    remaining: MacroNutrients
    meals_by_type: dict[str, List[MealLogResponse]]
