"""
Canonical data contracts and interfaces for FitMind AI feature pipeline.
"""

from dataclasses import dataclass, field, asdict
from datetime import date
from typing import Optional, Dict, Any, List


@dataclass
class SubjectDemographics:
    """Demographic and physical profile data for a subject."""
    subject_id: str
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = None  # "male", "female", "other"
    height_cm: Optional[float] = None
    baseline_profile_weight_kg: Optional[float] = None
    activity_level: Optional[str] = "moderate"
    timezone_str: str = "UTC"


@dataclass
class MeasurementRecord:
    """Historical or post-intervention body measurement."""
    measured_date: date
    weight_kg: float


@dataclass
class DailyNutritionRecord:
    """Aggregated daily nutritional intake for a calendar day."""
    log_date: date
    calories: float
    protein_g: float
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


@dataclass
class NormalizedSubjectData:
    """Normalized longitudinal record for a subject from any source dataset."""
    demographics: SubjectDemographics
    measurements: List[MeasurementRecord] = field(default_factory=list)
    nutrition_logs: List[DailyNutritionRecord] = field(default_factory=list)
    target_calories: Optional[float] = None


@dataclass
class FeatureVector:
    """
    Canonical 16-feature vector (F01..F16) for FitMind 28-day prediction.
    Strictly point-in-time <= reference_date t.
    """
    F01_age: float
    F02_gender: int  # 0 = female, 1 = male
    F03_height_cm: float
    F04_baseline_weight_kg: float
    F05_baseline_bmi: float
    F06_bmr_kcal: float
    F07_tdee_kcal: float
    F08_calories_avg_28d: float
    F09_calories_avg_7d: float
    F10_protein_avg_28d: float
    F11_est_calorie_balance_28d: float
    F12_calorie_adherence_28d: float
    F13_logging_frequency_28d: float
    F14_weight_slope_28d: float
    F15_measurement_count_28d: int
    F16_activity_multiplier: float

    def to_dict(self) -> Dict[str, float]:
        """Returns standard F01-F16 dictionary."""
        return {
            "F01": self.F01_age,
            "F02": float(self.F02_gender),
            "F03": self.F03_height_cm,
            "F04": self.F04_baseline_weight_kg,
            "F05": self.F05_baseline_bmi,
            "F06": self.F06_bmr_kcal,
            "F07": self.F07_tdee_kcal,
            "F08": self.F08_calories_avg_28d,
            "F09": self.F09_calories_avg_7d,
            "F10": self.F10_protein_avg_28d,
            "F11": self.F11_est_calorie_balance_28d,
            "F12": self.F12_calorie_adherence_28d,
            "F13": self.F13_logging_frequency_28d,
            "F14": self.F14_weight_slope_28d,
            "F15": float(self.F15_measurement_count_28d),
            "F16": self.F16_activity_multiplier,
        }

    def to_named_dict(self) -> Dict[str, float]:
        """Returns feature dictionary keyed by descriptive feature names."""
        return asdict(self)


@dataclass
class DataCompletenessMetadata:
    """Audit metadata on historical data completeness up to index date t."""
    reference_date: date
    nutrition_days_logged_28d: int
    nutrition_days_logged_7d: int
    measurement_count_28d: int
    has_baseline_weight: bool
    has_height: bool
    has_demographics: bool
    is_fully_complete: bool


@dataclass
class FeatureExtractionResult:
    """Encapsulates features and completeness metadata for a point in time."""
    subject_id: str
    reference_date: date
    features: Dict[str, float]
    named_features: Dict[str, float]
    metadata: DataCompletenessMetadata


@dataclass
class TrainingExample:
    """A valid, verified longitudinal training example."""
    subject_id: str
    reference_date: date
    target_date: date
    target_days_diff: int
    baseline_weight_kg: float
    target_weight_kg: float
    delta_weight_28d: float
    features: Dict[str, float]
    metadata: Dict[str, Any]


@dataclass
class ExcludedWindow:
    """An invalid prediction window that was dropped, along with the exclusion reason."""
    subject_id: str
    reference_date: date
    exclusion_reason: str
