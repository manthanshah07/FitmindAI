from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.workout import WorkoutLog, WorkoutPlan
from app.models.nutrition import MealLog, MealLogItem
from app.models.progress import Measurement
from app.models.fitness_score import FitnessScore
from app.schemas.fitness_score import FitnessScoreItem, FitnessScoreResponse
from app.services.nutrition_service import NutritionService


def extract_date(val) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        return date.fromisoformat(val.split("T")[0].split(" ")[0])
    return None


def get_score_label(score: int) -> str:
    if score >= 85:
        return "Excellent"
    elif score >= 70:
        return "Good"
    elif score >= 50:
        return "Fair"
    else:
        return "Needs Work"


class FitnessScoreService:
    @staticmethod
    def calculate_and_save_fitness_score(
        db: Session, user: User, target_date: Optional[date] = None
    ) -> FitnessScoreItem:
        period_end = target_date or date.today()
        period_start = period_end - timedelta(days=6)

        # -------------------------------------------------------------
        # A. WORKOUT ADHERENCE (30%)
        # -------------------------------------------------------------
        all_workout_logs = (
            db.query(WorkoutLog)
            .filter(WorkoutLog.user_id == user.id)
            .all()
        )
        workout_dates = set()
        for log in all_workout_logs:
            d = extract_date(log.started_at)
            if d and period_start <= d <= period_end:
                workout_dates.add(d)

        completed_workout_days = len(workout_dates)

        active_plan = (
            db.query(WorkoutPlan)
            .filter(WorkoutPlan.user_id == user.id, WorkoutPlan.is_active == True)
            .first()
        )
        target_days = (
            active_plan.days_per_week
            if (active_plan and active_plan.days_per_week and active_plan.days_per_week > 0)
            else 4
        )

        workout_adherence_pct = min(
            100.0, (completed_workout_days / float(max(1, target_days))) * 100.0
        )

        # -------------------------------------------------------------
        # B & C. NUTRITION & PROTEIN ADHERENCE (25% + 20%)
        # -------------------------------------------------------------
        user_targets = NutritionService.calculate_user_targets(db, user)
        target_cals = max(1.0, float(user_targets.calories))
        target_protein = max(1.0, float(user_targets.protein_g))

        all_meal_logs = (
            db.query(MealLog)
            .filter(MealLog.user_id == user.id)
            .all()
        )

        # Aggregate daily cals and protein for meals in period
        daily_cals = {}
        daily_protein = {}
        for meal in all_meal_logs:
            m_date = extract_date(meal.logged_at)
            if m_date and period_start <= m_date <= period_end:
                if m_date not in daily_cals:
                    daily_cals[m_date] = 0.0
                    daily_protein[m_date] = 0.0

                for item in meal.items:
                    daily_cals[m_date] += float(item.calculated_calories)
                    daily_protein[m_date] += float(item.calculated_protein)

        meal_dates = set(daily_cals.keys())

        if not meal_dates:
            nutrition_score = 50.0
            protein_score = 50.0
        else:
            # Nutrition score based on average calorie variance across meal-logged days
            variances = [
                abs(daily_cals[d] - target_cals) / target_cals
                for d in meal_dates
            ]
            avg_variance = sum(variances) / float(len(variances))
            nutrition_score = max(0.0, min(100.0, (1.0 - avg_variance) * 100.0))

            # Protein score based on average daily protein consumed vs target
            avg_protein = sum(daily_protein.values()) / float(len(meal_dates))
            protein_score = min(100.0, (avg_protein / target_protein) * 100.0)

        # -------------------------------------------------------------
        # D. LOGGING CONSISTENCY (15%)
        # -------------------------------------------------------------
        all_measurements = (
            db.query(Measurement)
            .filter(Measurement.user_id == user.id)
            .all()
        )
        measurement_dates = set()
        for m in all_measurements:
            d = extract_date(m.measured_at)
            if d and period_start <= d <= period_end:
                measurement_dates.add(d)

        active_logging_dates = workout_dates | meal_dates | measurement_dates
        active_logging_days = len(active_logging_dates)
        consistency_score = (active_logging_days / 7.0) * 100.0

        # -------------------------------------------------------------
        # E. RECOVERY & SLEEP (10%) - Fixed Constraint 75.0
        # -------------------------------------------------------------
        sleep_score = 75.0
        recovery_score = 75.0

        # -------------------------------------------------------------
        # F. TOTAL SCORE & CLAMPING
        # -------------------------------------------------------------
        weighted_score = (
            (0.30 * workout_adherence_pct)
            + (0.25 * nutrition_score)
            + (0.20 * protein_score)
            + (0.15 * consistency_score)
            + (0.10 * recovery_score)
        )
        total_score = max(0, min(100, int(round(weighted_score))))

        # -------------------------------------------------------------
        # G. UPSERT PERSISTENCE
        # -------------------------------------------------------------
        score_record = (
            db.query(FitnessScore)
            .filter(
                FitnessScore.user_id == user.id,
                FitnessScore.period_start == period_start,
                FitnessScore.period_end == period_end,
            )
            .first()
        )

        if not score_record:
            score_record = FitnessScore(
                user_id=user.id,
                period_start=period_start,
                period_end=period_end,
            )
            db.add(score_record)

        score_record.score = total_score
        score_record.workout_adherence_pct = round(workout_adherence_pct, 2)
        score_record.nutrition_score = round(nutrition_score, 2)
        score_record.protein_score = round(protein_score, 2)
        score_record.sleep_score = round(sleep_score, 2)
        score_record.recovery_score = round(recovery_score, 2)
        score_record.consistency_score = round(consistency_score, 2)
        score_record.calculated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(score_record)
        return FitnessScoreItem.model_validate(score_record)

    @staticmethod
    def get_fitness_score_summary(
        db: Session, user: User, target_date: Optional[date] = None
    ) -> FitnessScoreResponse:
        p_end = target_date or date.today()
        p_start = p_end - timedelta(days=6)

        # Check if score exists for current period; if not, calculate and save
        current_record = (
            db.query(FitnessScore)
            .filter(
                FitnessScore.user_id == user.id,
                FitnessScore.period_start == p_start,
                FitnessScore.period_end == p_end,
            )
            .first()
        )

        if not current_record:
            current_item = FitnessScoreService.calculate_and_save_fitness_score(db, user, target_date=p_end)
        else:
            current_item = FitnessScoreItem.model_validate(current_record)

        # Fetch score history sorted desc
        history_records = (
            db.query(FitnessScore)
            .filter(FitnessScore.user_id == user.id)
            .order_by(FitnessScore.period_end.desc(), FitnessScore.calculated_at.desc())
            .limit(20)
            .all()
        )
        history_items = [FitnessScoreItem.model_validate(r) for r in history_records]

        label = get_score_label(current_item.score)

        return FitnessScoreResponse(
            current_score=current_item,
            score_label=label,
            history=history_items,
        )
