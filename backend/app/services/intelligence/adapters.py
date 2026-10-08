"""
Dataset Adapters for FitMind AI Intelligence Service.
Decouples raw data sources (PostgreSQL DB, PMData, Synthetic Cohorts, Test Fixtures)
from the feature extractor via the NormalizedSubjectData contract.
"""

from datetime import date, datetime
from typing import Dict, Any, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.profile import Profile
from app.models.progress import Measurement
from app.models.nutrition import MealLog, MealLogItem
from app.models.goal import Goal
from app.core.timezone_utils import extract_date
from app.services.intelligence.contracts import (
    SubjectDemographics,
    MeasurementRecord,
    DailyNutritionRecord,
    NormalizedSubjectData,
)


class FitMindDBAdapter:
    """
    Extracts and normalizes live application data from the FitMind PostgreSQL database
    into the standard NormalizedSubjectData representation.
    """

    @classmethod
    def extract_subject_data(cls, db: Session, user_id: UUID) -> Optional[NormalizedSubjectData]:
        """Loads user, profile, measurements, and meals from DB into NormalizedSubjectData."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        user_tz = profile.timezone if profile and profile.timezone else "UTC"

        # Demographics
        dob_date: Optional[date] = None
        if profile and profile.date_of_birth:
            if isinstance(profile.date_of_birth, datetime):
                dob_date = profile.date_of_birth.date()
            elif isinstance(profile.date_of_birth, date):
                dob_date = profile.date_of_birth

        demographics = SubjectDemographics(
            subject_id=str(user.id),
            date_of_birth=dob_date,
            gender=profile.gender if profile else None,
            height_cm=float(profile.height_cm) if profile and profile.height_cm else None,
            baseline_profile_weight_kg=float(profile.weight_kg) if profile and profile.weight_kg else None,
            activity_level=profile.activity_level if profile else "moderate",
            timezone_str=user_tz,
        )

        # Measurements
        db_measurements = (
            db.query(Measurement)
            .filter(Measurement.user_id == user_id, Measurement.weight_kg.isnot(None))
            .order_by(Measurement.measured_at.asc(), Measurement.created_at.asc())
            .all()
        )
        measurement_records: List[MeasurementRecord] = []
        for m in db_measurements:
            m_date = extract_date(m.measured_at, user_tz)
            if m_date and m.weight_kg:
                measurement_records.append(
                    MeasurementRecord(
                        measured_date=m_date,
                        weight_kg=float(m.weight_kg),
                    )
                )

        # Nutrition Logs (Aggregated by user-local calendar day)
        db_meals = (
            db.query(MealLog)
            .filter(MealLog.user_id == user_id)
            .order_by(MealLog.logged_at.asc())
            .all()
        )
        daily_cals: Dict[date, float] = {}
        daily_prot: Dict[date, float] = {}
        daily_carbs: Dict[date, float] = {}
        daily_fat: Dict[date, float] = {}

        for meal in db_meals:
            local_date = extract_date(meal.logged_at, user_tz)
            if not local_date:
                continue

            for item in meal.items:
                cals = float(item.calculated_calories or 0.0)
                prot = float(item.calculated_protein or 0.0)
                carbs = float(item.calculated_carbs or 0.0)
                fat = float(item.calculated_fat or 0.0)

                daily_cals[local_date] = daily_cals.get(local_date, 0.0) + cals
                daily_prot[local_date] = daily_prot.get(local_date, 0.0) + prot
                daily_carbs[local_date] = daily_carbs.get(local_date, 0.0) + carbs
                daily_fat[local_date] = daily_fat.get(local_date, 0.0) + fat

        nutrition_records: List[DailyNutritionRecord] = [
            DailyNutritionRecord(
                log_date=d,
                calories=round(daily_cals[d], 1),
                protein_g=round(daily_prot[d], 1),
                carbs_g=round(daily_carbs.get(d, 0.0), 1),
                fat_g=round(daily_fat.get(d, 0.0), 1),
            )
            for d in sorted(daily_cals.keys())
        ]

        # Target Calories from active goal if set
        active_goal = (
            db.query(Goal)
            .filter(Goal.user_id == user_id, Goal.is_active.is_(True))
            .first()
        )
        target_cals: Optional[float] = None
        # In FitMind, nutrition target can be computed or retrieved from nutrition service
        # Fall back to None so FeatureExtractor derives it from Mifflin-St Jeor TDEE

        return NormalizedSubjectData(
            demographics=demographics,
            measurements=measurement_records,
            nutrition_logs=nutrition_records,
            target_calories=target_cals,
        )


class DictRecordAdapter:
    """
    Adapter for converting raw dictionary / JSON structures (e.g. test fixtures,
    synthetic cohorts, or external exported files) into NormalizedSubjectData.
    """

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> NormalizedSubjectData:
        """Parses a dictionary into NormalizedSubjectData."""
        demo_dict = data.get("demographics", {})
        dob = demo_dict.get("date_of_birth")
        if isinstance(dob, str):
            dob = date.fromisoformat(dob)

        demographics = SubjectDemographics(
            subject_id=str(demo_dict.get("subject_id", "subject_01")),
            date_of_birth=dob,
            age=demo_dict.get("age"),
            gender=demo_dict.get("gender"),
            height_cm=float(demo_dict["height_cm"]) if demo_dict.get("height_cm") is not None else None,
            baseline_profile_weight_kg=(
                float(demo_dict["baseline_profile_weight_kg"])
                if demo_dict.get("baseline_profile_weight_kg") is not None
                else None
            ),
            activity_level=demo_dict.get("activity_level", "moderate"),
            timezone_str=demo_dict.get("timezone_str", "UTC"),
        )

        measurements: List[MeasurementRecord] = []
        for m in data.get("measurements", []):
            m_date = m["measured_date"]
            if isinstance(m_date, str):
                m_date = date.fromisoformat(m_date)
            measurements.append(
                MeasurementRecord(
                    measured_date=m_date,
                    weight_kg=float(m["weight_kg"]),
                )
            )

        nutrition_logs: List[DailyNutritionRecord] = []
        for n in data.get("nutrition_logs", []):
            n_date = n["log_date"]
            if isinstance(n_date, str):
                n_date = date.fromisoformat(n_date)
            nutrition_logs.append(
                DailyNutritionRecord(
                    log_date=n_date,
                    calories=float(n["calories"]),
                    protein_g=float(n.get("protein_g", 0.0)),
                    carbs_g=float(n["carbs_g"]) if n.get("carbs_g") is not None else None,
                    fat_g=float(n["fat_g"]) if n.get("fat_g") is not None else None,
                )
            )

        target_cals = (
            float(data["target_calories"])
            if data.get("target_calories") is not None
            else None
        )

        return NormalizedSubjectData(
            demographics=demographics,
            measurements=measurements,
            nutrition_logs=nutrition_logs,
            target_calories=target_cals,
        )
