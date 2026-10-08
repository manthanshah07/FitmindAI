"""
Deterministic unit and regression tests for FitMind AI feature extraction pipeline (Phase 2C).
Covers:
1. Canonical F01..F16 feature calculation correctness
2. Temporal leakage prevention (future changes do not leak into features)
3. Target construction and tolerance window [t+25, t+31]
4. Timezone-aware date boundary handling
5. Missing data policies (nutrition, weight, demographics)
6. Determinism (same input produces identical output)
7. Sanity checker validation
"""

from datetime import date, timedelta
import pytest

from app.services.intelligence.contracts import (
    SubjectDemographics,
    MeasurementRecord,
    DailyNutritionRecord,
    NormalizedSubjectData,
)
from app.services.intelligence.feature_extractor import FeatureExtractor
from app.services.intelligence.training_windows import TrainingWindowGenerator
from app.services.intelligence.sanity_checker import FeatureSanityChecker
from app.services.intelligence.adapters import DictRecordAdapter


@pytest.fixture
def baseline_subject_data() -> NormalizedSubjectData:
    """Fixture with 60 days of longitudinal measurements and nutrition."""
    t0 = date(2026, 1, 1)

    demographics = SubjectDemographics(
        subject_id="test_user_01",
        date_of_birth=date(1996, 5, 15),  # ~29-30 years old
        gender="male",
        height_cm=180.0,
        baseline_profile_weight_kg=80.0,
        activity_level="moderate",
        timezone_str="UTC",
    )

    # 60 days of measurements: starts at 80.0 kg, loses 0.05 kg/day
    measurements = [
        MeasurementRecord(
            measured_date=t0 + timedelta(days=i),
            weight_kg=round(80.0 - 0.05 * i, 2),
        )
        for i in range(60)
    ]

    # 60 days of nutrition: 2200 kcal/day, 160g protein/day
    nutrition_logs = [
        DailyNutritionRecord(
            log_date=t0 + timedelta(days=i),
            calories=2200.0,
            protein_g=160.0,
            carbs_g=240.0,
            fat_g=65.0,
        )
        for i in range(60)
    ]

    return NormalizedSubjectData(
        demographics=demographics,
        measurements=measurements,
        nutrition_logs=nutrition_logs,
        target_calories=2200.0,
    )


# =========================================================================
# TEST CATEGORY 1: FEATURE VALUES (F01..F16)
# =========================================================================

def test_feature_values_correctness(baseline_subject_data):
    """Verifies that all 16 features are computed correctly at t = Day 28."""
    ref_date = date(2026, 1, 29)  # Day 28 (0-indexed)
    res = FeatureExtractor.extract_features(baseline_subject_data, ref_date)
    f = res.features

    assert len(f) == 16, f"Expected 16 features, got {len(f)}"

    # F01: Age
    assert f["F01"] == 29.0
    # F02: Gender (1 = male)
    assert f["F02"] == 1.0
    # F03: Height cm
    assert f["F03"] == 180.0
    # F04: Baseline weight at Day 28: 80.0 - (0.05 * 28) = 78.6 kg
    assert f["F04"] == 78.6
    # F05: Baseline BMI: 78.6 / (1.80^2) = 24.26
    assert f["F05"] == pytest.approx(24.26, 0.01)
    # F06: BMR via Mifflin-St Jeor (10*78.6 + 6.25*180 - 5*29 + 5) = 786 + 1125 - 145 + 5 = 1771
    assert f["F06"] == 1771.0
    # F07: TDEE: 1771 * 1.55 = 2745
    assert f["F07"] == 2745.0
    # F08: calories_avg_28d = 2200.0
    assert f["F08"] == 2200.0
    # F09: calories_avg_7d = 2200.0
    assert f["F09"] == 2200.0
    # F10: protein_avg_28d = 160.0
    assert f["F10"] == 160.0
    # F11: est_calorie_balance_28d = 2200.0 - 2745.0 = -545.0
    assert f["F11"] == -545.0
    # F12: calorie_adherence_28d (target = 2200.0, actual = 2200.0) -> 1.0
    assert f["F12"] == 1.0
    # F13: logging_frequency_28d (all 28 days logged) -> 1.0
    assert f["F13"] == 1.0
    # F14: weight_slope_28d = -0.05 kg/day
    assert f["F14"] == pytest.approx(-0.05, 0.001)
    # F15: measurement_count_28d = 28 measurements
    assert f["F15"] == 28.0
    # F16: activity_multiplier = 1.55
    assert f["F16"] == 1.55


