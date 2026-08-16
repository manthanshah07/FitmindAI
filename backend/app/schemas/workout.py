from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# ----------------------------------------------------
# Exercise Schemas
# ----------------------------------------------------

class ExerciseBase(BaseModel):
    name: str = Field(..., max_length=100)
    primary_muscle: str = Field(..., max_length=50)
    secondary_muscles: Optional[List[str]] = None
    equipment_required: Optional[List[str]] = None
    difficulty: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    instructions: Optional[str] = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseResponse(ExerciseBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Workout Plan Schemas
# ----------------------------------------------------

class WorkoutPlanExerciseCreate(BaseModel):
    exercise_id: UUID
    day_of_week: Optional[int] = Field(None, ge=1, le=7)
    sets: Optional[int] = Field(3, ge=1, le=20)
    reps: Optional[str] = Field("8-12", max_length=20)
    rest_seconds: Optional[int] = Field(60, ge=0, le=600)
    notes: Optional[str] = None
    order_index: Optional[int] = 0


class WorkoutPlanExerciseResponse(BaseModel):
    id: UUID
    plan_id: UUID
    exercise_id: UUID
    day_of_week: Optional[int] = None
    sets: Optional[int] = None
    reps: Optional[str] = None
    rest_seconds: Optional[int] = None
    notes: Optional[str] = None
    order_index: Optional[int] = None
    exercise: Optional[ExerciseResponse] = None

    model_config = ConfigDict(from_attributes=True)


class WorkoutPlanCreate(BaseModel):
    name: str = Field("Personalized Workout Plan", max_length=100)
    days_per_week: Optional[int] = Field(4, ge=1, le=7)
    exercises: Optional[List[WorkoutPlanExerciseCreate]] = None


class WorkoutPlanResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    days_per_week: Optional[int] = None
    is_active: bool
    ai_generated: bool
    created_at: datetime
    plan_exercises: List[WorkoutPlanExerciseResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Workout Session Log Schemas
# ----------------------------------------------------

class WorkoutLogExerciseCreate(BaseModel):
    exercise_id: UUID
    set_number: int = Field(..., ge=1, le=20)
    reps_completed: Optional[int] = Field(None, ge=0, le=200)
    weight_kg: Optional[float] = Field(None, ge=0.0, le=1000.0)
    rpe: Optional[int] = Field(None, ge=1, le=10)
    notes: Optional[str] = None


class WorkoutLogExerciseResponse(BaseModel):
    id: UUID
    log_id: UUID
    exercise_id: UUID
    set_number: int
    reps_completed: Optional[int] = None
    weight_kg: Optional[float] = None
    rpe: Optional[int] = None
    notes: Optional[str] = None
    exercise: Optional[ExerciseResponse] = None

    model_config = ConfigDict(from_attributes=True)


class WorkoutLogCreate(BaseModel):
    plan_id: Optional[UUID] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None
    logged_exercises: List[WorkoutLogExerciseCreate]


class WorkoutLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    plan_id: Optional[UUID] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    logged_exercises: List[WorkoutLogExerciseResponse] = []

    model_config = ConfigDict(from_attributes=True)
