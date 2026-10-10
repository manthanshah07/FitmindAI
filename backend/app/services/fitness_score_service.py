import uuid
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from app.models.user import User
from app.models.workout import WorkoutLog, WorkoutPlan, WorkoutLogExercise
from app.models.nutrition import MealLog, MealLogItem
from app.models.progress import Measurement
from app.models.fitness_score import FitnessScore
from app.schemas.fitness_score import FitnessScoreItem, FitnessScoreResponse
from app.services.nutrition_service import NutritionService
from app.services.metrics_service import (
    calculate_calorie_adherence,
    calculate_protein_adherence,
    calculate_weekly_workout_adherence,
    get_planned_sets_for_day,
    calculate_logging_consistency,
)
from app.core.timezone_utils import (
    extract_date,
    get_timezone_aware_range,
    get_user_today_date,
)

FORMULA_VERSION = 2


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
        Pure, side-effect free calculation of fitness score (Formula V2) for target_date.
        Weights:
        - Workouts: 35% (based on work-done adherence: completed vs planned sets)
        - Calories: 25% (caloric adherence vs target)
        - Protein: 20% (protein adherence vs target)
        - Logging Consistency: 20% (active tracking days / 7)
        - Recovery: 0% (zero invented data)
        Sum = 100%.
        Does NOT execute db.commit(), db.add(), or mutate persistent database state.
        """
        user_tz = user.profile.timezone if (user and user.profile and user.profile.timezone) else "UTC"
        period_end = target_date or get_user_today_date(user_tz)
        period_start = period_end - timedelta(days=6)

        start_dt, end_dt = get_timezone_aware_range(period_start, period_end, user_tz)

        # -------------------------------------------------------------
        # A. WORKOUT ADHERENCE (35%) — Work Done (Fixes D4)
        # -------------------------------------------------------------
        period_workout_logs = (
            db.query(WorkoutLog)
            .options(
                joinedload(WorkoutLog.logged_exercises),
                joinedload(WorkoutLog.plan).joinedload(WorkoutPlan.plan_exercises),
            )
            .filter(
                WorkoutLog.user_id == user.id,
                WorkoutLog.started_at >= start_dt,
                WorkoutLog.started_at <= end_dt,
            )
            .all()
        )

        active_plan = (
            db.query(WorkoutPlan)
            .options(joinedload(WorkoutPlan.plan_exercises))
            .filter(WorkoutPlan.user_id == user.id, WorkoutPlan.is_active == True)
            .first()
        )
        target_days = (
            active_plan.days_per_week
            if (active_plan and active_plan.days_per_week and active_plan.days_per_week > 0)
            else (user.profile.target_workout_days_per_week if (user and user.profile and user.profile.target_workout_days_per_week) else 4)
        )

        workout_dates = set()
        session_data: List[Tuple[int, int]] = []

        for log in period_workout_logs:
            d = extract_date(log.started_at, user_tz)
            if d:
                workout_dates.add(d)

            # Count completed sets (WorkoutLogExercise rows for this session)
            completed_sets = len(log.logged_exercises) if log.logged_exercises else 0
            plan_for_log = log.plan or active_plan
            planned_sets = get_planned_sets_for_day(plan_for_log, session_date=d)
            session_data.append((completed_sets, planned_sets))

        workout_adherence_pct, total_sets_completed, total_sets_planned = calculate_weekly_workout_adherence(
            session_data=session_data,
            target_days_per_week=target_days,
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
            m_date = extract_date(meal.logged_at, user_tz)
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
            daily_scores = [
                calculate_calorie_adherence(daily_cals[d], target_cals, as_percentage=True)
                for d in meal_dates
            ]
            valid_scores = [s for s in daily_scores if s is not None]
            nutrition_score = (
                sum(valid_scores) / float(len(valid_scores)) if valid_scores else 50.0
            )
            avg_protein = sum(daily_protein.values()) / float(len(meal_dates))
            protein_score = calculate_protein_adherence(avg_protein, target_protein)

        # -------------------------------------------------------------
        # D. LOGGING CONSISTENCY (20%) (Zero Invented Recovery Data)
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
        consistency_score = calculate_logging_consistency(active_logging_days, total_days=7)

        # Formula V2 Weights: 35% Workouts + 25% Calories + 20% Protein + 20% Consistency = 100%
        weighted_score = (
            (0.35 * workout_adherence_pct)
            + (0.25 * nutrition_score)
            + (0.20 * protein_score)
            + (0.20 * consistency_score)
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
            sleep_score=None,
            recovery_score=None,
            consistency_score=round(consistency_score, 2),
            formula_version=FORMULA_VERSION,
            sets_completed=total_sets_completed,
            sets_planned=total_sets_planned,
            calculated_at=calc_at,
        )

    @staticmethod
    def calculate_and_save_fitness_score(
        db: Session, user: User, target_date: Optional[date] = None
    ) -> FitnessScoreItem:
        """
        Explicit write/sync path: calculates fitness score AND persists/commits snapshot to database.
        Ensures at most one snapshot per user per day.
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
        score_record.sleep_score = None
        score_record.recovery_score = None
        score_record.consistency_score = item.consistency_score
        score_record.formula_version = FORMULA_VERSION
        score_record.calculated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(score_record)

        res = FitnessScoreItem.model_validate(score_record)
        res.sets_completed = item.sets_completed
        res.sets_planned = item.sets_planned
        return res

    @staticmethod
    def get_fitness_score_summary(
        db: Session, user: User, target_date: Optional[date] = None
    ) -> FitnessScoreResponse:
        """
        Read endpoint path: calculates current period score, automatically snapshots on read
        for target_date (at most once per day), and returns history.
        """
        user_tz = user.profile.timezone if (user and user.profile and user.profile.timezone) else "UTC"
        p_end = target_date or get_user_today_date(user_tz)

        # Snapshot on read
        current_item = FitnessScoreService.calculate_and_save_fitness_score(db, user, target_date=p_end)

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
