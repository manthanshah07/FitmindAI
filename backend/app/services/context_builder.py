import logging
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.workout import WorkoutLog, WorkoutLogExercise
from app.models.nutrition import MealLog, MealLogItem
from app.models.progress import Measurement
from app.schemas.fitness_context import (
    FitnessContext,
    ProfileContext,
    GoalContext,
    WorkoutLogContext,
    LoggedExerciseContext,
    ExerciseSetContext,
    DailyNutritionContext,
    MeasurementContext,
    FitnessScoreComponentContext,
)
from app.services.fitness_score_service import FitnessScoreService

from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)


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


class ContextBuilder:
    """
    Dedicated fitness context retrieval service.
    Assembles a structured, user-isolated snapshot of the user's FitMind data
    (Profile, Active Goal, Recent Workouts, Daily Nutrition, Body Measurements, Fitness Score)
    within bounded date ranges for AI prompt construction.
    """

    @staticmethod
    def build_fitness_context(
        db: Session,
        user: User,
        workout_days: int = 30,
        nutrition_days: int = 7,
        measurement_days: int = 90,
    ) -> FitnessContext:
        # 1. Profile Context (EXCLUDES medical_notes for privacy)
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        profile_ctx: Optional[ProfileContext] = None
        if profile:
            profile_ctx = ProfileContext(
                full_name=profile.full_name,
                height_cm=float(profile.height_cm) if profile.height_cm is not None else None,
                weight_kg=float(profile.weight_kg) if profile.weight_kg is not None else None,
                activity_level=profile.activity_level,
                diet_preference=profile.diet_preference,
                equipment=profile.equipment,
            )

        # 2. Active Goal Context
        active_goal = (
            db.query(Goal)
            .filter(Goal.user_id == user.id, Goal.is_active == True)
            .first()
        )
        goal_ctx: Optional[GoalContext] = None
        if active_goal:
            goal_ctx = GoalContext(
                primary_goal=active_goal.goal_type,
                target_weight_kg=float(active_goal.target_weight_kg) if active_goal.target_weight_kg is not None else None,
                target_date=active_goal.target_date,
            )

        # 3. Recent Workouts Context (Bounded to last `workout_days` days)
        workout_cutoff_dt = datetime.combine(
            date.today() - timedelta(days=workout_days), datetime.min.time()
        ).replace(tzinfo=timezone.utc)

        workout_logs = (
            db.query(WorkoutLog)
            .options(
                joinedload(WorkoutLog.logged_exercises).joinedload(WorkoutLogExercise.exercise),
                joinedload(WorkoutLog.plan),
            )
            .filter(
                WorkoutLog.user_id == user.id,
                WorkoutLog.started_at >= workout_cutoff_dt,
            )
            .order_by(WorkoutLog.started_at.desc())
            .all()
        )

        workout_contexts: List[WorkoutLogContext] = []
        for log in workout_logs:
            log_date = extract_date(log.started_at)
            date_str = log_date.isoformat() if log_date else str(log.started_at)
            plan_name = log.plan.name if log.plan else None

            # Group sets by exercise name
            exercises_map: Dict[str, List[ExerciseSetContext]] = {}
            for item in log.logged_exercises or []:
                ex_name = item.exercise.name if item.exercise else "Exercise"
                set_ctx = ExerciseSetContext(
                    set_number=item.set_number,
                    reps_completed=item.reps_completed,
                    weight_kg=float(item.weight_kg) if item.weight_kg is not None else None,
                    rpe=item.rpe,
                )
                if ex_name not in exercises_map:
                    exercises_map[ex_name] = []
                exercises_map[ex_name].append(set_ctx)

            exercise_contexts = [
                LoggedExerciseContext(exercise_name=ex_name, sets=sets_list)
                for ex_name, sets_list in exercises_map.items()
            ]

            workout_contexts.append(
                WorkoutLogContext(
                    date=date_str,
                    plan_name=plan_name,
                    exercises=exercise_contexts,
                )
            )

        # 4. Recent Nutrition Context (Bounded to last `nutrition_days` days, daily totals)
        nutrition_cutoff_date = date.today() - timedelta(days=nutrition_days - 1)
        nutrition_cutoff_dt = datetime.combine(
            nutrition_cutoff_date, datetime.min.time()
        ).replace(tzinfo=timezone.utc)

        meal_logs = (
            db.query(MealLog)
            .options(joinedload(MealLog.items))
            .filter(
                MealLog.user_id == user.id,
                MealLog.logged_at >= nutrition_cutoff_dt,
            )
            .order_by(MealLog.logged_at.asc())
            .all()
        )

        daily_totals: Dict[date, Dict[str, float]] = {}
        for meal in meal_logs:
            m_date = extract_date(meal.logged_at)
            if not m_date:
                continue
            if m_date not in daily_totals:
                daily_totals[m_date] = {
                    "calories": 0.0,
                    "protein": 0.0,
                    "carbs": 0.0,
                    "fat": 0.0,
                }
            for item in meal.items or []:
                daily_totals[m_date]["calories"] += float(item.calculated_calories or 0)
                daily_totals[m_date]["protein"] += float(item.calculated_protein or 0)
                daily_totals[m_date]["carbs"] += float(item.calculated_carbs or 0)
                daily_totals[m_date]["fat"] += float(item.calculated_fat or 0)

        nutrition_contexts: List[DailyNutritionContext] = []
        for d in sorted(daily_totals.keys()):
            totals = daily_totals[d]
            nutrition_contexts.append(
                DailyNutritionContext(
                    date=d.isoformat(),
                    calories_kcal=round(totals["calories"], 1),
                    protein_g=round(totals["protein"], 1),
                    carbs_g=round(totals["carbs"], 1),
                    fat_g=round(totals["fat"], 1),
                )
            )

        # 5. Recent Body Measurements Context (Bounded to last `measurement_days` days)
        measurement_cutoff_date = date.today() - timedelta(days=measurement_days)
        measurements = (
            db.query(Measurement)
            .filter(
                Measurement.user_id == user.id,
                Measurement.measured_at >= measurement_cutoff_date,
            )
            .order_by(Measurement.measured_at.desc())
            .all()
        )

        measurement_contexts: List[MeasurementContext] = []
        for m in measurements:
            m_date = extract_date(m.measured_at)
            m_date_str = m_date.isoformat() if m_date else str(m.measured_at)
            measurement_contexts.append(
                MeasurementContext(
                    date=m_date_str,
                    weight_kg=float(m.weight_kg) if m.weight_kg is not None else None,
                    chest_cm=float(m.chest_cm) if m.chest_cm is not None else None,
                    waist_cm=float(m.waist_cm) if m.waist_cm is not None else None,
                    hips_cm=float(m.hips_cm) if m.hips_cm is not None else None,
                    bicep_cm=float(m.bicep_cm) if m.bicep_cm is not None else None,
                    thigh_cm=float(m.thigh_cm) if m.thigh_cm is not None else None,
                    body_fat_pct=float(m.body_fat_pct) if m.body_fat_pct is not None else None,
                )
            )

        # 6. Fitness Score Context
        score_ctx: Optional[FitnessScoreComponentContext] = None
        try:
            summary = FitnessScoreService.get_fitness_score_summary(db, user)
            if summary and summary.current_score:
                cs = summary.current_score
                score_ctx = FitnessScoreComponentContext(
                    score=cs.score,
                    score_label=summary.score_label,
                    workout_adherence_pct=float(cs.workout_adherence_pct) if cs.workout_adherence_pct is not None else None,
                    nutrition_score=float(cs.nutrition_score) if cs.nutrition_score is not None else None,
                    protein_score=float(cs.protein_score) if cs.protein_score is not None else None,
                    consistency_score=float(cs.consistency_score) if cs.consistency_score is not None else None,
                )
        except Exception as e:
            logger.warning("Could not calculate fitness score summary for context: %s", e)

        # 7. Deterministic Analytics Context
        analytics_ctx = None
        try:
            analytics_ctx = AnalyticsService.calculate_analytics(
                db, user, timeframe_days=measurement_days
            )
        except Exception as e:
            logger.warning("Could not calculate fitness analytics for context: %s", e)

        return FitnessContext(
            profile=profile_ctx,
            active_goal=goal_ctx,
            recent_workouts=workout_contexts,
            recent_nutrition=nutrition_contexts,
            recent_measurements=measurement_contexts,
            fitness_score=score_ctx,
            analytics=analytics_ctx,
        )
