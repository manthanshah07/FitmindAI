from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
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

        start_dt = datetime.combine(period_start, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(period_end, datetime.max.time()).replace(tzinfo=timezone.utc)

        # -------------------------------------------------------------
        # A. WORKOUT ADHERENCE (30%)
        # -------------------------------------------------------------
        period_workout_logs = (
            db.query(WorkoutLog)
            .filter(
                WorkoutLog.user_id == user.id,
                WorkoutLog.started_at >= start_dt,
                WorkoutLog.started_at <= end_dt,
            )
            .all()
        )
        workout_dates = set()
        for log in period_workout_logs:
            d = extract_date(log.started_at)
            if d:
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

        user_targets = NutritionService.calculate_user_targets(db, user)
        target_cals = max(1.0, float(user_targets.calories))
        target_protein = max(1.0, float(user_targets.protein_g))

        period_meal_logs = (
            db.query(MealLog)
            .options(joinedload(MealLog.items))
            .filter(
                MealLog.user_id == user.id,
                MealLog.logged_at >= start_dt,
                MealLog.logged_at <= end_dt,
            )
            .all()
        )

        # Aggregate daily cals and protein for meals in period
        daily_cals = {}
        daily_protein = {}
        for meal in period_meal_logs:
            m_date = extract_date(meal.logged_at)
            if m_date:
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
            variances = [abs(daily_cals[d] - target_cals) / target_cals for d in meal_dates]
            avg_variance = sum(variances) / float(len(variances))
            nutrition_score = max(0.0, min(100.0, (1.0 - avg_variance) * 100.0))
            avg_protein = sum(daily_protein.values()) / float(len(meal_dates))
            protein_score = min(100.0, (avg_protein / target_protein) * 100.0)

        # -------------------------------------------------------------
        # D. LOGGING CONSISTENCY (15%)
        # -------------------------------------------------------------
        period_measurements = (
            db.query(Measurement)
            .filter(
                Measurement.user_id == user.id,
                Measurement.measured_at >= period_start,
                Measurement.measured_at <= period_end,
            )
            .all()
        )
        measurement_dates = set()
        for m in period_measurements:
            d = extract_date(m.measured_at)
            if d:
                measurement_dates.add(d)

        active_logging_days = len(workout_dates | meal_dates | measurement_dates)
        consistency_score = (active_logging_days / 7.0) * 100.0

        # These inputs are not collected by the current product yet. Keeping them
        # as explicit defaults is preferable to pretending they are measured.
        sleep_score = 75.0
        recovery_score = 75.0

        weighted_score = (
            (0.30 * workout_adherence_pct)
            + (0.25 * nutrition_score)
            + (0.20 * protein_score)
            + (0.15 * consistency_score)
            + (0.10 * recovery_score)
        )
        total_score = max(0, min(100, int(round(weighted_score))))

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
            is_new = True
        else:
            is_new = False

        is_changed = (
            is_new
            or score_record.score != total_score
            or float(score_record.workout_adherence_pct or 0) != round(workout_adherence_pct, 2)
            or float(score_record.nutrition_score or 0) != round(nutrition_score, 2)
            or float(score_record.protein_score or 0) != round(protein_score, 2)
            or float(score_record.sleep_score or 0) != round(sleep_score, 2)
            or float(score_record.recovery_score or 0) != round(recovery_score, 2)
            or float(score_record.consistency_score or 0) != round(consistency_score, 2)
        )

        if is_changed:
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

        # Recalculate the current seven-day period on every read. The score is
        # derived from mutable workout/nutrition/progress data, so returning an
        # existing row unchanged would make the dashboard stale after new logs.
        current_item = FitnessScoreService.calculate_and_save_fitness_score(
            db, user, target_date=p_end
        )

        # Fetch score history sorted desc
        history_records = (
            db.query(FitnessScore)
            .filter(FitnessScore.user_id == user.id)
            .order_by(FitnessScore.period_end.desc(), FitnessScore.calculated_at.desc())
            .limit(20)
            .all()
        )
        history_items = [FitnessScoreItem.model_validate(r) for r in history_records]

        return FitnessScoreResponse(
            current_score=current_item,
            score_label=get_score_label(current_item.score),
            history=history_items,
        )
