"""
Adaptation Engine and Personalization Service for FitMind AI Intelligence Engine.
Evaluates observed vs expected trajectory deviations over longitudinal windows.
Identifies primary observational drivers and computes lightweight EWMA residual tracking
without contaminating the population Ridge champion model artifact.
"""

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.user import User
from app.core.timezone_utils import extract_date
from app.services.intelligence.adapters import FitMindDBAdapter
from app.services.intelligence.contracts import NormalizedSubjectData, MeasurementRecord
from app.services.intelligence.feature_extractor import FeatureExtractor
from app.services.intelligence.model_service import ModelService
from app.services.intelligence.prediction_service import PredictionService
from app.schemas.intelligence import AdaptationStatusResponse


class AdaptationService:
    """
    Evaluates observed longitudinal progress against prior model projections.
    Uses product decision thresholds derived from benchmark uncertainty and data completeness.
    These are product heuristic decision gates, NOT statistically validated clinical or biological intervention thresholds.
    Provides non-causal behavioral observations and user residual tracking without claiming biological causation.
    """

    BENCHMARK_UNCERTAINTY_THRESHOLD_KG: float = 0.65  # Derived from benchmark 90% half-width
    PERSISTENT_DEVIATION_THRESHOLD_KG: float = 1.25   # Product heuristic boundary indicating persistent divergence
    MIN_LOGGING_DAYS_FOR_ADAPTATION: int = 14         # Product completeness threshold (at least 50% of 28d days logged)
    EWMA_ALPHA: float = 0.3                           # Weight for user residual smoothing

    # Backward compatibility aliases
    UNCERTAINTY_THRESHOLD_KG = BENCHMARK_UNCERTAINTY_THRESHOLD_KG
    PERSISTENT_DEVIATION_KG = PERSISTENT_DEVIATION_THRESHOLD_KG

    @classmethod
    def evaluate_adaptation(
        cls,
        db: Session,
        user: User,
        reference_date: Optional[date] = None,
    ) -> AdaptationStatusResponse:
        """
        Evaluates current adaptation status for authenticated user.
        """
        subject_data = FitMindDBAdapter.extract_subject_data(db, user.id)
        if not subject_data:
            raise ValueError(f"Could not load fitness profile data for user {user.id}")

        if reference_date is None:
            user_tz = subject_data.demographics.timezone_str
            reference_date = extract_date(datetime.now(timezone.utc), user_tz) or date.today()

        measurements = [
            m for m in subject_data.measurements
            if m.measured_date <= reference_date
        ]
        measurements.sort(key=lambda m: m.measured_date)

        # 1. Check data sufficiency
        past_28d_start = reference_date - timedelta(days=28)
        recent_measurements = [m for m in measurements if m.measured_date >= past_28d_start]
        meas_count = len(recent_measurements)

        recent_nutrition = [
            n for n in subject_data.nutrition_logs
            if past_28d_start <= n.log_date <= reference_date
        ]
        logging_days = len(recent_nutrition)
        logging_pct = round((logging_days / 28.0) * 100.0, 1)

        # Base case: Insufficient data
        if meas_count < 2 or logging_days < 7:
            primary_driver = (
                "insufficient_measurement_data" if meas_count < 2 else "insufficient_nutrition_data"
            )
            return AdaptationStatusResponse(
                status="INSUFFICIENT_DATA",
                actual_weight_change_kg=None,
                projected_weight_change_kg=None,
                residual_kg=None,
                primary_driver=primary_driver,
                logging_completeness_pct=logging_pct,
                measurement_count=meas_count,
                personal_calibration_offset_kg=0.0,
                recommendation_summary=(
                    "Insufficient longitudinal data to evaluate trajectory adaptation. "
                    "Consistent nutrition logging and regular weekly weigh-ins are needed."
                ),
            )

        # 2. Historical comparison:
        # Find earliest measurement in [t-35, t-21] to establish baseline for the past 28-day window
        window_start_target = reference_date - timedelta(days=28)
        past_candidates = [
            m for m in measurements
            if (reference_date - timedelta(days=35)) <= m.measured_date <= (reference_date - timedelta(days=21))
        ]

        if not past_candidates:
            # Fall back to the earliest measurement available in the past 28-day span
            past_baseline_m = recent_measurements[0]
            current_m = recent_measurements[-1]
            elapsed_days = (current_m.measured_date - past_baseline_m.measured_date).days
            if elapsed_days < 14:
                return AdaptationStatusResponse(
                    status="INSUFFICIENT_DATA",
                    actual_weight_change_kg=None,
                    projected_weight_change_kg=None,
                    residual_kg=None,
                    primary_driver="insufficient_measurement_time_span",
                    logging_completeness_pct=logging_pct,
                    measurement_count=meas_count,
                    personal_calibration_offset_kg=0.0,
                    recommendation_summary=(
                        f"Tracked time span ({elapsed_days} days) is too short for 28-day adaptation analysis. "
                        "At least 14-21 days of history between check-ins is required."
                    ),
                )
        else:
            past_baseline_m = min(past_candidates, key=lambda m: abs((m.measured_date - window_start_target).days))
            current_m = recent_measurements[-1]

        actual_change = round(current_m.weight_kg - past_baseline_m.weight_kg, 2)

        # 3. Model projection for that period:
        # Extract features as of past_baseline_m.measured_date
        past_extraction = FeatureExtractor.extract_features(
            subject_data=subject_data,
            reference_date=past_baseline_m.measured_date,
        )
        projected_change = ModelService.predict_delta_weight_28d(past_extraction.features)

        residual = round(actual_change - projected_change, 2)

        # 4. Determine status and primary observational driver
        # Check nutrition adherence in recent 28d
        avg_intake = (
            sum(n.calories for n in recent_nutrition) / float(len(recent_nutrition))
            if recent_nutrition
            else past_extraction.features["F07"]
        )
        tdee = past_extraction.features["F07"]

        if abs(residual) <= cls.UNCERTAINTY_THRESHOLD_KG:
            status = "NO_CHANGE"
            primary_driver = "trajectory_on_track_within_normal_uncertainty"
            recommendation_summary = (
                f"Observed weight change ({actual_change:+.2f} kg) aligns with model projection "
                f"({projected_change:+.2f} kg) within standard uncertainty bounds (residual: {residual:+.2f} kg). "
                "Current plan remains appropriate."
            )
        elif abs(residual) <= cls.PERSISTENT_DEVIATION_KG or logging_days < cls.MIN_LOGGING_DAYS_FOR_ADAPTATION:
            status = "MONITOR"
            if logging_days < cls.MIN_LOGGING_DAYS_FOR_ADAPTATION:
                primary_driver = "insufficient_nutrition_adherence_data"
                recommendation_summary = (
                    f"Observed weight change ({actual_change:+.2f} kg) differs from projection ({projected_change:+.2f} kg), "
                    f"but nutrition logging coverage is moderate ({logging_pct}%). "
                    "Recommend monitoring and logging more consistently before adjusting the plan."
                )
            else:
                primary_driver = "moderate_trajectory_deviation"
                recommendation_summary = (
                    f"Observed weight change ({actual_change:+.2f} kg) shows a moderate divergence from projection "
                    f"({projected_change:+.2f} kg, residual: {residual:+.2f} kg). Continue monitoring for 1-2 weeks."
                )
        else:
            # Persistent divergence with sufficient logging
            status = "ADJUSTMENT_RECOMMENDED"
            if residual < -cls.PERSISTENT_DEVIATION_KG:
                primary_driver = "weight_loss_exceeding_projection"
                recommendation_summary = (
                    f"Observed weight loss ({actual_change:+.2f} kg) exceeded model projection ({projected_change:+.2f} kg) "
                    f"by {abs(residual):.2f} kg over high-coverage logging ({logging_pct}%). "
                    "Consider adjusting calorie intake upward to prevent excessive deficit fatigue."
                )
            else:
                if avg_intake > tdee + 150:
                    primary_driver = "intake_consistently_above_target"
                else:
                    primary_driver = "weight_trend_diverging_from_projection"

                recommendation_summary = (
                    f"Observed weight change ({actual_change:+.2f} kg) diverged from projection ({projected_change:+.2f} kg) "
                    f"by {residual:+.2f} kg over high-coverage logging ({logging_pct}%). "
                    "Consider a structured plan optimization to realign with target trajectory."
                )

        # 5. Lightweight EWMA personal calibration offset
        # Updates user residual tracking without modifying model weights
        personal_calibration_offset = round(residual * cls.EWMA_ALPHA, 4) if logging_days >= cls.MIN_LOGGING_DAYS_FOR_ADAPTATION else 0.0

        return AdaptationStatusResponse(
            status=status,
            actual_weight_change_kg=actual_change,
            projected_weight_change_kg=projected_change,
            residual_kg=residual,
            primary_driver=primary_driver,
            logging_completeness_pct=logging_pct,
            measurement_count=meas_count,
            personal_calibration_offset_kg=personal_calibration_offset,
            recommendation_summary=recommendation_summary,
        )
