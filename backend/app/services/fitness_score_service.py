import uuid
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
from app.core.timezone_utils import (
    extract_date,
    get_timezone_aware_range,
    get_user_today_date,
)

# Neutral baseline score (0-100 scale) applied for sleep & recovery when direct log data is unavailable.
DEFAULT_SLEEP_SCORE_FALLBACK = 75.0
DEFAULT_RECOVERY_SCORE_FALLBACK = 75.0


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
    def calculate_fitness_score(
        db: Session, user: User, target_date: Optional[date] = None
    ) -> FitnessScoreItem:
        """
        Pure, side-effect free calculation of fitness score for target_date.
        Does NOT execute db.commit(), db.add(), or mutate persistent database state.
        """
        user_tz = user.profile.timezone if (user and user.profile and user.profile.timezone) else "UTC"
        period_end = target_date or get_user_today_date(user_tz)
        period_start = period_end - timedelta(days=6)

        start_dt, end_dt = get_timezone_aware_range(period_start, period_end, user_tz)


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

        # -------------------------------------------------------------
        # B & C. NUTRITION & PROTEIN ADHERENCE (25% + 20%)
        # -------------------------------------------------------------
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

        daily_cals = {}
        daily_protein = {}
        for meal in period_meal_logs:
            m_date = extract_date(meal.logged_at)
            if m_date:
                if m_date not in daily_cals:
                    daily_cals[m_date] = 0.0
                    daily_protein[m_date] = 0.0

                for item in meal.items:
                    daily_cals[m_date] += float(item.calculated_calories or 0)
                    daily_protein[m_date] += float(item.calculated_protein or 0)

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
        # D. LOGGING CONSISTENCY (15%) & RECOVERY BASELINE (10%)
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

        sleep_score = DEFAULT_SLEEP_SCORE_FALLBACK
        recovery_score = DEFAULT_RECOVERY_SCORE_FALLBACK

        weighted_score = (
            (0.30 * workout_adherence_pct)
            + (0.25 * nutrition_score)
            + (0.20 * protein_score)
            + (0.15 * consistency_score)
            + (0.10 * recovery_score)
        )
        total_score = max(0, min(100, int(round(weighted_score))))

        # Check existing DB record ID/timestamps if present (without mutating)
        existing_record = (
            db.query(FitnessScore)
            .filter(
                FitnessScore.user_id == user.id,
                FitnessScore.period_start == period_start,
                FitnessScore.period_end == period_end,
            )
            .first()
        )

        record_id = existing_record.id if existing_record else uuid.uuid4()
        calc_at = existing_record.calculated_at if existing_record else datetime.now(timezone.utc)

        return FitnessScoreItem(
            id=record_id,
            user_id=user.id,
            period_start=period_start,
            period_end=period_end,
            score=total_score,
            workout_adherence_pct=round(workout_adherence_pct, 2),
            nutrition_score=round(nutrition_score, 2),
            protein_score=round(protein_score, 2),
            sleep_score=round(sleep_score, 2),
            recovery_score=round(recovery_score, 2),
            consistency_score=round(consistency_score, 2),
            calculated_at=calc_at,
        )

    @staticmethod
    def calculate_and_save_fitness_score(
        db: Session, user: User, target_date: Optional[date] = None
    ) -> FitnessScoreItem:
        """
        Explicit write/sync path: calculates fitness score AND persists/commits to database.
        """
        item = FitnessScoreService.calculate_fitness_score(db, user, target_date=target_date)

        score_record = (
            db.query(FitnessScore)
            .filter(
                FitnessScore.user_id == user.id,
                FitnessScore.period_start == item.period_start,
                FitnessScore.period_end == item.period_end,
            )
            .first()
        )

        if not score_record:
            score_record = FitnessScore(
                id=item.id,
                user_id=user.id,
                period_start=item.period_start,
                period_end=item.period_end,
            )
            db.add(score_record)

        score_record.score = item.score
        score_record.workout_adherence_pct = item.workout_adherence_pct
        score_record.nutrition_score = item.nutrition_score
        score_record.protein_score = item.protein_score
        score_record.sleep_score = item.sleep_score
        score_record.recovery_score = item.recovery_score
        score_record.consistency_score = item.consistency_score
        score_record.calculated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(score_record)

        return FitnessScoreItem.model_validate(score_record)

    @staticmethod
    def get_fitness_score_summary(
        db: Session, user: User, target_date: Optional[date] = None
    ) -> FitnessScoreResponse:
        """
        Read-only endpoint path: calculates current period score in memory without DB side-effects.
        """
        p_end = target_date or date.today()
        current_item = FitnessScoreService.calculate_fitness_score(db, user, target_date=p_end)

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
