from typing import Optional
from pydantic import BaseModel, Field


class WeightTrendAnalytics(BaseModel):
    latest_weight_kg: Optional[float] = None
    previous_weight_kg: Optional[float] = None
    change_kg: Optional[float] = None
    pct_change: Optional[float] = None
    sample_count: int = 0
    timeframe_days: int = 90
    trend_direction: str = "insufficient_data"  # 'losing', 'gaining', 'maintaining', 'insufficient_data'


class GoalProgressAnalytics(BaseModel):
    primary_goal: Optional[str] = None
    start_weight_kg: Optional[float] = None
    is_baseline_inferred: bool = False
    current_weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    progress_pct: Optional[float] = None
    remaining_weight_kg: Optional[float] = None
    is_target_met: bool = False
    status: str = "insufficient_data"  # 'on_track', 'target_met', 'no_active_goal', 'insufficient_data'


class WorkoutAnalytics(BaseModel):
    total_sessions_30d: int = 0
    weekly_avg_sessions: float = 0.0
    target_days_per_week: Optional[int] = None
    adherence_pct: Optional[float] = None
    consistency_status: str = "insufficient_data"  # 'consistent', 'irregular', 'inactive', 'insufficient_data'


class NutritionTrendAnalytics(BaseModel):
    days_logged_7d: int = 0
    days_unlogged_7d: int = 7
    logging_completeness_pct: float = 0.0
    avg_daily_calories: Optional[float] = None  # Calculated strictly across logged days!
    avg_daily_protein_g: Optional[float] = None  # Calculated strictly across logged days!
    target_calories: Optional[float] = None
    target_protein_g: Optional[float] = None
    calorie_adherence_pct: Optional[float] = None
    protein_adherence_pct: Optional[float] = None


class MeasurementTrendAnalytics(BaseModel):
    timeframe_days: int = 90
    sample_count: int = 0
    waist_change_cm: Optional[float] = None
    chest_change_cm: Optional[float] = None
    bicep_change_cm: Optional[float] = None
    thigh_change_cm: Optional[float] = None
    hips_change_cm: Optional[float] = None
    body_fat_change_pct: Optional[float] = None
    has_sufficient_data: bool = False


class ScoreTrendAnalytics(BaseModel):
    current_score: Optional[int] = None
    previous_score: Optional[int] = None
    score_change: Optional[int] = None
    trend_label: str = "insufficient_data"  # 'improving', 'declining', 'stable', 'insufficient_data'


class DataCompletenessAnalytics(BaseModel):
    has_profile: bool = False
    has_active_goal: bool = False
    workout_sessions_30d: int = 0
    nutrition_days_logged_7d: int = 0
    measurement_count_90d: int = 0
    has_fitness_score: bool = False
    overall_quality: str = "minimal"  # 'comprehensive', 'moderate', 'sparse', 'minimal'


class FitnessAnalytics(BaseModel):
    weight_trend: WeightTrendAnalytics = Field(default_factory=WeightTrendAnalytics)
    goal_progress: GoalProgressAnalytics = Field(default_factory=GoalProgressAnalytics)
    workout_analytics: WorkoutAnalytics = Field(default_factory=WorkoutAnalytics)
    nutrition_trends: NutritionTrendAnalytics = Field(default_factory=NutritionTrendAnalytics)
    measurement_trends: MeasurementTrendAnalytics = Field(default_factory=MeasurementTrendAnalytics)
    score_trend: ScoreTrendAnalytics = Field(default_factory=ScoreTrendAnalytics)
    data_completeness: DataCompletenessAnalytics = Field(default_factory=DataCompletenessAnalytics)
