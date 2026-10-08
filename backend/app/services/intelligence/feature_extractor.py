"""
Authoritative Deterministic Feature Extraction Service for FitMind AI.
Implements the approved 16-feature schema (F01..F16) for Phase 2C.
Strictly adheres to Point-in-Time correctness: no information after reference date t.
"""

from datetime import date, timedelta
from typing import Optional, List, Dict, Tuple, Any

from app.core.calculations import (
    calculate_tdee,
    calculate_calorie_adherence,
)
from app.services.intelligence.contracts import (
    NormalizedSubjectData,
    MeasurementRecord,
    DailyNutritionRecord,
    FeatureVector,
    DataCompletenessMetadata,
    FeatureExtractionResult,
)


class FeatureExtractor:
    """
    Extracts the canonical 16-feature vector from normalized longitudinal subject data
    at an exact reference date t.
    """

    ACTIVITY_MULTIPLIERS: Dict[str, float] = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "very_active": 1.725,
        "extra_active": 1.9,
    }

    @classmethod
    def extract_features(
        cls,
        subject_data: NormalizedSubjectData,
        reference_date: date,
    ) -> FeatureExtractionResult:
        """
        Extracts canonical F01..F16 features for subject_data at reference_date t.

        POINT-IN-TIME ENFORCEMENT:
        Every feature is derived strictly from historical data where event_date <= reference_date.
        All records with event_date > reference_date are filtered out.
        """
        demographics = subject_data.demographics

        # ---------------------------------------------------------
        # 1. Historical Filtering (Point-in-Time Gating at t)
        # ---------------------------------------------------------
        valid_measurements: List[MeasurementRecord] = [
            m for m in subject_data.measurements
            if m.measured_date <= reference_date and m.weight_kg is not None and m.weight_kg > 0
        ]
        # Sort chronologically by date
        valid_measurements.sort(key=lambda m: m.measured_date)

        valid_nutrition: List[DailyNutritionRecord] = [
            n for n in subject_data.nutrition_logs
            if n.log_date <= reference_date and n.calories is not None and n.calories >= 0
        ]
        valid_nutrition.sort(key=lambda n: n.log_date)

        # ---------------------------------------------------------
        # 2. Demographics & Baseline Anthropometrics (F01 - F05)
        # ---------------------------------------------------------
        # F01: age at reference_date t
        age: float = cls._compute_age_at_date(demographics.date_of_birth, reference_date, demographics.age)

        # F02: gender (0 = female, 1 = male)
        gender_val: int = 1 if (demographics.gender or "").strip().lower() == "male" else 0

        # F03: height_cm (cm)
        height_cm: float = (
            float(demographics.height_cm)
            if demographics.height_cm and float(demographics.height_cm) > 0
            else 175.0
        )

        # F04: baseline_weight_kg (latest valid measurement <= t)
        baseline_weight_kg: float
        has_baseline_measurement: bool = False
        if valid_measurements:
            baseline_weight_kg = float(valid_measurements[-1].weight_kg)
            has_baseline_measurement = True
        elif demographics.baseline_profile_weight_kg and float(demographics.baseline_profile_weight_kg) > 0:
            baseline_weight_kg = float(demographics.baseline_profile_weight_kg)
        else:
            baseline_weight_kg = 70.0  # FitMind default baseline

        # F05: baseline_bmi (kg/m²)
        baseline_bmi: float = round(baseline_weight_kg / ((height_cm / 100.0) ** 2), 2) if height_cm > 0 else 22.0

        # ---------------------------------------------------------
        # 3. Metabolic Baselines (F06, F07, F16)
        # ---------------------------------------------------------
        # Authoritative Mifflin-St Jeor and TDEE via calculations.py
        tdee_calc = calculate_tdee(
            weight_kg=baseline_weight_kg,
            height_cm=height_cm,
            date_of_birth=demographics.date_of_birth,
            gender=demographics.gender,
            activity_level=demographics.activity_level,
            reference_date=reference_date,
        )
        bmr_kcal: float = float(tdee_calc["bmr"])
        tdee_kcal: float = float(tdee_calc["tdee"])

        # F16: activity_multiplier
        activity_multiplier: float = cls.ACTIVITY_MULTIPLIERS.get(
            (demographics.activity_level or "").strip().lower(), 1.55
        )

        # ---------------------------------------------------------
        # 4. Historical Nutrition Features (F08, F09, F10, F11, F12, F13)
        # Windows: 28-day [t-27, t], 7-day [t-6, t]
        # ---------------------------------------------------------
        d28_start = reference_date - timedelta(days=27)
        d7_start = reference_date - timedelta(days=6)

        nutrition_28d = [n for n in valid_nutrition if d28_start <= n.log_date <= reference_date]
        nutrition_7d = [n for n in valid_nutrition if d7_start <= n.log_date <= reference_date]

        target_cals = (
            float(subject_data.target_calories)
            if subject_data.target_calories and float(subject_data.target_calories) > 0
            else tdee_kcal
        )

        nut_features, nut_metadata = cls.compute_nutrition_aggregates(
            nutrition_28d=nutrition_28d,
            nutrition_7d=nutrition_7d,
            tdee_kcal=tdee_kcal,
            target_calories=target_cals,
            baseline_weight_kg=baseline_weight_kg,
        )

        calories_avg_28d = nut_features["calories_avg_28d"]
        calories_avg_7d = nut_features["calories_avg_7d"]
        protein_avg_28d = nut_features["protein_avg_28d"]
        est_calorie_balance_28d = nut_features["est_calorie_balance_28d"]
        calorie_adherence_28d = nut_features["calorie_adherence_28d"]
        logging_frequency_28d = nut_features["logging_frequency_28d"]

        # ---------------------------------------------------------
        # 5. Historical Weight Progress Features (F14, F15)
        # Window: [t-27, t]
        # ---------------------------------------------------------
        measurements_28d = [m for m in valid_measurements if d28_start <= m.measured_date <= reference_date]
        measurement_count_28d: int = len(measurements_28d)

        weight_slope_28d: float = cls.compute_weight_slope(
            measurements_28d=measurements_28d,
            reference_date=reference_date,
        )

        # ---------------------------------------------------------
        # 6. Feature Vector Assembly
        # ---------------------------------------------------------
        feature_vector = FeatureVector(
            F01_age=age,
            F02_gender=gender_val,
            F03_height_cm=height_cm,
            F04_baseline_weight_kg=baseline_weight_kg,
            F05_baseline_bmi=baseline_bmi,
            F06_bmr_kcal=bmr_kcal,
            F07_tdee_kcal=tdee_kcal,
            F08_calories_avg_28d=calories_avg_28d,
            F09_calories_avg_7d=calories_avg_7d,
            F10_protein_avg_28d=protein_avg_28d,
            F11_est_calorie_balance_28d=est_calorie_balance_28d,
            F12_calorie_adherence_28d=calorie_adherence_28d,
            F13_logging_frequency_28d=logging_frequency_28d,
            F14_weight_slope_28d=weight_slope_28d,
            F15_measurement_count_28d=measurement_count_28d,
            F16_activity_multiplier=activity_multiplier,
        )

        # ---------------------------------------------------------
        # 7. Metadata Assembly
        # ---------------------------------------------------------
        has_height = demographics.height_cm is not None and float(demographics.height_cm) > 0
        has_demographics = (
            demographics.date_of_birth is not None or demographics.age is not None
        ) and demographics.gender is not None

        completeness_metadata = DataCompletenessMetadata(
            reference_date=reference_date,
            nutrition_days_logged_28d=nut_metadata["days_logged_28d"],
            nutrition_days_logged_7d=nut_metadata["days_logged_7d"],
            measurement_count_28d=measurement_count_28d,
            has_baseline_weight=has_baseline_measurement,
            has_height=has_height,
            has_demographics=has_demographics,
            is_fully_complete=(
                has_baseline_measurement
                and has_height
                and has_demographics
                and nut_metadata["days_logged_28d"] >= 14
                and measurement_count_28d >= 2
            ),
        )

        return FeatureExtractionResult(
            subject_id=demographics.subject_id,
            reference_date=reference_date,
            features=feature_vector.to_dict(),
            named_features=feature_vector.to_named_dict(),
            metadata=completeness_metadata,
        )

    # -------------------------------------------------------------
    # Isolated Helper Policies
    # -------------------------------------------------------------

    @classmethod
    def compute_nutrition_aggregates(
        cls,
        nutrition_28d: List[DailyNutritionRecord],
        nutrition_7d: List[DailyNutritionRecord],
        tdee_kcal: float,
        target_calories: float,
        baseline_weight_kg: float,
    ) -> Tuple[Dict[str, float], Dict[str, int]]:
        """
        MISSING FOOD-LOG POLICY (Approach C: Logged-Days Average + Frequency Feature):
        - Averages daily calories and protein strictly over distinct days where food was logged.
        - Preserves the distinction between 'did not eat' and 'did not log'.
        - Prevents artificial starvation deficits when users log only a fraction of the 28 days.
        - If days_logged == 0:
            - Assumes maintenance intake (calories_avg_28d = TDEE) to avoid artificial deficit assumptions.
            - Assumes baseline protein (0.8 g/kg body weight).
            - logging_frequency_28d is set to 0.0, signaling zero empirical tracking confidence to the model.
        - F11 (est_calorie_balance_28d) = calories_avg_28d - TDEE.
        - F12 (calorie_adherence_28d) = canonical backend adherence function.
        - F13 (logging_frequency_28d) = distinct logged days / 28.0.
        """
        # Collapse multiple logs on the same date into daily totals
        daily_cals_28d: Dict[date, float] = {}
        daily_protein_28d: Dict[date, float] = {}
        for n in nutrition_28d:
            daily_cals_28d[n.log_date] = daily_cals_28d.get(n.log_date, 0.0) + float(n.calories)
            daily_protein_28d[n.log_date] = daily_protein_28d.get(n.log_date, 0.0) + float(n.protein_g)

        days_logged_28d = len(daily_cals_28d)
        logging_freq = round(days_logged_28d / 28.0, 4)

        if days_logged_28d > 0:
            cals_avg_28d = round(sum(daily_cals_28d.values()) / float(days_logged_28d), 1)
            prot_avg_28d = round(sum(daily_protein_28d.values()) / float(days_logged_28d), 1)
        else:
            # Neutral maintenance assumption when unlogged
            cals_avg_28d = round(tdee_kcal, 1)
            prot_avg_28d = round(0.8 * baseline_weight_kg, 1)

        # 7-day window
        daily_cals_7d: Dict[date, float] = {}
        for n in nutrition_7d:
            daily_cals_7d[n.log_date] = daily_cals_7d.get(n.log_date, 0.0) + float(n.calories)

        days_logged_7d = len(daily_cals_7d)
        if days_logged_7d > 0:
            cals_avg_7d = round(sum(daily_cals_7d.values()) / float(days_logged_7d), 1)
        else:
            cals_avg_7d = cals_avg_28d

        # F11: Estimated Calorie Balance (F08 - F07)
        est_calorie_balance = round(cals_avg_28d - tdee_kcal, 1)

        # F12: Calorie Adherence [0.0, 1.0]
        # Canonical backend adherence calculation with as_percentage=False
        adherence_val = calculate_calorie_adherence(
            actual_calories=cals_avg_28d,
            target_calories=target_calories,
            as_percentage=False,
        )
        if adherence_val is None:
            adherence_val = 1.0 if cals_avg_28d == target_calories else 0.0

        return {
            "calories_avg_28d": cals_avg_28d,
            "calories_avg_7d": cals_avg_7d,
            "protein_avg_28d": prot_avg_28d,
            "est_calorie_balance_28d": est_calorie_balance,
            "calorie_adherence_28d": adherence_val,
            "logging_frequency_28d": logging_freq,
        }, {
            "days_logged_28d": days_logged_28d,
            "days_logged_7d": days_logged_7d,
        }

    @classmethod
    def compute_weight_slope(
        cls,
        measurements_28d: List[MeasurementRecord],
        reference_date: date,
    ) -> float:
        """
        Computes Ordinary Least Squares (OLS) slope of valid historical measurements in [t-27, t].
        Units: kg/day.
        Requirements:
        - 0 valid measurements: 0.0 kg/day
        - 1 valid measurement: 0.0 kg/day
        - 2+ valid measurements: OLS slope = Cov(x, y) / Var(x)
          where x is elapsed days from the start of the 28-day window (t - 27 days).
        - If all measurements fall on the exact same day (Var(x) == 0): returns 0.0 kg/day.
        """
        if len(measurements_28d) < 2:
            return 0.0

        window_start = reference_date - timedelta(days=27)

        # x: elapsed days from window start, y: weight in kg
        points: List[Tuple[float, float]] = [
            (float((m.measured_date - window_start).days), float(m.weight_kg))
            for m in measurements_28d
        ]

        n = len(points)
        x_vals = [p[0] for p in points]
        y_vals = [p[1] for p in points]

        mean_x = sum(x_vals) / float(n)
        mean_y = sum(y_vals) / float(n)

        denom = sum((x - mean_x) ** 2 for x in x_vals)
        if denom == 0.0:
            return 0.0

        numer = sum((x - mean_x) * (y - mean_y) for x, y in points)
        slope = numer / denom

        return round(slope, 4)

    @classmethod
    def _compute_age_at_date(
        cls,
        dob: Optional[date],
        reference_date: date,
        fallback_age: Optional[int],
    ) -> float:
        """Calculates point-in-time chronological age at reference_date."""
        if dob:
            age = (
                reference_date.year
                - dob.year
                - ((reference_date.month, reference_date.day) < (dob.month, dob.day))
            )
            if 0 <= age <= 120:
                return float(age)
        if fallback_age is not None and 0 <= fallback_age <= 120:
            return float(fallback_age)
        return 25.0
