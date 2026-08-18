from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class ProfileContext(BaseModel):
    full_name: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_level: Optional[str] = None
    diet_preference: Optional[str] = None
    equipment: Optional[List[str]] = None
    # NOTE: medical_notes is explicitly EXCLUDED for privacy!


class GoalContext(BaseModel):
    primary_goal: str
    target_weight_kg: Optional[float] = None
    target_date: Optional[date] = None


class ExerciseSetContext(BaseModel):
    set_number: int
    reps_completed: Optional[int] = None
    weight_kg: Optional[float] = None
    rpe: Optional[int] = None


class LoggedExerciseContext(BaseModel):
    exercise_name: str
    sets: List[ExerciseSetContext] = Field(default_factory=list)


class WorkoutLogContext(BaseModel):
    date: str  # ISO date string YYYY-MM-DD
    plan_name: Optional[str] = None
    exercises: List[LoggedExerciseContext] = Field(default_factory=list)
    # NOTE: notes are explicitly EXCLUDED for privacy!


class DailyNutritionContext(BaseModel):
    date: str  # ISO date string YYYY-MM-DD
    calories_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float


class MeasurementContext(BaseModel):
    date: str  # ISO date string YYYY-MM-DD
    weight_kg: Optional[float] = None
    chest_cm: Optional[float] = None
    waist_cm: Optional[float] = None
    hips_cm: Optional[float] = None
    bicep_cm: Optional[float] = None
    thigh_cm: Optional[float] = None
    body_fat_pct: Optional[float] = None


class FitnessScoreComponentContext(BaseModel):
    score: int
    score_label: str
    workout_adherence_pct: Optional[float] = None
    nutrition_score: Optional[float] = None
    protein_score: Optional[float] = None
    consistency_score: Optional[float] = None


class FitnessContext(BaseModel):
    profile: Optional[ProfileContext] = None
    active_goal: Optional[GoalContext] = None
    recent_workouts: List[WorkoutLogContext] = Field(default_factory=list)
    recent_nutrition: List[DailyNutritionContext] = Field(default_factory=list)
    recent_measurements: List[MeasurementContext] = Field(default_factory=list)
    fitness_score: Optional[FitnessScoreComponentContext] = None