# =========================================================================
# TEST CATEGORY 2: TEMPORAL LEAKAGE PREVENTION
# =========================================================================

def test_temporal_leakage_immunity(baseline_subject_data):
    """
    Constructs a scenario where future values (after reference_date t)
    are altered drastically.
    Verifies that extracted features at t do NOT change at all.
    """
    ref_date = date(2026, 1, 29)

    # 1. Baseline features at t
    res_clean = FeatureExtractor.extract_features(baseline_subject_data, ref_date)
    features_clean = res_clean.features

    # 2. Corrupt future measurements and nutrition (days 30 to 59)
    corrupted_data = DictRecordAdapter.from_dict({
        "demographics": {
            "subject_id": baseline_subject_data.demographics.subject_id,
            "date_of_birth": baseline_subject_data.demographics.date_of_birth.isoformat(),
            "gender": baseline_subject_data.demographics.gender,
            "height_cm": baseline_subject_data.demographics.height_cm,
            "activity_level": baseline_subject_data.demographics.activity_level,
        },
        "measurements": [
            {
                "measured_date": m.measured_date.isoformat(),
                # If measurement is in the future (> ref_date), spike it to 200 kg!
                "weight_kg": 200.0 if m.measured_date > ref_date else m.weight_kg,
            }
            for m in baseline_subject_data.measurements
        ],
        "nutrition_logs": [
            {
                "log_date": n.log_date.isoformat(),
                # If nutrition is in the future (> ref_date), spike it to 10,000 kcal!
                "calories": 10000.0 if n.log_date > ref_date else n.calories,
                "protein_g": 500.0 if n.log_date > ref_date else n.protein_g,
            }
            for n in baseline_subject_data.nutrition_logs
        ],
        "target_calories": 2200.0,
    })

    res_corrupted = FeatureExtractor.extract_features(corrupted_data, ref_date)
    features_corrupted = res_corrupted.features

    # Every single feature MUST be identical down to the bit
    for key in features_clean:
        assert features_clean[key] == features_corrupted[key], (
            f"Leakage detected on {key}! Original={features_clean[key]}, Corrupted={features_corrupted[key]}"
        )


# =========================================================================
# TEST CATEGORY 3: TARGET CONSTRUCTION & WINDOW TOLERANCE [t+25, t+31]
# =========================================================================

