"""
Goal Feasibility Service for FitMind AI Intelligence Engine.
Evaluates active user goal feasibility deterministically by comparing
required rate of weight change against the 28-day projected trajectory.
Includes configurable product safety heuristic alerts without clinical truth claims.
"""

from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.goal import Goal
from app.core.timezone_utils import extract_date
from app.services.intelligence.prediction_service import PredictionService
from app.schemas.intelligence import (
    GoalFeasibilityResponse,
    TrajectoryProjectionResponse,
)


class ProductPacingGuardrails:
    """
    Configurable product pacing guardrails and heuristic thresholds.
    These are product-level pacing heuristics, NOT universal medical limits or clinical prescriptions.
    """
    MAX_RECOMMENDED_LOSS_RATE_KG_WEEK: float = 1.0  # Product pacing guardrail
    MAX_RECOMMENDED_GAIN_RATE_KG_WEEK: float = 0.5  # Product pacing guardrail
    TOLERANCE_ON_TRACK_KG_WEEK: float = 0.15        # Heuristic tolerance within ±0.15 kg/week considered on track
    TOLERANCE_POSSIBLE_ADJ_KG_WEEK: float = 0.35    # Heuristic tolerance up to ±0.35 kg/week considered possible adjustment

FeasibilitySafetyPolicy = ProductPacingGuardrails  # Backward compatibility alias


class FeasibilityService:
    """
    Evaluates whether the user's active goal is realistically aligned
    with their model-projected 28-day trajectory.
    """

    @classmethod
    def evaluate_goal(
        cls,
        db: Session,
        user: User,
        reference_date: Optional[date] = None,
    ) -> GoalFeasibilityResponse:
        """
        Evaluates current goal feasibility for the authenticated user.
        """
        # 1. Fetch active goal
        active_goal = (
            db.query(Goal)
            .filter(Goal.user_id == user.id, Goal.is_active.is_(True))
            .first()
        )

        if not active_goal or not active_goal.target_weight_kg or not active_goal.target_date:
            return GoalFeasibilityResponse(
                status="INSUFFICIENT_DATA",
                safety_assessment="No active goal with target weight and target date is configured.",
                explanation=(
                    "To assess feasibility, please configure an active goal specifying "
                    "both a target weight and an target completion date."
                ),
            )

        # 2. Determine reference date
        if reference_date is None:
            user_tz = user.profile.timezone if user.profile and user.profile.timezone else "UTC"
            reference_date = extract_date(datetime.now(timezone.utc), user_tz) or date.today()

        target_date = active_goal.target_date
        days_remaining = (target_date - reference_date).days

        if days_remaining <= 0:
            return GoalFeasibilityResponse(
                status="EXPIRED_OR_INVALID",
                current_weight_kg=None,
                target_weight_kg=float(active_goal.target_weight_kg),
                target_date=target_date.isoformat(),
                days_remaining=days_remaining,
                safety_assessment="Goal target date has already passed.",
                explanation="The deadline for this goal has passed. Please update the target date to evaluate feasibility.",
            )

        # 3. Obtain 28-day model projection
        projection: TrajectoryProjectionResponse = PredictionService.predict_user_trajectory(
            db=db, user=user, reference_date=reference_date
        )

        current_weight = projection.baseline_weight_kg
        target_weight = float(active_goal.target_weight_kg)
        required_change = round(target_weight - current_weight, 2)
        weeks_remaining = max(days_remaining / 7.0, 0.5)
        required_rate = round(required_change / weeks_remaining, 3)

        # Model projected weekly rate (28 days / 4 weeks)
        projected_rate = round(projection.predicted_change_28d_kg / 4.0, 3)
        rate_diff = abs(projected_rate - required_rate)

        # 4. Status Determination
        # Check direction alignment
        same_direction = (
            (required_rate < 0 and projected_rate < 0)
            or (required_rate > 0 and projected_rate > 0)
            or (abs(required_rate) < 0.05 and abs(projected_rate) < 0.05)
        )

        if same_direction and rate_diff <= FeasibilitySafetyPolicy.TOLERANCE_ON_TRACK_KG_WEEK:
            status = "ON_TRACK"
            explanation = (
                f"Your current projected rate of {projected_rate:+.2f} kg/week closely matches "
                f"the required rate of {required_rate:+.2f} kg/week to reach {target_weight:.1f} kg "
                f"by {target_date.isoformat()}."
            )
        elif same_direction and rate_diff <= FeasibilitySafetyPolicy.TOLERANCE_POSSIBLE_ADJ_KG_WEEK:
            status = "POSSIBLE_ADJUSTMENT"
            explanation = (
                f"Your projected rate of {projected_rate:+.2f} kg/week trends toward your goal, "
                f"but differs by {rate_diff:.2f} kg/week from the required rate ({required_rate:+.2f} kg/week). "
                "A modest adjustment in nutrition or activity could help bridge this gap."
            )
        else:
            status = "UNLIKELY"
            explanation = (
                f"Your projected rate of {projected_rate:+.2f} kg/week significantly diverges from "
                f"the required pace ({required_rate:+.2f} kg/week). Reaching {target_weight:.1f} kg "
                f"by {target_date.isoformat()} would require substantial plan modifications or extending the timeline."
            )

        # 5. Product Pacing Guardrail Assessment
        if required_rate < -ProductPacingGuardrails.MAX_RECOMMENDED_LOSS_RATE_KG_WEEK:
            safety_assessment = (
                f"Product Pacing Guardrail: Required rate of {required_rate:+.2f} kg/week exceeds "
                f"the configured product pacing threshold (loss > {ProductPacingGuardrails.MAX_RECOMMENDED_LOSS_RATE_KG_WEEK} kg/week). "
                "This heuristic is a configured product constraint for sustainable pacing, not a clinical prescription."
            )
        elif required_rate > ProductPacingGuardrails.MAX_RECOMMENDED_GAIN_RATE_KG_WEEK:
            safety_assessment = (
                f"Product Pacing Guardrail: Required rate of {required_rate:+.2f} kg/week exceeds "
                f"the configured product pacing threshold (> {ProductPacingGuardrails.MAX_RECOMMENDED_GAIN_RATE_KG_WEEK} kg/week). "
                "This heuristic is a configured product constraint for sustainable pacing, not a clinical prescription."
            )
        else:
            safety_assessment = (
                "Configured product pacing guardrail: Required rate is within typical sustainable pacing bounds."
            )

        return GoalFeasibilityResponse(
            status=status,
            current_weight_kg=current_weight,
            target_weight_kg=target_weight,
            target_date=target_date.isoformat(),
            days_remaining=days_remaining,
            required_total_change_kg=required_change,
            required_rate_kg_per_week=required_rate,
            projected_rate_kg_per_week=projected_rate,
            projected_change_28d_kg=projection.predicted_change_28d_kg,
            safety_assessment=safety_assessment,
            explanation=explanation,
        )
