import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.workout import WorkoutLog, WorkoutPlan
from app.models.nutrition import MealLog, MealLogItem
from app.models.progress import Measurement
from app.models.fitness_score import FitnessScore
from app.schemas.fitness_analytics import (
    WeightTrendAnalytics,
    GoalProgressAnalytics,
    WorkoutAnalytics,
    NutritionTrendAnalytics,
    MeasurementTrendAnalytics,
    ScoreTrendAnalytics,
    DataCompletenessAnalytics,
    FitnessAnalytics,
)
from app.services.nutrition_service import NutritionService
from app.services.fitness_score_service import FitnessScoreService

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


class AnalyticsService:
    """
    Dedicated deterministic fitness analytics calculation service.
    Computes high-level trends and progress metrics from PostgreSQL models
    before passing structured context to the AI Coach.
    """

    @staticmethod
    def calculate_analytics(
        db: Session,
        user: User,
        timeframe_days: int = 90,
    ) -> FitnessAnalytics:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        active_goal = (
            db.query(Goal)
            .filter(Goal.user_id == user.id, Goal.is_active == True)
            .first()
        )

        weight_trend = AnalyticsService._compute_weight_trend(db, user, timeframe_days)
        goal_progress = AnalyticsService._compute_goal_progress(
            db, user, profile, active_goal, weight_trend
        )
        workout_analytics = AnalyticsService._compute_workout_analytics(db, user)
        nutrition_trends = AnalyticsService._compute_nutrition_trends(db, user)
        measurement_trends = AnalyticsService._compute_measurement_trends(
            db, user, timeframe_days
        )
        score_trend = AnalyticsService._compute_score_trend(db, user)
        data_completeness = AnalyticsService._compute_data_completeness(
            profile=profile,
            active_goal=active_goal,
            workout_sessions=workout_analytics.total_sessions_30d,
            nutrition_days=nutrition_trends.days_logged_7d,
            measurement_count=weight_trend.sample_count,
            has_score=score_trend.current_score is not None,
        )

        return FitnessAnalytics(
            weight_trend=weight_trend,
            goal_progress=goal_progress,
            workout_analytics=workout_analytics,
            nutrition_trends=nutrition_trends,
            measurement_trends=measurement_trends,
            score_trend=score_trend,
            data_completeness=data_completeness,
        )

    @staticmethod
    def _compute_weight_trend(
        db: Session, user: User, timeframe_days: int = 90
    ) -> WeightTrendAnalytics:
        cutoff_date = date.today() - timedelta(days=timeframe_days)
        measurements = (
            db.query(Measurement)
            .filter(
                Measurement.user_id == user.id,
                Measurement.measured_at >= cutoff_date,
                Measurement.weight_kg.isnot(None),
            )
            .order_by(Measurement.measured_at.asc(), Measurement.created_at.asc())
            .all()
        )

        if not measurements or len(measurements) < 2:
            single_val = (
                float(measurements[0].weight_kg) if measurements else None
            )
            return WeightTrendAnalytics(
                latest_weight_kg=single_val,
                previous_weight_kg=None,
                change_kg=None,
                pct_change=None,
                sample_count=len(measurements),
                timeframe_days=timeframe_days,
                trend_direction="insufficient_data",
            )

        earliest = float(measurements[0].weight_kg)
        latest = float(measurements[-1].weight_kg)
        change_kg = round(latest - earliest, 2)

        pct_change = (
            round((change_kg / earliest) * 100.0, 1) if earliest > 0 else None
        )

        if change_kg < -0.2:
            trend = "losing"
        elif change_kg > 0.2:
            trend = "gaining"
        else:
            trend = "maintaining"

        return WeightTrendAnalytics(
            latest_weight_kg=latest,
            previous_weight_kg=earliest,
            change_kg=change_kg,
            pct_change=pct_change,
            sample_count=len(measurements),
            timeframe_days=timeframe_days,
            trend_direction=trend,
        )

    @staticmethod
    def _compute_goal_progress(
        db: Session,
        user: User,
        profile: Optional[Profile],
        active_goal: Optional[Goal],
        weight_trend: WeightTrendAnalytics,
    ) -> GoalProgressAnalytics:
        if not active_goal:
            return GoalProgressAnalytics(status="no_active_goal")

        goal_type = active_goal.goal_type
        target_weight = (
            float(active_goal.target_weight_kg)
            if active_goal.target_weight_kg is not None
            else None
        )

        # Determine current weight: prefer latest measurement, fall back to profile weight
        current_weight = weight_trend.latest_weight_kg
        if current_weight is None and profile and profile.weight_kg is not None:
            current_weight = float(profile.weight_kg)

        # Baseline weight: earliest measurement within 90 days if available
        start_weight = weight_trend.previous_weight_kg
        is_baseline_inferred = False
        if start_weight is not None:
            is_baseline_inferred = True
        elif current_weight is not None:
            # Fall back to current weight if single measurement exists
            start_weight = current_weight
            is_baseline_inferred = True

        if (
            target_weight is None
            or start_weight is None
            or current_weight is None
        ):
            return GoalProgressAnalytics(
                primary_goal=goal_type,
                start_weight_kg=start_weight,
                is_baseline_inferred=is_baseline_inferred,
                current_weight_kg=current_weight,
                target_weight_kg=target_weight,
                status="insufficient_data",
            )

        if goal_type in ("weight_loss", "fat_loss"):
            total_needed = start_weight - target_weight
            if total_needed <= 0:
                # Target weight is higher than or equal to start weight for loss goal
                return GoalProgressAnalytics(
                    primary_goal=goal_type,
                    start_weight_kg=start_weight,
                    is_baseline_inferred=is_baseline_inferred,
                    current_weight_kg=current_weight,
                    target_weight_kg=target_weight,
                    progress_pct=100.0,
                    remaining_weight_kg=0.0,
                    is_target_met=True,
                    status="target_met",
                )

            achieved = start_weight - current_weight
            remaining = max(0.0, round(current_weight - target_weight, 2))
            is_met = current_weight <= target_weight
            progress_pct = max(
                0.0, min(100.0, round((achieved / total_needed) * 100.0, 1))
            )
            status = "target_met" if is_met else "on_track"

        elif goal_type in ("muscle_gain", "weight_gain"):
            total_needed = target_weight - start_weight
            if total_needed <= 0:
                return GoalProgressAnalytics(
                    primary_goal=goal_type,
                    start_weight_kg=start_weight,
                    is_baseline_inferred=is_baseline_inferred,
                    current_weight_kg=current_weight,
                    target_weight_kg=target_weight,
                    progress_pct=100.0,
                    remaining_weight_kg=0.0,
                    is_target_met=True,
                    status="target_met",
                )

            achieved = current_weight - start_weight
            remaining = max(0.0, round(target_weight - current_weight, 2))
            is_met = current_weight >= target_weight
            progress_pct = max(
                0.0, min(100.0, round((achieved / total_needed) * 100.0, 1))
            )
            status = "target_met" if is_met else "on_track"

        else:
            # Maintain or general fitness goal
            remaining = (
                abs(round(current_weight - target_weight, 2))
                if target_weight
                else None
            )
            return GoalProgressAnalytics(
                primary_goal=goal_type,
                start_weight_kg=start_weight,
                is_baseline_inferred=is_baseline_inferred,
                current_weight_kg=current_weight,
                target_weight_kg=target_weight,
                progress_pct=100.0 if remaining == 0 else None,
                remaining_weight_kg=remaining,
                is_target_met=(remaining == 0) if remaining is not None else False,
                status="on_track",
            )

        return GoalProgressAnalytics(
            primary_goal=goal_type,
            start_weight_kg=start_weight,
            is_baseline_inferred=is_baseline_inferred,
            current_weight_kg=current_weight,
            target_weight_kg=target_weight,
            progress_pct=progress_pct,
            remaining_weight_kg=remaining,
            is_target_met=is_met,
            status=status,
        )

    @staticmethod
    def _compute_workout_analytics(db: Session, user: User) -> WorkoutAnalytics:
        cutoff_dt = datetime.combine(
            date.today() - timedelta(days=30), datetime.min.time()
        ).replace(tzinfo=timezone.utc)

        workout_logs = (
            db.query(WorkoutLog)
            .filter(
                WorkoutLog.user_id == user.id,
                WorkoutLog.started_at >= cutoff_dt,
            )
            .all()
        )

        total_sessions = len(workout_logs)
        weekly_avg = round(total_sessions / 4.2857, 1)

        active_plan = (
            db.query(WorkoutPlan)
            .filter(WorkoutPlan.user_id == user.id, WorkoutPlan.is_active == True)
            .first()
        )

        target_days: Optional[int] = None
        adherence_pct: Optional[float] = None

        if active_plan and active_plan.days_per_week and active_plan.days_per_week > 0:
            target_days = active_plan.days_per_week
            adherence_pct = min(
                100.0, round((weekly_avg / float(target_days)) * 100.0, 1)
            )

        if adherence_pct is not None:
            if adherence_pct >= 80.0:
                status = "consistent"
            elif adherence_pct >= 40.0:
                status = "irregular"
            elif total_sessions > 0:
                status = "inactive"
            else:
                status = "insufficient_data"
        else:
            if total_sessions >= 12:
                status = "consistent"
            elif total_sessions >= 4:
                status = "irregular"
            elif total_sessions > 0:
                status = "inactive"
            else:
                status = "insufficient_data"

        return WorkoutAnalytics(
            total_sessions_30d=total_sessions,
            weekly_avg_sessions=weekly_avg,
            target_days_per_week=target_days,
            adherence_pct=adherence_pct,
            consistency_status=status,
        )

    @staticmethod
    def _compute_nutrition_trends(db: Session, user: User) -> NutritionTrendAnalytics:
        cutoff_dt = datetime.combine(
            date.today() - timedelta(days=6), datetime.min.time()
        ).replace(tzinfo=timezone.utc)

        meal_logs = (
            db.query(MealLog)
            .options(joinedload(MealLog.items))
            .filter(
                MealLog.user_id == user.id,
                MealLog.logged_at >= cutoff_dt,
            )
            .all()
        )

        # Group totals by date
        daily_cals: Dict[date, float] = {}
        daily_protein: Dict[date, float] = {}

        for meal in meal_logs:
            m_date = extract_date(meal.logged_at)
            if not m_date:
                continue
            if m_date not in daily_cals:
                daily_cals[m_date] = 0.0
                daily_protein[m_date] = 0.0
            for item in meal.items or []:
                daily_cals[m_date] += float(item.calculated_calories or 0)
                daily_protein[m_date] += float(item.calculated_protein or 0)

        days_logged = len(daily_cals)
        days_unlogged = 7 - days_logged
        logging_completeness = round((days_logged / 7.0) * 100.0, 1)

        # Average strictly over LOGGED days to distinguish unlogged from zero intake!
        if days_logged > 0:
            avg_cals = round(sum(daily_cals.values()) / float(days_logged), 1)
            avg_protein = round(sum(daily_protein.values()) / float(days_logged), 1)
        else:
            avg_cals = None
            avg_protein = None

        targets = NutritionService.calculate_user_targets(db, user)
        target_cals = targets.calories
        target_protein = targets.protein_g

        cal_adherence: Optional[float] = None
        prot_adherence: Optional[float] = None

        if avg_cals is not None and target_cals and target_cals > 0:
            cal_adherence = round((avg_cals / target_cals) * 100.0, 1)
        if avg_protein is not None and target_protein and target_protein > 0:
            prot_adherence = round((avg_protein / target_protein) * 100.0, 1)

        return NutritionTrendAnalytics(
            days_logged_7d=days_logged,
            days_unlogged_7d=days_unlogged,
            logging_completeness_pct=logging_completeness,
            avg_daily_calories=avg_cals,
            avg_daily_protein_g=avg_protein,
            target_calories=target_cals,
            target_protein_g=target_protein,
            calorie_adherence_pct=cal_adherence,
            protein_adherence_pct=prot_adherence,
        )

    @staticmethod
    def _compute_measurement_trends(
        db: Session, user: User, timeframe_days: int = 90
    ) -> MeasurementTrendAnalytics:
        cutoff_date = date.today() - timedelta(days=timeframe_days)
        records = (
            db.query(Measurement)
            .filter(
                Measurement.user_id == user.id,
                Measurement.measured_at >= cutoff_date,
            )
            .order_by(Measurement.measured_at.asc(), Measurement.created_at.asc())
            .all()
        )

        if not records or len(records) < 2:
            return MeasurementTrendAnalytics(
                timeframe_days=timeframe_days,
                sample_count=len(records),
                has_sufficient_data=False,
            )

        def diff_field(attr_name: str) -> Optional[float]:
            vals = [
                (r, getattr(r, attr_name))
                for r in records
                if getattr(r, attr_name) is not None
            ]
            if len(vals) < 2:
                return None
            first_val = float(vals[0][1])
            last_val = float(vals[-1][1])
            return round(last_val - first_val, 2)

        return MeasurementTrendAnalytics(
            timeframe_days=timeframe_days,
            sample_count=len(records),
            waist_change_cm=diff_field("waist_cm"),
            chest_change_cm=diff_field("chest_cm"),
            bicep_change_cm=diff_field("bicep_cm"),
            thigh_change_cm=diff_field("thigh_cm"),
            hips_change_cm=diff_field("hips_cm"),
            body_fat_change_pct=diff_field("body_fat_pct"),
            has_sufficient_data=True,
        )

    @staticmethod
    def _compute_score_trend(db: Session, user: User) -> ScoreTrendAnalytics:
        try:
            summary = FitnessScoreService.get_fitness_score_summary(db, user)
            if not summary or not summary.current_score:
                return ScoreTrendAnalytics(trend_label="insufficient_data")

            curr_score = summary.current_score.score
            prev_score: Optional[int] = None
            score_change: Optional[int] = None

            if summary.history and len(summary.history) >= 2:
                prev_score = summary.history[1].score
                score_change = curr_score - prev_score

            if score_change is None:
                trend_label = "insufficient_data"
            elif score_change > 2:
                trend_label = "improving"
            elif score_change < -2:
                trend_label = "declining"
            else:
                trend_label = "stable"

            return ScoreTrendAnalytics(
                current_score=curr_score,
                previous_score=prev_score,
                score_change=score_change,
                trend_label=trend_label,
            )
        except Exception as e:
            logger.warning("Error computing score trend: %s", e)
            return ScoreTrendAnalytics(trend_label="insufficient_data")

    @staticmethod
    def _compute_data_completeness(
        profile: Optional[Profile],
        active_goal: Optional[Goal],
        workout_sessions: int,
        nutrition_days: int,
        measurement_count: int,
        has_score: bool,
    ) -> DataCompletenessAnalytics:
        has_prof = profile is not None
        has_goal = active_goal is not None

        if (
            has_prof
            and has_goal
            and workout_sessions >= 8
            and nutrition_days >= 5
            and measurement_count >= 2
        ):
            quality = "comprehensive"
        elif (
            has_prof
            and (workout_sessions >= 4 or nutrition_days >= 3)
        ):
            quality = "moderate"
        elif has_prof or workout_sessions > 0 or nutrition_days > 0 or measurement_count > 0:
            quality = "sparse"
        else:
            quality = "minimal"

        return DataCompletenessAnalytics(
            has_profile=has_prof,
            has_active_goal=has_goal,
            workout_sessions_30d=workout_sessions,
            nutrition_days_logged_7d=nutrition_days,
            measurement_count_90d=measurement_count,
            has_fitness_score=has_score,
            overall_quality=quality,
        )