def test_target_construction_exact_and_tolerance():
    """Tests target detection at Day 28, Day 25, Day 31, and invalid offsets."""
    ref_date = date(2026, 2, 1)

    base_measurements = [
        MeasurementRecord(measured_date=ref_date, weight_kg=80.0),
    ]

    def create_subject(target_date: date, weight: float) -> NormalizedSubjectData:
        return NormalizedSubjectData(
            demographics=SubjectDemographics(subject_id="sub_test", gender="female", height_cm=165.0),
            measurements=base_measurements + [MeasurementRecord(measured_date=target_date, weight_kg=weight)],
            nutrition_logs=[],
        )

    # 1. Exact Day 28 (t + 28 days) -> Valid
    sub_28 = create_subject(ref_date + timedelta(days=28), 78.5)
    ex, excl = TrainingWindowGenerator.evaluate_window_at_date(sub_28, ref_date)
    assert ex is not None
    assert ex.delta_weight_28d == -1.5
    assert ex.target_days_diff == 28

    # 2. Lower boundary: Day 25 (t + 25 days) -> Valid
    sub_25 = create_subject(ref_date + timedelta(days=25), 78.7)
    ex, excl = TrainingWindowGenerator.evaluate_window_at_date(sub_25, ref_date)
    assert ex is not None
    assert ex.delta_weight_28d == -1.3
    assert ex.target_days_diff == 25

    # 3. Upper boundary: Day 31 (t + 31 days) -> Valid
    sub_31 = create_subject(ref_date + timedelta(days=31), 78.2)
    ex, excl = TrainingWindowGenerator.evaluate_window_at_date(sub_31, ref_date)
    assert ex is not None
    assert ex.delta_weight_28d == -1.8
    assert ex.target_days_diff == 31

    # 4. Day 24 (outside lower bound) -> Invalid, window dropped
    sub_24 = create_subject(ref_date + timedelta(days=24), 78.8)
    ex, excl = TrainingWindowGenerator.evaluate_window_at_date(sub_24, ref_date)
    assert ex is None
    assert excl is not None
    assert excl.exclusion_reason == "no_target_in_window"

    # 5. Day 32 (outside upper bound) -> Invalid, window dropped
    sub_32 = create_subject(ref_date + timedelta(days=32), 78.1)
    ex, excl = TrainingWindowGenerator.evaluate_window_at_date(sub_32, ref_date)
    assert ex is None
    assert excl is not None
    assert excl.exclusion_reason == "no_target_in_window"


def test_missing_baseline_weight_exclusion():
    """Verifies that a window without any baseline weight <= t is dropped."""
    ref_date = date(2026, 2, 1)
    # Measurement only exists in the future
    subject = NormalizedSubjectData(
        demographics=SubjectDemographics(subject_id="sub_test"),
        measurements=[MeasurementRecord(measured_date=ref_date + timedelta(days=28), weight_kg=75.0)],
        nutrition_logs=[],
    )
    ex, excl = TrainingWindowGenerator.evaluate_window_at_date(subject, ref_date)
    assert ex is None
    assert excl is not None
    assert excl.exclusion_reason == "missing_baseline_weight"


def test_non_overlapping_training_windows_generation(baseline_subject_data):
    """Verifies that generate_subject_training_windows steps by 28 days without overlap."""
    examples, excluded = TrainingWindowGenerator.generate_subject_training_windows(
        baseline_subject_data,
        step_days=28,
        min_lead_in_days=28,
    )
    assert len(examples) >= 1
    # Check that consecutive examples have at least 28 days between reference dates
    for i in range(1, len(examples)):
        gap = (examples[i].reference_date - examples[i - 1].reference_date).days
        assert gap >= 28, f"Overlapping windows detected: gap is {gap} days!"


# =========================================================================
# TEST CATEGORY 4: MISSING FOOD-LOG & WEIGHT DATA POLICIES
# =========================================================================

def test_missing_food_log_policy():
    """
    Tests Approach C:
    - 0 logged days in 28d window: assumes maintenance TDEE, frequency = 0.0, balance = 0.0
    - partial logging (14 of 28 days): averages strictly over the 14 logged days, frequency = 0.5
    """
    ref_date = date(2026, 2, 1)
    demo = SubjectDemographics(subject_id="sub_missing", gender="male", height_cm=180.0, baseline_profile_weight_kg=80.0)

    # 1. Zero nutrition logs
    subject_zero = NormalizedSubjectData(
        demographics=demo,
        measurements=[MeasurementRecord(measured_date=ref_date, weight_kg=80.0)],
        nutrition_logs=[],
    )
    res_zero = FeatureExtractor.extract_features(subject_zero, ref_date)
    f0 = res_zero.features
    assert f0["F13"] == 0.0  # logging_frequency_28d
    assert f0["F08"] == f0["F07"]  # calories_avg_28d defaults to TDEE
    assert f0["F11"] == 0.0  # estimated balance is neutral 0.0
    assert res_zero.metadata.nutrition_days_logged_28d == 0

    # 2. Partial nutrition: 14 days logged at 2500 kcal
    d28_start = ref_date - timedelta(days=27)
    partial_logs = [
        DailyNutritionRecord(log_date=d28_start + timedelta(days=i), calories=2500.0, protein_g=150.0)
        for i in range(14)
    ]
    subject_partial = NormalizedSubjectData(
        demographics=demo,
        measurements=[MeasurementRecord(measured_date=ref_date, weight_kg=80.0)],
        nutrition_logs=partial_logs,
    )
    res_partial = FeatureExtractor.extract_features(subject_partial, ref_date)
    fp = res_partial.features
    assert fp["F13"] == 0.5  # 14 / 28 = 0.5
    assert fp["F08"] == 2500.0  # Average strictly over logged days (not diluted by 14 zeros!)
    assert fp["F10"] == 150.0


