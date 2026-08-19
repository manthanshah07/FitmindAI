from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pydantic import BaseModel, ConfigDict, Field, field_validator


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


def validate_iana_timezone(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    v_clean = v.strip()
    if not v_clean:
        return "UTC"
    try:
        ZoneInfo(v_clean)
        return v_clean
    except (ZoneInfoNotFoundError, ValueError, Exception):
        raise ValueError(f"Invalid IANA timezone identifier: '{v}'")


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
    timezone: str = "UTC"
    preferred_workout_duration_minutes: Optional[int] = 45
    target_workout_days_per_week: Optional[int] = 4
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
    timezone: Optional[str] = Field(None, max_length=50)
    preferred_workout_duration_minutes: Optional[int] = Field(None, ge=15, le=180)
    target_workout_days_per_week: Optional[int] = Field(None, ge=1, le=7)

    @field_validator("timezone")
    @classmethod
    def check_timezone(cls, v: Optional[str]) -> Optional[str]:
        return validate_iana_timezone(v)


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
    timezone: Optional[str] = Field(None, max_length=50)
    preferred_workout_duration_minutes: Optional[int] = Field(None, ge=15, le=180)
    target_workout_days_per_week: Optional[int] = Field(None, ge=1, le=7)

    @field_validator("timezone")
    @classmethod
    def check_timezone(cls, v: Optional[str]) -> Optional[str]:
        return validate_iana_timezone(v)
