from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.workout import WorkoutPlan
from app.models.nutrition import MealLog, MealLogItem
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    DashboardGoalSection,
    DashboardWorkoutPlanSection,
    DashboardTodayNutritionSection,
    DashboardWeeklySummarySection,
)
from app.core.calculations import calculate_tdee
from app.services.nutrition_service import NutritionService
from app.services.report_service import ReportService
from app.core.timezone_utils import get_timezone_aware_range, get_user_today_date



class DashboardService:
    @staticmethod
    def get_dashboard_summary(
        db: Session,
        user: User,
        target_date: Optional[date] = None,
    ) -> DashboardSummaryResponse:
        # 1. Profile & Onboarding State
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        user_tz = profile.timezone if (profile and profile.timezone) else "UTC"
        ref_date = target_date or get_user_today_date(user_tz)
        full_name = profile.full_name if profile and profile.full_name else (user.full_name or "Athlete")
        onboarding_complete = profile.onboarding_complete if profile else False


        # 2. Nutrition Targets (Server-calculated TDEE, BMR, Target Cals & Protein)
        tdee_info = calculate_tdee(
            weight_kg=profile.weight_kg if profile else None,
            height_cm=profile.height_cm if profile else None,
            date_of_birth=profile.date_of_birth if profile else None,
            gender=profile.gender if profile else None,
            activity_level=profile.activity_level if profile else None,
        )
        tdee_cals = int(tdee_info["tdee"])
        bmr_cals = int(tdee_info["bmr"])

        user_targets = NutritionService.calculate_user_targets(db, user)
        target_cals = int(user_targets.calories)
        target_protein = int(user_targets.protein_g)

        # 3. Active Goal
        active_goal = (
            db.query(Goal)
            .filter(Goal.user_id == user.id, Goal.is_active == True)
            .first()
        )
        goal_section = (
            DashboardGoalSection(
                goal_type=active_goal.goal_type,
                target_weight_kg=active_goal.target_weight_kg,
                target_date=active_goal.target_date.isoformat() if active_goal.target_date else None,
                is_active=active_goal.is_active,
            )
            if active_goal
            else None
        )

        # 4. Active Workout Plan
        active_plan = (
            db.query(WorkoutPlan)
            .options(joinedload(WorkoutPlan.plan_exercises))
            .filter(WorkoutPlan.user_id == user.id, WorkoutPlan.is_active == True)
            .first()
        )
        workout_plan_section = (
            DashboardWorkoutPlanSection(
                id=str(active_plan.id),
                name=active_plan.name,
                days_per_week=active_plan.days_per_week or 4,
                exercise_count=len(active_plan.plan_exercises) if active_plan.plan_exercises else 0,
            )
            if active_plan
            else None
        )

        # 5. Today's Consumed Nutrition
        start_dt, end_dt = get_timezone_aware_range(ref_date, ref_date, user_tz)


        today_meals = (
            db.query(MealLog)
            .options(joinedload(MealLog.items))
            .filter(
                MealLog.user_id == user.id,
                MealLog.logged_at >= start_dt,
                MealLog.logged_at <= end_dt,
            )
            .all()
        )

        consumed_cals = 0.0
        consumed_prot = 0.0
        for m in today_meals:
            for item in m.items:
                consumed_cals += float(item.calculated_calories or 0)
                consumed_prot += float(item.calculated_protein or 0)

        today_nutrition_section = DashboardTodayNutritionSection(
            consumed_calories=round(consumed_cals, 1),
            target_calories=float(target_cals),
            remaining_calories=round(max(0.0, float(target_cals) - consumed_cals), 1),
            consumed_protein_g=round(consumed_prot, 1),
            target_protein_g=float(target_protein),
            remaining_protein_g=round(max(0.0, float(target_protein) - consumed_prot), 1),
        )

        # 6. Weekly Report Summary (Deterministic, NO Gemini calls, NO DB side-effects!)
        weekly_report = ReportService.generate_weekly_report(
            db=db,
            user=user,
            target_date=ref_date,
            include_ai_narrative=False,
        )

        has_data = (
            weekly_report.workouts.has_data
            or weekly_report.nutrition.has_data
            or weekly_report.progress.has_data
        )

        weekly_summary_section = DashboardWeeklySummarySection(
            adherence_score=weekly_report.adherence_score,
            adherence_label=weekly_report.adherence_label,
            workouts_completed=weekly_report.workouts.workouts_completed,
            target_workouts=weekly_report.workouts.target_workouts,
            workout_completion_pct=weekly_report.workouts.completion_rate_pct,
            nutrition_logged_days=weekly_report.nutrition.logged_days_count,
            total_days=7,
            current_fitness_score=weekly_report.fitness_score.ending_score,
            starting_fitness_score=weekly_report.fitness_score.starting_score,
            fitness_score_change=weekly_report.fitness_score.score_change,
            fitness_score_trend=weekly_report.fitness_score.trend,
            weight_change_kg=weekly_report.progress.weight_change_kg,
            has_weekly_data=has_data,
        )

        return DashboardSummaryResponse(
            full_name=full_name,
            email=user.email,
            onboarding_complete=onboarding_complete,
            tdee_calories=tdee_cals,
            bmr_calories=bmr_cals,
            target_calories=target_cals,
            target_protein_g=target_protein,
            goal=goal_section,
            workout_plan=workout_plan_section,
            today_nutrition=today_nutrition_section,
            weekly_summary=weekly_summary_section,
        )
