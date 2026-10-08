"""
Pydantic API schemas for FitMind AI Intelligence Engine (Phase 2E).
Enforces benchmark uncertainty labeling, deterministic model versioning,
and non-causal reporting.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ConfidenceInterval(BaseModel):
    """Benchmark-derived prediction uncertainty."""
    lower_bound_kg: float
    upper_bound_kg: float
    half_width_kg: float
    confidence_level_pct: float = 90.0
    uncertainty_type: str = "benchmark_residual"
    disclaimer: str = (
        "Derived from a controlled physiological benchmark generated from the Kevin Hall energy-balance model "
        "(benchmark residual sigma ≈ 0.3928 kg). This represents benchmark-derived model uncertainty, "
        "not personalized clinical certainty, patient-specific confidence, or a guaranteed prediction range."
    )


class DataConfidence(BaseModel):
    """Deterministic qualitative data confidence assessment."""
    level: str = Field(description="HIGH | MEDIUM | LOW")
    nutrition_days_logged: int
    measurement_count: int
    reasons: List[str]


class TrajectoryProjectionResponse(BaseModel):
    """Point-in-time 28-day body-weight change projection."""
    baseline_weight_kg: float
    predicted_change_28d_kg: float
    projected_weight_28d_kg: float
    confidence_interval: ConfidenceInterval
    data_confidence: DataConfidence
    features_used: Dict[str, float]
    reference_date: str
    model_name: str
    model_version: str
    feature_schema_version: str = "2.4.0-canonical-16"
    projection_disclaimer: str = (
        "Model-based scenario projection over a 28-day trajectory. "
        "Validated against a controlled physiological benchmark generated from the Kevin Hall energy-balance model; "
        "has not undergone clinical or large-scale empirical validation on real-world FitMind users. "
        "Does not constitute medical diagnosis, clinical prescription, or guaranteed physiological outcome."
    )


class GoalFeasibilityResponse(BaseModel):
    """Deterministic assessment of active user goal feasibility against projected trajectory."""
    status: str = Field(
        description="ON_TRACK | POSSIBLE_ADJUSTMENT | UNLIKELY | INSUFFICIENT_DATA | EXPIRED_OR_INVALID"
    )
    current_weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    target_date: Optional[str] = None
    days_remaining: Optional[int] = None
    required_total_change_kg: Optional[float] = None
    required_rate_kg_per_week: Optional[float] = None
    projected_rate_kg_per_week: Optional[float] = None
    projected_change_28d_kg: Optional[float] = None
    safety_assessment: str = Field(
        description="Product pacing guardrail assessment (configured product constraint, not clinical advice)"
    )
    explanation: str


class ScenarioModification(BaseModel):
    """Hypothetical controllable input modifications for What-If simulation."""
    scenario_name: str
    daily_calories: Optional[float] = Field(None, ge=800, le=7000)
    daily_protein_g: Optional[float] = Field(None, ge=20, le=400)
    activity_multiplier: Optional[float] = Field(None, ge=1.2, le=2.0)


class ScenarioSimulationRequest(BaseModel):
    """Request payload containing one or more hypothetical scenarios."""
    scenarios: List[ScenarioModification] = Field(min_length=1, max_length=10)


class ScenarioResult(BaseModel):
    """Projected outcome for a single What-If scenario."""
    scenario_name: str
    input_modifications: Dict[str, Any]
    projected_change_28d_kg: float
    projected_weight_28d_kg: float
    scenario_delta_kg: float
    non_causal_statement: str


class ScenarioSimulationResponse(BaseModel):
    """Comparison table of baseline vs hypothetical scenario projections."""
    baseline_projection: TrajectoryProjectionResponse
    scenario_results: List[ScenarioResult]


class PlanCandidate(BaseModel):
    """A ranked candidate plan under FitMind's deterministic candidate-ranking heuristic."""
    candidate_id: str
    daily_calories: float
    daily_protein_g: float
    activity_multiplier: float
    projected_change_28d_kg: float
    projected_weight_28d_kg: float
    objective_score: float
    calorie_offset_from_current: float
    feasibility_rating: str


class PlanOptimizationRequest(BaseModel):
    """Configurable boundaries for candidate plan ranking heuristic."""
    max_calorie_adjustment: Optional[float] = Field(400.0, ge=100.0, le=800.0)
    prefer_higher_protein: Optional[bool] = True


class PlanOptimizationResponse(BaseModel):
    """Candidate plan ranking results under FitMind's deterministic ranking heuristic."""
    target_weight_kg: float
    target_date: str
    required_weekly_rate_kg: float
    current_intake_kcal: float
    best_candidate: PlanCandidate
    alternative_candidates: List[PlanCandidate]
    objective_description: str


class AdaptationStatusResponse(BaseModel):
    """V1 adaptive engine trajectory evaluation using product decision thresholds."""
    status: str = Field(description="NO_CHANGE | MONITOR | ADJUSTMENT_RECOMMENDED | INSUFFICIENT_DATA")
    actual_weight_change_kg: Optional[float] = None
    projected_weight_change_kg: Optional[float] = None
    residual_kg: Optional[float] = None
    primary_driver: str
    logging_completeness_pct: float
    measurement_count: int
    personal_calibration_offset_kg: float
    recommendation_summary: str
