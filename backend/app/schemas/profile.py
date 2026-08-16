from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class ActivityLevelEnum(str, Enum):
    SEDENTARY = "sedentary"
    LIGHT = "light"
    MODERATE = "moderate"
    VERY_ACTIVE = "very_active"
    EXTRA_ACTIVE = "extra_active"


class DietPreferenceEnum(str, Enum):
    OMNIVORE = "omnivore"
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    KETO = "keto"
    PALEO = "paleo"
    PESCATARIAN = "pescatarian"
    OTHER = "other"


class ProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_level: Optional[str] = None
    diet_preference: Optional[str] = None
    equipment: Optional[List[str]] = None
    medical_notes: Optional[str] = None
    onboarding_complete: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[GenderEnum] = None
    height_cm: Optional[float] = Field(None, ge=50.0, le=300.0)
    weight_kg: Optional[float] = Field(None, ge=30.0, le=300.0)
    activity_level: Optional[ActivityLevelEnum] = None
    diet_preference: Optional[DietPreferenceEnum] = None
    equipment: Optional[List[str]] = None
    medical_notes: Optional[str] = None


class OnboardingCreate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[GenderEnum] = None
    height_cm: Optional[float] = Field(None, ge=50.0, le=300.0)
    weight_kg: Optional[float] = Field(None, ge=30.0, le=300.0)
    activity_level: Optional[ActivityLevelEnum] = None
    diet_preference: Optional[DietPreferenceEnum] = None
    equipment: Optional[List[str]] = None
    medical_notes: Optional[str] = None