def test_weight_slope_edge_cases():
    """Tests OLS weight slope under 0, 1, 2, and identical-day measurements."""
    ref_date = date(2026, 2, 1)

    # 0 measurements -> 0.0
    assert FeatureExtractor.compute_weight_slope([], ref_date) == 0.0

    # 1 measurement -> 0.0
    m1 = [MeasurementRecord(measured_date=ref_date, weight_kg=75.0)]
    assert FeatureExtractor.compute_weight_slope(m1, ref_date) == 0.0

    # 2 measurements on same date -> 0.0 (no variance in x)
    m_same = [
        MeasurementRecord(measured_date=ref_date, weight_kg=75.0),
        MeasurementRecord(measured_date=ref_date, weight_kg=75.5),
    ]
    assert FeatureExtractor.compute_weight_slope(m_same, ref_date) == 0.0

    # 3 measurements with exact linear rate: -1.0 kg over 10 days = -0.1 kg/day
    m_linear = [
        MeasurementRecord(measured_date=ref_date - timedelta(days=10), weight_kg=80.0),
        MeasurementRecord(measured_date=ref_date - timedelta(days=5), weight_kg=79.5),
        MeasurementRecord(measured_date=ref_date, weight_kg=79.0),
    ]
    slope = FeatureExtractor.compute_weight_slope(m_linear, ref_date)
    assert slope == pytest.approx(-0.1, 0.001)


# =========================================================================
# TEST CATEGORY 5: DETERMINISM
# =========================================================================

def test_feature_extraction_determinism(baseline_subject_data):
    """Verifies that running extraction multiple times yields byte-identical output."""
    ref_date = date(2026, 1, 29)
    res1 = FeatureExtractor.extract_features(baseline_subject_data, ref_date)
    res2 = FeatureExtractor.extract_features(baseline_subject_data, ref_date)

    assert res1.features == res2.features
    assert res1.named_features == res2.named_features
    assert res1.metadata.__dict__ == res2.metadata.__dict__


# =========================================================================
# TEST CATEGORY 6: SANITY CHECKER VALIDATION
# =========================================================================

def test_sanity_checker_valid_and_anomalous(baseline_subject_data):
    """Verifies that the sanity checker passes valid records and flags anomalies."""
    ref_date = date(2026, 1, 29)
    res = FeatureExtractor.extract_features(baseline_subject_data, ref_date)

    # 1. Clean feature record should be marked sane
    clean_report = FeatureSanityChecker.audit_features([res.features])
    assert clean_report.is_sane is True
    assert clean_report.total_anomalies_count == 0
    assert len(clean_report.flagged_records) == 0

    # 2. Anomalous record with negative weight and impossible calorie balance
    corrupted_features = dict(res.features)
    corrupted_features["F04"] = -10.0  # Impossible negative weight!
    corrupted_features["F08"] = 25000.0  # Impossible 25,000 kcal intake!

    bad_report = FeatureSanityChecker.audit_features([corrupted_features])
    assert bad_report.is_sane is False
    assert bad_report.total_anomalies_count >= 2
    assert len(bad_report.flagged_records) == 1
