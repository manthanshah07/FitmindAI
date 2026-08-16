from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class GoalTypeEnum(str, Enum):
    WEIGHT_LOSS = "weight_loss"
    MUSCLE_GAIN = "muscle_gain"
    MAINTAIN = "maintain"
    ENDURANCE = "endurance"
    GENERAL_FITNESS = "general_fitness"


class GoalCreate(BaseModel):
    goal_type: GoalTypeEnum
    target_weight_kg: Optional[float] = Field(None, ge=30.0, le=300.0)
    target_date: Optional[date] = None


class GoalResponse(BaseModel):
    id: UUID
    user_id: UUID
    goal_type: str
    target_weight_kg: Optional[float] = None
    target_date: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
