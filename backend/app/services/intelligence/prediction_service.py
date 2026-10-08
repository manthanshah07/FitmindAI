"""
Prediction Service for FitMind AI Intelligence Engine.
Computes projected 28-day weight trajectories using the Phase 2D champion Ridge model.
Provides benchmark-derived uncertainty intervals and deterministic data confidence classifications.
"""

from datetime import date, datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.profile import Profile
from app.core.timezone_utils import extract_date
from app.services.intelligence.adapters import FitMindDBAdapter
from app.services.intelligence.contracts import NormalizedSubjectData, FeatureExtractionResult
from app.services.intelligence.feature_extractor import FeatureExtractor
from app.services.intelligence.model_service import ModelService
from app.schemas.intelligence import (
    TrajectoryProjectionResponse,
    ConfidenceInterval,
    DataConfidence,
)


class PredictionService:
    """
    Orchestrates deterministic feature extraction and champion model inference
    for 28-day body-weight change projections.
    """

    BENCHMARK_SIGMA_KG: float = 0.3928
    PARAMETRIC_90_HALF_WIDTH_KG: float = 0.6462  # 1.645 * 0.3928
    MODEL_NAME: str = "Ridge Regression (Standard Scaled)"
    MODEL_VERSION: str = "2.4.0-phase2d-champion"

    @classmethod
    def evaluate_data_confidence(
        cls,
        nutrition_days: int,
        measurement_count: int,
        has_baseline_weight: bool,
    ) -> DataConfidence:
        """
        Computes deterministic, qualitative data confidence assessment.
        Documented thresholds:
        - HIGH: >= 20 days nutrition logged in 28d AND >= 4 measurements AND baseline weight present.
        - MEDIUM: >= 7 days nutrition logged in 28d AND >= 1 measurement AND baseline weight present.
        - LOW: < 7 days nutrition logged OR 0 measurements OR missing baseline weight.
        """
        reasons: List[str] = []

        if not has_baseline_weight:
            reasons.append("No recorded body-weight measurement; relying on default baseline.")

        if nutrition_days >= 20:
            reasons.append(f"Strong nutrition logging coverage: {nutrition_days}/28 days recorded.")
        elif nutrition_days >= 7:
            reasons.append(f"Moderate nutrition logging coverage: {nutrition_days}/28 days recorded.")
        else:
            reasons.append(f"Sparse nutrition logging: only {nutrition_days}/28 days recorded (model uses metabolic defaults).")

        if measurement_count >= 4:
            reasons.append(f"Frequent body-weight tracking: {measurement_count} check-ins in the last 28 days.")
        elif measurement_count >= 1:
            reasons.append(f"Limited body-weight tracking: {measurement_count} check-in(s) in the last 28 days.")
        else:
            reasons.append("No historical check-ins in the 28-day window.")

        if has_baseline_weight and nutrition_days >= 20 and measurement_count >= 4:
            level = "HIGH"
        elif has_baseline_weight and nutrition_days >= 7 and measurement_count >= 1:
            level = "MEDIUM"
        else:
            level = "LOW"

        return DataConfidence(
            level=level,
            nutrition_days_logged=nutrition_days,
            measurement_count=measurement_count,
            reasons=reasons,
        )

    @classmethod
    def predict_from_subject_data(
        cls,
        subject_data: NormalizedSubjectData,
        reference_date: date,
    ) -> Tuple[TrajectoryProjectionResponse, FeatureExtractionResult]:
        """
        Predicts 28-day trajectory directly from NormalizedSubjectData contract.
        Useful for testing, simulations, and live database queries.
        """
        # 1. Extract canonical F01..F16 features
        extraction_result: FeatureExtractionResult = FeatureExtractor.extract_features(
            subject_data=subject_data,
            reference_date=reference_date,
        )
        feat_dict = dict(extraction_result.features)

        # 2. Inference via champion model
        predicted_delta = ModelService.predict_delta_weight_28d(feat_dict)
        baseline_weight = round(feat_dict["F04"], 2)
        projected_weight = round(baseline_weight + predicted_delta, 2)

        # 3. Benchmark uncertainty interval
        conf_interval = ConfidenceInterval(
            lower_bound_kg=round(projected_weight - cls.PARAMETRIC_90_HALF_WIDTH_KG, 2),
            upper_bound_kg=round(projected_weight + cls.PARAMETRIC_90_HALF_WIDTH_KG, 2),
            half_width_kg=cls.PARAMETRIC_90_HALF_WIDTH_KG,
            confidence_level_pct=90.0,
            uncertainty_type="benchmark_residual",
            disclaimer=(
                "Derived from a controlled physiological benchmark generated from the Kevin Hall energy-balance model "
                "(benchmark residual sigma ≈ 0.3928 kg). This represents benchmark-derived model uncertainty, "
                "not personalized clinical certainty, patient-specific confidence, or a guaranteed prediction range."
            ),
        )

        # 4. Deterministic data confidence
        meta = extraction_result.metadata
        data_confidence = cls.evaluate_data_confidence(
            nutrition_days=meta.nutrition_days_logged_28d,
            measurement_count=meta.measurement_count_28d,
            has_baseline_weight=meta.has_baseline_weight,
        )

        response = TrajectoryProjectionResponse(
            baseline_weight_kg=baseline_weight,
            predicted_change_28d_kg=predicted_delta,
            projected_weight_28d_kg=projected_weight,
            confidence_interval=conf_interval,
            data_confidence=data_confidence,
            features_used=feat_dict,
            reference_date=reference_date.isoformat(),
            model_name=cls.MODEL_NAME,
            model_version=cls.MODEL_VERSION,
            feature_schema_version=ModelService.FEATURE_SCHEMA_VERSION,
            projection_disclaimer=(
                "Model-based scenario projection over a 28-day trajectory. "
                "Validated against a controlled physiological benchmark generated from the Kevin Hall energy-balance model; "
                "has not undergone clinical or large-scale empirical validation on real-world FitMind users. "
                "Does not constitute medical diagnosis, clinical prescription, or guaranteed physiological outcome."
            ),
        )

        return response, extraction_result

    @classmethod
    def predict_user_trajectory(
        cls,
        db: Session,
        user: User,
        reference_date: Optional[date] = None,
    ) -> TrajectoryProjectionResponse:
        """
        Fetches user data from database and generates 28-day trajectory projection.
        """
        subject_data = FitMindDBAdapter.extract_subject_data(db, user.id)
        if not subject_data:
            raise ValueError(f"Could not load fitness profile data for user {user.id}")

        if reference_date is None:
            user_tz = subject_data.demographics.timezone_str
            reference_date = extract_date(datetime.now(timezone.utc), user_tz) or date.today()

        projection, _ = cls.predict_from_subject_data(subject_data, reference_date)
        return projection
