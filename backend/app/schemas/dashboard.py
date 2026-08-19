from datetime import date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class DashboardGoalSection(BaseModel):
    goal_type: str
    target_weight_kg: Optional[float] = None
    target_date: Optional[str] = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class DashboardWorkoutPlanSection(BaseModel):
    id: str
    name: str
    days_per_week: int
    exercise_count: int

    model_config = ConfigDict(from_attributes=True)


class DashboardTodayNutritionSection(BaseModel):
    consumed_calories: float
    target_calories: float
    remaining_calories: float
    consumed_protein_g: float
    target_protein_g: float
    remaining_protein_g: float

    model_config = ConfigDict(from_attributes=True)


class DashboardWeeklySummarySection(BaseModel):
    adherence_score: Optional[float] = None
    adherence_label: str
    workouts_completed: int
    target_workouts: int
    workout_completion_pct: Optional[float] = None
    nutrition_logged_days: int
    total_days: int = 7
    current_fitness_score: Optional[int] = None
    starting_fitness_score: Optional[int] = None
    fitness_score_change: Optional[int] = None
    fitness_score_trend: str
    weight_change_kg: Optional[float] = None
    has_weekly_data: bool

    model_config = ConfigDict(from_attributes=True)


class DashboardSummaryResponse(BaseModel):
    full_name: str
    email: str
    onboarding_complete: bool
    tdee_calories: int
    bmr_calories: int
    target_calories: int
    target_protein_g: int
    goal: Optional[DashboardGoalSection] = None
    workout_plan: Optional[DashboardWorkoutPlanSection] = None
    today_nutrition: DashboardTodayNutritionSection
    weekly_summary: DashboardWeeklySummarySection

    model_config = ConfigDict(from_attributes=True)
