"""
Deterministic Training Window Generator for FitMind AI.
Constructs valid longitudinal training examples and enforces strict target rules:
- W_base: latest valid weight at or before prediction time t.
- W_post: weight measured in [t+25, t+31].
- If no measurement exists in [t+25, t+31]: DROP THE TRAINING WINDOW.
- Never interpolates across missing intervals.
- Non-overlapping window sequences (e.g., step_days=28).
"""

from datetime import date, timedelta
from typing import List, Tuple, Optional, Dict, Any

from app.services.intelligence.contracts import (
    NormalizedSubjectData,
    MeasurementRecord,
    TrainingExample,
    ExcludedWindow,
)
from app.services.intelligence.feature_extractor import FeatureExtractor


class TrainingWindowGenerator:
    """Generates deterministic training examples with strict point-in-time isolation."""

    TARGET_MIN_OFFSET_DAYS: int = 25
    TARGET_MAX_OFFSET_DAYS: int = 31
    IDEAL_OFFSET_DAYS: int = 28

    @classmethod
    def evaluate_window_at_date(
        cls,
        subject_data: NormalizedSubjectData,
        reference_date: date,
    ) -> Tuple[Optional[TrainingExample], Optional[ExcludedWindow]]:
        """
        Evaluates a candidate prediction window starting at reference_date t.
        Returns (TrainingExample, None) if valid, or (None, ExcludedWindow) with explicit reason.
        """
        subject_id = subject_data.demographics.subject_id

        # 1. Baseline weight check (latest valid measurement <= t)
        historical_measurements = [
            m for m in subject_data.measurements
            if m.measured_date <= reference_date and m.weight_kg is not None and m.weight_kg > 0
        ]
        if not historical_measurements:
            return None, ExcludedWindow(
                subject_id=subject_id,
                reference_date=reference_date,
                exclusion_reason="missing_baseline_weight",
            )

        historical_measurements.sort(key=lambda m: m.measured_date)
        w_base_record = historical_measurements[-1]
        w_base = float(w_base_record.weight_kg)

        # 2. Search for post-intervention weight in [t + 25, t + 31]
        target_window_start = reference_date + timedelta(days=cls.TARGET_MIN_OFFSET_DAYS)
        target_window_end = reference_date + timedelta(days=cls.TARGET_MAX_OFFSET_DAYS)

        candidate_target_measurements = [
            m for m in subject_data.measurements
            if target_window_start <= m.measured_date <= target_window_end
            and m.weight_kg is not None and m.weight_kg > 0
        ]

        if not candidate_target_measurements:
            return None, ExcludedWindow(
                subject_id=subject_id,
                reference_date=reference_date,
                exclusion_reason="no_target_in_window",
            )

        # 3. Pick measurement closest to ideal Day 28 (t + 28 days)
        ideal_target_date = reference_date + timedelta(days=cls.IDEAL_OFFSET_DAYS)
        candidate_target_measurements.sort(
            key=lambda m: (abs((m.measured_date - ideal_target_date).days), m.measured_date)
        )
        w_post_record = candidate_target_measurements[0]
        w_post = float(w_post_record.weight_kg)
        target_days_diff = (w_post_record.measured_date - reference_date).days

        # 4. Compute target delta
        delta_weight_28d = round(w_post - w_base, 2)

        # 5. Extract features at point-in-time reference_date t (strictly historical)
        feature_result = FeatureExtractor.extract_features(
            subject_data=subject_data,
            reference_date=reference_date,
        )

        example = TrainingExample(
            subject_id=subject_id,
            reference_date=reference_date,
            target_date=w_post_record.measured_date,
            target_days_diff=target_days_diff,
            baseline_weight_kg=w_base,
            target_weight_kg=w_post,
            delta_weight_28d=delta_weight_28d,
            features=feature_result.features,
            metadata={
                "named_features": feature_result.named_features,
                "completeness": feature_result.metadata.__dict__,
                "w_base_date": w_base_record.measured_date.isoformat(),
                "w_post_date": w_post_record.measured_date.isoformat(),
            },
        )

        return example, None

    @classmethod
    def generate_subject_training_windows(
        cls,
        subject_data: NormalizedSubjectData,
        step_days: int = 28,
        min_lead_in_days: int = 28,
    ) -> Tuple[List[TrainingExample], List[ExcludedWindow]]:
        """
        Generates non-overlapping candidate training windows across a subject's longitudinal timeline.
        Enforces step_days separation so windows are strictly non-overlapping.
        """
        valid_examples: List[TrainingExample] = []
        excluded_windows: List[ExcludedWindow] = []

        all_dates: List[date] = []
        for m in subject_data.measurements:
            all_dates.append(m.measured_date)
        for n in subject_data.nutrition_logs:
            all_dates.append(n.log_date)

        if not all_dates:
            return valid_examples, excluded_windows

        earliest_date = min(all_dates)
        latest_date = max(all_dates)

        # First reference date t must have at least min_lead_in_days history
        first_t = earliest_date + timedelta(days=min_lead_in_days)
        # Last reference date must allow at least TARGET_MIN_OFFSET_DAYS for the target
        last_t = latest_date - timedelta(days=cls.TARGET_MIN_OFFSET_DAYS)

        if first_t > last_t:
            # Cannot form any valid window with proper target interval
            return valid_examples, [
                ExcludedWindow(
                    subject_id=subject_data.demographics.subject_id,
                    reference_date=first_t,
                    exclusion_reason="insufficient_timeline_duration",
                )
            ]

        current_t = first_t
        while current_t <= last_t:
            example, excluded = cls.evaluate_window_at_date(
                subject_data=subject_data,
                reference_date=current_t,
            )
            if example:
                valid_examples.append(example)
            elif excluded:
                excluded_windows.append(excluded)

            # Advance by step_days (e.g. 28 days) to enforce strictly non-overlapping windows!
            current_t += timedelta(days=step_days)

        return valid_examples, excluded_windows
