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
    ChatMessageContext,
    AIMemoryContext,
    GroundedFactsContext,
)
from app.models.chat_message import ChatMessage as ChatMessageModel
from app.services.fitness_score_service import FitnessScoreService
from app.services.nutrition_service import NutritionService
from app.services.analytics_service import AnalyticsService
from app.services.ai_memory_service import AIMemoryService
from app.core.timezone_utils import (
    extract_date,
    get_timezone_aware_range,
    get_user_today_date,
)
from app.core.weight import get_current_weight


logger = logging.getLogger(__name__)



class ContextBuilder:
    """
    Dedicated fitness context retrieval service.
    Assembles a structured, user-isolated snapshot of the user's FitMind data
    (Profile, Active Goal, Recent Workouts, Daily Nutrition, Body Measurements, Fitness Score,
    Active AI Memories, and Bounded Recent Chat History)
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
        current_weight = get_current_weight(db, user)
        profile_ctx: Optional[ProfileContext] = None
        if profile:
            profile_ctx = ProfileContext(
                full_name=profile.full_name,
                height_cm=float(profile.height_cm) if profile.height_cm is not None else None,
                weight_kg=current_weight,
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

        user_tz = profile.timezone if (profile and profile.timezone) else "UTC"
        today_date = get_user_today_date(user_tz)

        # 3. Recent Workouts Context (Bounded to last `workout_days` days)
        workout_start_date = today_date - timedelta(days=workout_days)
        workout_cutoff_dt, _ = get_timezone_aware_range(workout_start_date, today_date, user_tz)


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
            log_date = extract_date(log.started_at, user_tz)
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
        nutrition_cutoff_date = today_date - timedelta(days=nutrition_days - 1)
        nutrition_cutoff_dt, _ = get_timezone_aware_range(nutrition_cutoff_date, today_date, user_tz)


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
            m_date = extract_date(meal.logged_at, user_tz)
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
                    calories_kcal=int(round(totals["calories"])),
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

        # 8. Active AI Memories
        active_memories_ctx: List[AIMemoryContext] = []
        try:
            memories = AIMemoryService.get_active_memories(db, user)
            for mem in memories:
                active_memories_ctx.append(
                    AIMemoryContext(
                        key=mem.key,
                        value=mem.value,
                        memory_type=mem.memory_type,
                    )
                )
        except Exception as e:
            logger.warning("Could not fetch active AI memories for context: %s", e)

        # 9. Recent Chat History Context (Bounded to last 10 messages)
        recent_chat_ctx: List[ChatMessageContext] = []
        try:
            raw_chats = (
                db.query(ChatMessageModel)
                .filter(ChatMessageModel.user_id == user.id)
                .order_by(ChatMessageModel.created_at.desc())
                .limit(10)
                .all()
            )
            for chat in reversed(raw_chats):
                text_content = chat.content or ""
                if not text_content and chat.response_json and isinstance(chat.response_json, dict):
                    text_content = chat.response_json.get("answer", "")
                if text_content:
                    recent_chat_ctx.append(
                        ChatMessageContext(
                            role=chat.role,
                            content=text_content,
                        )
                    )
        except Exception as e:
            logger.warning("Could not fetch recent chat history for context: %s", e)

        # 10. Explicit Grounded Facts Block (fixes D11, Decision 12)
        missing_data_flags: List[str] = []

        # Weigh-ins check
        has_measurements = len(measurements) > 0
        if not has_measurements:
            missing_data_flags.append("insufficient logging data: no body-weight measurements recorded")

        # Meal logs 7d & 28d calculation
        nutrition_28d_cutoff_date = today_date - timedelta(days=27)
        nutrition_28d_cutoff_dt, _ = get_timezone_aware_range(nutrition_28d_cutoff_date, today_date, user_tz)

        meal_logs_28d = (
            db.query(MealLog)
            .options(joinedload(MealLog.items))
            .filter(
                MealLog.user_id == user.id,
                MealLog.logged_at >= nutrition_28d_cutoff_dt,
            )
            .all()
        )
        daily_cals_28d: Dict[date, float] = {}
        daily_prot_28d: Dict[date, float] = {}
        for ml in meal_logs_28d:
            m_dt = extract_date(ml.logged_at, user_tz)
            if m_dt:
                if m_dt not in daily_cals_28d:
                    daily_cals_28d[m_dt] = 0.0
                    daily_prot_28d[m_dt] = 0.0
                for item in ml.items or []:
                    daily_cals_28d[m_dt] += float(item.calculated_calories or 0)
                    daily_prot_28d[m_dt] += float(item.calculated_protein or 0)

        logged_days_7d = len(daily_totals)
        if logged_days_7d == 0:
            missing_data_flags.append("insufficient logging data: no meals or nutrition logged in the last 7 days")

        logged_days_28d = len(daily_cals_28d)

        avg_cals_7d = (
            int(round(sum(daily_totals[d]["calories"] for d in daily_totals) / float(logged_days_7d)))
            if logged_days_7d > 0
            else None
        )
        avg_prot_7d = (
            round(sum(daily_totals[d]["protein"] for d in daily_totals) / float(logged_days_7d), 1)
            if logged_days_7d > 0
            else None
        )

        avg_cals_28d = (
            int(round(sum(daily_cals_28d.values()) / float(logged_days_28d)))
            if logged_days_28d > 0
            else None
        )
        avg_prot_28d = (
            round(sum(daily_prot_28d.values()) / float(logged_days_28d), 1)
            if logged_days_28d > 0
            else None
        )

        # Resolve target calories & target protein consistently with Profile and Forecast active plan
        user_targets = NutritionService.calculate_user_targets(db, user)
        resolved_cals: float = float(user_targets.calories)
        resolved_prot: float = float(user_targets.protein_g)

        profile_target_cals = getattr(profile, "target_calories", None) if profile else None
        profile_target_prot = getattr(profile, "target_protein_g", None) if profile else None

        if profile_target_cals is not None or profile_target_prot is not None:
            if profile_target_cals is not None:
                resolved_cals = float(profile_target_cals)
            if profile_target_prot is not None:
                resolved_prot = float(profile_target_prot)
        elif active_goal and has_measurements:
            try:
                from app.schemas.intelligence import PlanOptimizationRequest
                from app.services.intelligence.optimizer_service import PlanOptimizerService

                opt_res = PlanOptimizerService.optimize_plan(
                    db=db,
                    user=user,
                    request=PlanOptimizationRequest(
                        max_calorie_adjustment=400.0,
                        prefer_higher_protein=True,
                    ),
                )
                if opt_res and opt_res.best_candidate:
                    resolved_cals = float(opt_res.best_candidate.daily_calories)
                    resolved_prot = float(opt_res.best_candidate.daily_protein_g)
            except Exception as opt_err:
                logger.debug("Using fallback nutrition targets in ContextBuilder: %s", opt_err)

        target_calories_val = int(round(resolved_cals))
        target_protein_val = int(round(resolved_prot))

        # Keep analytics.nutrition_trends aligned and cleanly rounded
        if analytics_ctx and analytics_ctx.nutrition_trends:
            nt = analytics_ctx.nutrition_trends
            nt.target_calories = float(target_calories_val)
            nt.target_protein_g = float(target_protein_val)
            if nt.avg_daily_calories_on_logged_days is not None:
                nt.avg_daily_calories_on_logged_days = float(int(round(nt.avg_daily_calories_on_logged_days)))
            if nt.avg_daily_protein_g_on_logged_days is not None:
                nt.avg_daily_protein_g_on_logged_days = round(nt.avg_daily_protein_g_on_logged_days, 1)

        # Precompute protein range: 1.6 to 2.2 g/kg multiplied by current weight
        if current_weight and current_weight > 0:
            p_min = round(1.6 * current_weight, 1)
            p_max = round(2.2 * current_weight, 1)
            rec_protein_str = (
                f"{int(round(p_min))}g - {int(round(p_max))}g for your current {round(current_weight, 1)} kg "
                f"(1.6 to 2.2 g/kg)"
            )
        else:
            rec_protein_str = "1.6 to 2.2 g/kg (record body weight to calculate total grams)"

        # Recent workout history: last 3-5 sessions with exercise names and set counts
        recent_workout_summaries: List[str] = []
        for w_log in workout_logs[:5]:
            w_date = extract_date(w_log.started_at, user_tz)
            date_label = w_date.isoformat() if w_date else str(w_log.started_at)
            exercise_counts: Dict[str, int] = {}
            for le in w_log.logged_exercises or []:
                ex_name = le.exercise.name if le.exercise else "Exercise"
                exercise_counts[ex_name] = exercise_counts.get(ex_name, 0) + 1
            ex_details = [f"{name} ({sets} sets)" for name, sets in exercise_counts.items()]
            summary_str = f"{date_label}: " + (", ".join(ex_details) if ex_details else "session logged")
            recent_workout_summaries.append(summary_str)

        if not workout_logs:
            missing_data_flags.append("insufficient logging data: no resistance workouts logged")

        grounded_facts = GroundedFactsContext(
            current_weight_kg=round(current_weight, 1) if current_weight is not None else None,
            active_goal_type=active_goal.goal_type if active_goal else None,
            target_weight_kg=round(float(active_goal.target_weight_kg), 1) if (active_goal and active_goal.target_weight_kg) else None,
            target_date=active_goal.target_date.isoformat() if (active_goal and active_goal.target_date) else None,
            target_calories=target_calories_val,
            target_protein_g=target_protein_val,
            avg_calories_7d=avg_cals_7d,
            avg_protein_7d=avg_prot_7d,
            logged_days_7d=logged_days_7d,
            avg_calories_28d=avg_cals_28d,
            avg_protein_28d=avg_prot_28d,
            logged_days_28d=logged_days_28d,
            recommended_protein_range_str=rec_protein_str,
            recent_workout_summaries=recent_workout_summaries,
            missing_data_flags=missing_data_flags,
        )

        return FitnessContext(
            profile=profile_ctx,
            active_goal=goal_ctx,
            grounded_facts=grounded_facts,
            recent_workouts=workout_contexts,
            recent_nutrition=nutrition_contexts,
            recent_measurements=measurement_contexts,
            fitness_score=score_ctx,
            analytics=analytics_ctx,
            recent_chat_history=recent_chat_ctx,
            active_memories=active_memories_ctx,
        )


