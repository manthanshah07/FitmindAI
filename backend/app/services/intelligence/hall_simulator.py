"""
NIH Kevin Hall Biophysical Simulation Engine (Lancet 2011).
Generates thermodynamically grounded, physiologically consistent longitudinal benchmarks
for evaluating FitMind ML models under verified metabolic adaptation and energy balance.

STRICT CATEGORY SEPARATION:
This is Category B (Physiological Simulation), NOT Category A (Empirical Human Data).
It serves as a controlled benchmark for pipeline testing, baseline comparison, and stress testing.
"""

import math
import random
from datetime import date, timedelta
from typing import List, Dict, Any, Optional

from app.core.calculations import calculate_tdee
from app.services.intelligence.contracts import (
    SubjectDemographics,
    MeasurementRecord,
    DailyNutritionRecord,
    NormalizedSubjectData,
)


class HallBiophysicalSimulator:
    """
    Implements the core human energy balance dynamics from Kevin D. Hall et al.
    (The Lancet 2011; 378:826–837) to simulate daily weight trajectories over time.
    """

    RHO_FAT: float = 9400.0   # kcal per kg of adipose tissue
    RHO_LEAN: float = 1800.0  # kcal per kg of lean mass tissue

    @classmethod
    def estimate_initial_body_fat_pct(cls, bmi: float, age: float, is_male: bool) -> float:
        """Gallagher / Deurenberg empirical body fat percentage equation."""
        sex_factor = 1.0 if is_male else 0.0
        bf = 1.20 * bmi + 0.23 * age - 10.8 * sex_factor - 5.4
        return max(8.0, min(55.0, bf))

    @classmethod
    def simulate_subject(
        cls,
        subject_id: str,
        age: int,
        is_male: bool,
        height_cm: float,
        initial_weight_kg: float,
        activity_level: str = "moderate",
        target_caloric_balance: float = -500.0,  # e.g., -500 kcal deficit
        logging_prob: float = 0.85,             # 85% of days logged
        duration_days: int = 112,               # 4 months (4 non-overlapping 28d windows)
        start_date: Optional[date] = None,
        random_state: Optional[int] = None,
    ) -> NormalizedSubjectData:
        """
        Simulates daily weight, fat mass, lean mass, and daily meal logs for a subject.
        """
        rng = random.Random(random_state if random_state is not None else 42)
        t0 = start_date or date(2026, 1, 1)

        # Baseline anthropometrics
        bmi_0 = initial_weight_kg / ((height_cm / 100.0) ** 2)
        bf_pct_0 = cls.estimate_initial_body_fat_pct(bmi_0, float(age), is_male)
        fat_mass = initial_weight_kg * (bf_pct_0 / 100.0)
        lean_mass = initial_weight_kg - fat_mass

        gender_str = "male" if is_male else "female"
        base_tdee_dict = calculate_tdee(
            weight_kg=initial_weight_kg,
            height_cm=height_cm,
            gender=gender_str,
            activity_level=activity_level,
        )
        base_tdee = float(base_tdee_dict["tdee"])
        prescribed_intake = max(1000.0, base_tdee + target_caloric_balance)

        # Activity multiplier
        pal_map = {"sedentary": 1.2, "light": 1.375, "moderate": 1.55, "very_active": 1.725, "extra_active": 1.9}
        pal = pal_map.get(activity_level, 1.55)

        current_weight = initial_weight_kg
        glycogen_water_shift = 0.0  # acute water fluctuation from glycogen

        measurements: List[MeasurementRecord] = []
        nutrition_logs: List[DailyNutritionRecord] = []

        # Target protein: ~1.6 g/kg if deficit, ~1.2 g/kg if surplus
        target_protein = round(current_weight * (1.6 if target_caloric_balance < 0 else 1.2), 1)

        for day in range(duration_days):
            current_date = t0 + timedelta(days=day)

            # 1. Daily intake with realistic adherence fluctuation
            daily_noise = rng.gauss(0.0, 150.0)  # ±150 kcal daily noise
            actual_intake = max(800.0, prescribed_intake + daily_noise)

            # 2. Dynamic Energy Expenditure & Metabolic Adaptation
            # As weight and lean mass drop, BMR and TEF adapt downwards
            current_bmr_dict = calculate_tdee(
                weight_kg=current_weight,
                height_cm=height_cm,
                gender=gender_str,
                activity_level=activity_level,
            )
            current_tdee = float(current_bmr_dict["tdee"])

            # Adaptive thermogenesis (downregulation during chronic deficit)
            metabolic_adaptation = -0.10 * (target_caloric_balance if target_caloric_balance < 0 else 0.0)
            net_expenditure = max(1000.0, current_tdee - metabolic_adaptation)

            # Energy imbalance
            energy_imbalance = actual_intake - net_expenditure

            # Forbes Partitioning: p = fraction of energy imbalance from lean mass
            # p(F) = C / (C + F), where C = 10.4 kg * (RHO_LEAN / RHO_FAT)
            c_forbes = 10.4 * (cls.RHO_LEAN / cls.RHO_FAT)
            p_lean = c_forbes / (c_forbes + fat_mass)
            p_fat = 1.0 - p_lean

            # Daily tissue changes (kg/day)
            delta_fat = (p_fat * energy_imbalance) / cls.RHO_FAT
            delta_lean = (p_lean * energy_imbalance) / cls.RHO_LEAN

            fat_mass = max(3.0, fat_mass + delta_fat)
            lean_mass = max(20.0, lean_mass + delta_lean)

            # Glycogen and water shifts in initial 14 days of deficit
            if day < 14 and target_caloric_balance < -200:
                glycogen_water_shift = min(1.2, glycogen_water_shift + 0.08)
            elif target_caloric_balance > 200 and day < 14:
                glycogen_water_shift = max(-1.0, glycogen_water_shift - 0.06)

            # Day-to-day hydration noise (±0.3 kg standard home scale noise)
            scale_noise = rng.gauss(0.0, 0.25)
            current_weight = round(fat_mass + lean_mass - glycogen_water_shift + scale_noise, 2)

            # Record scale measurement (measured every 1-3 days realistically)
            if day % 2 == 0 or day in (25, 26, 27, 28, 29, 30, 31, 53, 54, 55, 56, 57, 58, 81, 82, 83, 84, 85):
                measurements.append(MeasurementRecord(measured_date=current_date, weight_kg=current_weight))

            # Record food log (probabilistic based on logging fidelity)
            if rng.random() < logging_prob:
                protein_noise = rng.gauss(0.0, 15.0)
                daily_prot = max(30.0, round(target_protein + protein_noise, 1))
                nutrition_logs.append(
                    DailyNutritionRecord(
                        log_date=current_date,
                        calories=round(actual_intake, 1),
                        protein_g=daily_prot,
                        carbs_g=round((actual_intake * 0.45) / 4.0, 1),
                        fat_g=round((actual_intake * 0.30) / 9.0, 1),
                    )
                )

        dob = t0 - timedelta(days=int(age * 365.25))
        demographics = SubjectDemographics(
            subject_id=subject_id,
            date_of_birth=dob,
            age=age,
            gender=gender_str,
            height_cm=height_cm,
            baseline_profile_weight_kg=initial_weight_kg,
            activity_level=activity_level,
            timezone_str="UTC",
        )

        return NormalizedSubjectData(
            demographics=demographics,
            measurements=measurements,
            nutrition_logs=nutrition_logs,
            target_calories=round(prescribed_intake, 1),
        )

    @classmethod
    def generate_benchmark_cohort(
        cls,
        n_subjects: int = 150,
        random_seed: int = 42,
    ) -> List[NormalizedSubjectData]:
        """
        Generates a diverse benchmark cohort across demographic and behavioral strata.
        """
        rng = random.Random(random_seed)
        cohort: List[NormalizedSubjectData] = []

        activity_choices = ["sedentary", "light", "moderate", "very_active"]

        for i in range(n_subjects):
            sub_id = f"hall_sub_{i+1:04d}"
            age = rng.randint(20, 65)
            is_male = rng.random() < 0.5
            height = rng.gauss(176.0 if is_male else 163.0, 8.0)
            height = round(max(145.0, min(205.0, height)), 1)

            # Weight sampled across normal to obese BMI range (20 to 38)
            target_bmi = rng.uniform(21.0, 36.0)
            init_weight = round(target_bmi * ((height / 100.0) ** 2), 1)

            activity = rng.choice(activity_choices)

            # Deficit/Surplus: 60% deficit (-200 to -900), 20% maintenance (-150 to +150), 20% surplus (+200 to +600)
            r = rng.random()
            if r < 0.60:
                balance = rng.uniform(-900.0, -250.0)
            elif r < 0.80:
                balance = rng.uniform(-150.0, 150.0)
            else:
                balance = rng.uniform(250.0, 650.0)

            # Logging compliance: between 0.45 and 1.0
            logging_prob = rng.uniform(0.50, 0.98)

            sub_data = cls.simulate_subject(
                subject_id=sub_id,
                age=age,
                is_male=is_male,
                height_cm=height,
                initial_weight_kg=init_weight,
                activity_level=activity,
                target_caloric_balance=round(balance, 1),
                logging_prob=round(logging_prob, 2),
                duration_days=112,
                random_state=rng.randint(1, 1_000_000),
            )
            cohort.append(sub_data)

        return cohort
