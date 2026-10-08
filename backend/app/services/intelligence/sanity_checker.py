"""
Feature Distribution & Sanity Check Utility for FitMind AI.
Inspects generated feature tables, computes distribution statistics,
and flags impossible or anomalous physiological values without training models.
"""

import math
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class FeatureStatistic:
    """Statistical summary for a single feature."""
    feature_name: str
    count: int
    missing_count: int
    min_val: Optional[float]
    max_val: Optional[float]
    mean_val: Optional[float]
    median_val: Optional[float]
    std_val: Optional[float]
    anomalies: List[str] = field(default_factory=list)


@dataclass
class SanityReport:
    """Full sanity audit report across all features."""
    sample_size: int
    feature_statistics: Dict[str, FeatureStatistic]
    is_sane: bool
    total_anomalies_count: int
    flagged_records: List[Dict[str, Any]] = field(default_factory=list)


class FeatureSanityChecker:
    """
    Lightweight offline validator that checks feature distributions
    and verifies that all values lie within physiologically plausible domains.
    """

    SANITY_BOUNDS: Dict[str, Dict[str, float]] = {
        "F01": {"min": 10.0, "max": 120.0},     # age
        "F02": {"min": 0.0, "max": 1.0},        # gender binary
        "F03": {"min": 100.0, "max": 250.0},    # height_cm
        "F04": {"min": 30.0, "max": 300.0},     # baseline_weight_kg
        "F05": {"min": 10.0, "max": 80.0},      # baseline_bmi
        "F06": {"min": 500.0, "max": 4000.0},   # bmr_kcal
        "F07": {"min": 600.0, "max": 7500.0},   # tdee_kcal
        "F08": {"min": 200.0, "max": 10000.0},  # calories_avg_28d
        "F09": {"min": 200.0, "max": 10000.0},  # calories_avg_7d
        "F10": {"min": 0.0, "max": 600.0},      # protein_avg_28d
        "F11": {"min": -6000.0, "max": 6000.0}, # est_calorie_balance_28d
        "F12": {"min": 0.0, "max": 1.0},        # calorie_adherence_28d
        "F13": {"min": 0.0, "max": 1.0},        # logging_frequency_28d
        "F14": {"min": -2.0, "max": 2.0},       # weight_slope_28d (kg/day)
        "F15": {"min": 0.0, "max": 100.0},      # measurement_count_28d
        "F16": {"min": 1.0, "max": 2.5},        # activity_multiplier
    }

    @classmethod
    def audit_features(cls, feature_records: List[Dict[str, float]]) -> SanityReport:
        """Audits a list of F01..F16 feature dictionaries."""
        n = len(feature_records)
        stats: Dict[str, FeatureStatistic] = {}
        flagged: List[Dict[str, Any]] = []
        total_anomalies = 0

        feature_keys = [f"F{i:02d}" for i in range(1, 17)]

        for key in feature_keys:
            raw_vals = [rec.get(key) for rec in feature_records]
            valid_vals = [float(v) for v in raw_vals if v is not None and not math.isnan(float(v))]
            missing = n - len(valid_vals)

            bounds = cls.SANITY_BOUNDS.get(key, {})
            min_bound = bounds.get("min", -math.inf)
            max_bound = bounds.get("max", math.inf)

            anomalies: List[str] = []
            if valid_vals:
                min_v = min(valid_vals)
                max_v = max(valid_vals)
                mean_v = sum(valid_vals) / len(valid_vals)

                sorted_v = sorted(valid_vals)
                mid = len(sorted_v) // 2
                median_v = (
                    (sorted_v[mid - 1] + sorted_v[mid]) / 2.0
                    if len(sorted_v) % 2 == 0
                    else sorted_v[mid]
                )

                variance = sum((x - mean_v) ** 2 for x in valid_vals) / len(valid_vals)
                std_v = math.sqrt(variance)

                if min_v < min_bound:
                    msg = f"Observed min {min_v} below physiological bound {min_bound}"
                    anomalies.append(msg)
                    total_anomalies += 1
                if max_v > max_bound:
                    msg = f"Observed max {max_v} above physiological bound {max_bound}"
                    anomalies.append(msg)
                    total_anomalies += 1
            else:
                min_v = max_v = mean_v = median_v = std_v = None

            stats[key] = FeatureStatistic(
                feature_name=key,
                count=len(valid_vals),
                missing_count=missing,
                min_val=round(min_v, 2) if min_v is not None else None,
                max_val=round(max_v, 2) if max_v is not None else None,
                mean_val=round(mean_v, 2) if mean_v is not None else None,
                median_val=round(median_v, 2) if median_v is not None else None,
                std_val=round(std_v, 2) if std_v is not None else None,
                anomalies=anomalies,
            )

        # Check individual records for specific row-level flags
        for idx, rec in enumerate(feature_records):
            row_errors: List[str] = []
            for key in feature_keys:
                val = rec.get(key)
                if val is None:
                    row_errors.append(f"{key} is missing")
                    continue
                fval = float(val)
                bounds = cls.SANITY_BOUNDS.get(key, {})
                if fval < bounds.get("min", -math.inf) or fval > bounds.get("max", math.inf):
                    row_errors.append(
                        f"{key}={fval} out of bounds [{bounds.get('min')}, {bounds.get('max')}]"
                    )
            if row_errors:
                flagged.append({"index": idx, "errors": row_errors})

        is_sane = total_anomalies == 0 and len(flagged) == 0

        return SanityReport(
            sample_size=n,
            feature_statistics=stats,
            is_sane=is_sane,
            total_anomalies_count=total_anomalies,
            flagged_records=flagged,
        )
