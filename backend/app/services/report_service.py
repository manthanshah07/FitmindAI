import calendar
import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.ai_client import ai_client
from app.core.ai_exceptions import AIException
from app.models.user import User
from app.models.workout import WorkoutLog, WorkoutPlan, WorkoutLogExercise, Exercise
from app.models.nutrition import MealLog, MealLogItem
from app.models.progress import Measurement
from app.schemas.ai import LLMCompletionRequest, LLMMessage
from app.schemas.report import (
    FitnessReportResponse,
    WorkoutReportSection,
    NutritionReportSection,
    ProgressReportSection,
    FitnessScoreReportSection,
)
from app.services.nutrition_service import NutritionService
from app.services.fitness_score_service import FitnessScoreService
from app.core.timezone_utils import get_timezone_aware_range, get_user_today_date

logger = logging.getLogger(__name__)


def extract_date_val(val) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        return date.fromisoformat(val.split("T")[0].split(" ")[0])
    return None


class ReportService:
    @staticmethod
    def get_month_boundaries(ref_date: date) -> Tuple[date, date]:
        """Calculate start date (1st) and end date (last day) for calendar month of ref_date."""
        start_date = ref_date.replace(day=1)
        _, last_day = calendar.monthrange(ref_date.year, ref_date.month)
        end_date = ref_date.replace(day=last_day)
        return start_date, end_date

    @staticmethod
    def get_weekly_boundaries(ref_date: date) -> Tuple[date, date]:
        """Calculate 7-day period ending on ref_date."""
        start_date = ref_date - timedelta(days=6)
        end_date = ref_date
        return start_date, end_date

    @classmethod
    def generate_weekly_report(
        cls,
        db: Session,
        user: User,
        target_date: Optional[date] = None,
        include_ai_narrative: bool = True,
    ) -> FitnessReportResponse:
        user_tz = user.profile.timezone if (user and user.profile and user.profile.timezone) else "UTC"
        ref_date = target_date or get_user_today_date(user_tz)
        start_date, end_date = cls.get_weekly_boundaries(ref_date)
        headline = f"Weekly Report ({start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')})"
        return cls._build_report(
            db=db,
            user=user,
            report_type="weekly",
            start_date=start_date,
            end_date=end_date,
            headline=headline,
            include_ai_narrative=include_ai_narrative,
        )

    @classmethod
    def generate_monthly_report(
        cls,
        db: Session,
        user: User,
        target_date: Optional[date] = None,
        include_ai_narrative: bool = True,
    ) -> FitnessReportResponse:
        user_tz = user.profile.timezone if (user and user.profile and user.profile.timezone) else "UTC"
        ref_date = target_date or get_user_today_date(user_tz)
        start_date, end_date = cls.get_month_boundaries(ref_date)
        headline = f"Monthly Report ({start_date.strftime('%B %Y')})"
        return cls._build_report(
            db=db,
            user=user,
            report_type="monthly",
            start_date=start_date,
            end_date=end_date,
            headline=headline,
            include_ai_narrative=include_ai_narrative,
        )

    @classmethod
    def _build_report(
        cls,
        db: Session,
        user: User,
        report_type: str,
        start_date: date,
        end_date: date,
        headline: str,
        include_ai_narrative: bool,
    ) -> FitnessReportResponse:
        user_tz = user.profile.timezone if (user and user.profile and user.profile.timezone) else "UTC"
        start_dt, end_dt = get_timezone_aware_range(start_date, end_date, user_tz)
        total_days = (end_date - start_date).days + 1

        # -------------------------------------------------------------
        # 1. WORKOUT SECTION
        # -------------------------------------------------------------
        workout_logs = (
            db.query(WorkoutLog)
            .filter(
                WorkoutLog.user_id == user.id,
                WorkoutLog.started_at >= start_dt,
                WorkoutLog.started_at <= end_dt,
            )
            .all()
        )
        workouts_completed = len(workout_logs)
        active_plan = (
            db.query(WorkoutPlan)
            .filter(WorkoutPlan.user_id == user.id, WorkoutPlan.is_active == True)
            .first()
        )
        days_per_week = active_plan.days_per_week if (active_plan and active_plan.days_per_week) else 4
        if report_type == "weekly":
            target_workouts = days_per_week
        else:
            target_workouts = int(round(days_per_week * (total_days / 7.0)))

        completion_rate_pct = min(100.0, round((workouts_completed / float(max(1, target_workouts))) * 100.0, 1))

        duration_minutes = 0
        for log in workout_logs:
            if log.ended_at and log.started_at:
                secs = (log.ended_at - log.started_at).total_seconds()
                if secs > 0:
                    duration_minutes += int(secs // 60)

        log_ids = [log.id for log in workout_logs]
        if log_ids:
            logged_exercises = (
                db.query(WorkoutLogExercise)
                .options(joinedload(WorkoutLogExercise.exercise))
                .filter(WorkoutLogExercise.log_id.in_(log_ids))
                .all()
            )
        else:
            logged_exercises = []

        total_sets_completed = len(logged_exercises)
        unique_exercises = len(set(e.exercise_id for e in logged_exercises))

        muscle_counts: Dict[str, int] = {}
        for le in logged_exercises:
            if le.exercise and le.exercise.primary_muscle:
                m = le.exercise.primary_muscle.title()
                muscle_counts[m] = muscle_counts.get(m, 0) + 1

        top_muscles = sorted(muscle_counts.keys(), key=lambda k: muscle_counts[k], reverse=True)[:3]

        workout_section = WorkoutReportSection(
            workouts_completed=workouts_completed,
            target_workouts=target_workouts,
            completion_rate_pct=completion_rate_pct if (workouts_completed > 0 or target_workouts > 0) else None,
            total_duration_minutes=duration_minutes if workouts_completed > 0 else None,
            total_sets_completed=total_sets_completed if workouts_completed > 0 else None,
            total_exercises_completed=unique_exercises if workouts_completed > 0 else None,
            most_frequent_muscles=top_muscles,
            has_data=workouts_completed > 0,
        )

        # -------------------------------------------------------------
        # 2. NUTRITION SECTION
        # -------------------------------------------------------------
        meal_logs = (
            db.query(MealLog)
            .options(joinedload(MealLog.items))
            .filter(
                MealLog.user_id == user.id,
                MealLog.logged_at >= start_dt,
                MealLog.logged_at <= end_dt,
            )
            .all()
        )

        daily_cals: Dict[date, float] = {}
        daily_protein: Dict[date, float] = {}
        for meal in meal_logs:
            m_date = extract_date_val(meal.logged_at)
            if m_date:
                if m_date not in daily_cals:
                    daily_cals[m_date] = 0.0
                    daily_protein[m_date] = 0.0
                for item in meal.items:
                    daily_cals[m_date] += float(item.calculated_calories or 0)
                    daily_protein[m_date] += float(item.calculated_protein or 0)

        logged_days_count = len(daily_cals)
        logging_completion_pct = round((logged_days_count / float(total_days)) * 100.0, 1)

        user_targets = NutritionService.calculate_user_targets(db, user)
        target_calories = float(user_targets.calories)
        target_protein = float(user_targets.protein_g)

        if logged_days_count > 0:
            avg_cals = round(sum(daily_cals.values()) / float(logged_days_count), 1)
            avg_protein = round(sum(daily_protein.values()) / float(logged_days_count), 1)

            cal_diff = abs(avg_cals - target_calories)
            cal_adherence = max(0.0, min(100.0, (1.0 - (cal_diff / max(1.0, target_calories))) * 100.0))
            prot_adherence = min(100.0, (avg_protein / max(1.0, target_protein)) * 100.0)

            nutrition_section = NutritionReportSection(
                logged_days_count=logged_days_count,
                total_days_in_period=total_days,
                logging_completion_pct=logging_completion_pct,
                target_calories=target_calories,
                average_calories_per_logged_day=avg_cals,
                target_protein_g=target_protein,
                average_protein_per_logged_day=avg_protein,
                calorie_adherence_pct=round(cal_adherence, 1),
                protein_adherence_pct=round(prot_adherence, 1),
                has_data=True,
            )
        else:
            nutrition_section = NutritionReportSection(
                logged_days_count=0,
                total_days_in_period=total_days,
                logging_completion_pct=0.0,
                target_calories=target_calories,
                average_calories_per_logged_day=None,
                target_protein_g=target_protein,
                average_protein_per_logged_day=None,
                calorie_adherence_pct=None,
                protein_adherence_pct=None,
                has_data=False,
            )

        # -------------------------------------------------------------
        # 3. PROGRESS / MEASUREMENTS SECTION
        # -------------------------------------------------------------
        period_measurements = (
            db.query(Measurement)
            .filter(
                Measurement.user_id == user.id,
                Measurement.measured_at >= start_date,
                Measurement.measured_at <= end_date,
            )
            .order_by(Measurement.measured_at.asc())
            .all()
        )

        if period_measurements:
            first_m = period_measurements[0]
            last_m = period_measurements[-1]
            start_w = float(first_m.weight_kg) if first_m.weight_kg is not None else None
            end_w = float(last_m.weight_kg) if last_m.weight_kg is not None else None
            w_change = round(end_w - start_w, 2) if (start_w is not None and end_w is not None) else None

            start_bf = float(first_m.body_fat_pct) if first_m.body_fat_pct is not None else None
            end_bf = float(last_m.body_fat_pct) if last_m.body_fat_pct is not None else None
            bf_change = round(end_bf - start_bf, 1) if (start_bf is not None and end_bf is not None) else None

            progress_section = ProgressReportSection(
                starting_weight_kg=start_w,
                ending_weight_kg=end_w,
                weight_change_kg=w_change,
                starting_body_fat_pct=start_bf,
                ending_body_fat_pct=end_bf,
                body_fat_change_pct=bf_change,
                measurement_count=len(period_measurements),
                has_data=True,
            )
        else:
            # Check baseline measurement before period_start
            baseline_m = (
                db.query(Measurement)
                .filter(Measurement.user_id == user.id, Measurement.measured_at < start_date)
                .order_by(Measurement.measured_at.desc())
                .first()
            )
            base_w = float(baseline_m.weight_kg) if (baseline_m and baseline_m.weight_kg is not None) else None
            progress_section = ProgressReportSection(
                starting_weight_kg=base_w,
                ending_weight_kg=base_w,
                weight_change_kg=0.0 if base_w is not None else None,
                starting_body_fat_pct=float(baseline_m.body_fat_pct) if (baseline_m and baseline_m.body_fat_pct is not None) else None,
                ending_body_fat_pct=float(baseline_m.body_fat_pct) if (baseline_m and baseline_m.body_fat_pct is not None) else None,
                body_fat_change_pct=0.0 if (baseline_m and baseline_m.body_fat_pct is not None) else None,
                measurement_count=0,
                has_data=False,
            )

        # -------------------------------------------------------------
        # 4. FITNESS SCORE SECTION
        # -------------------------------------------------------------
        ending_score_item = FitnessScoreService.calculate_fitness_score(
            db, user, target_date=end_date
        )
        ending_score = ending_score_item.score

        prev_ref_date = start_date - timedelta(days=1)
        starting_score_item = FitnessScoreService.calculate_fitness_score(
            db, user, target_date=prev_ref_date
        )
        starting_score = starting_score_item.score


        score_change = ending_score - starting_score
        if score_change > 0:
            trend = "improving"
        elif score_change < 0:
            trend = "declining"
        else:
            trend = "stable"

        fitness_score_section = FitnessScoreReportSection(
            starting_score=starting_score,
            ending_score=ending_score,
            score_change=score_change,
            trend=trend,
            has_data=True,
        )

        # -------------------------------------------------------------
        # 5. DETERMINISTIC ADHERENCE CALCULATION
        # -------------------------------------------------------------
        has_any_logs = (workouts_completed > 0) or (logged_days_count > 0) or (progress_section.measurement_count > 0)

        if not has_any_logs:
            adherence_score = None
            adherence_label = "Insufficient Data"
            adherence_breakdown = None
        else:
            w_score = completion_rate_pct
            n_score = logging_completion_pct
            m_score = 100.0 if progress_section.measurement_count > 0 else 50.0

            adherence_val = round((0.40 * w_score) + (0.40 * n_score) + (0.20 * m_score), 1)
            adherence_score = max(0.0, min(100.0, adherence_val))

            if adherence_score >= 85:
                adherence_label = "High"
            elif adherence_score >= 65:
                adherence_label = "Moderate"
            else:
                adherence_label = "Low"

            adherence_breakdown = {
                "workout_completion_pct": w_score,
                "nutrition_logging_pct": n_score,
                "measurement_tracking_score": m_score,
            }

        # -------------------------------------------------------------
        # 6. SUMMARY FACTS
        # -------------------------------------------------------------
        facts: List[str] = []
        facts.append(f"Completed {workouts_completed} of {target_workouts} planned workouts ({completion_rate_pct}% target completion).")
        if logged_days_count > 0:
            facts.append(f"Logged nutrition on {logged_days_count} of {total_days} days (avg {nutrition_section.average_calories_per_logged_day} kcal, {nutrition_section.average_protein_per_logged_day}g protein).")
        else:
            facts.append(f"No nutrition logs recorded during this {report_type} period.")

        if progress_section.has_data and progress_section.weight_change_kg is not None:
            sign = "+" if progress_section.weight_change_kg > 0 else ""
            facts.append(f"Weight change: {sign}{progress_section.weight_change_kg} kg across {progress_section.measurement_count} measurement logs.")

        facts.append(f"Fitness Score: {starting_score} → {ending_score} ({'+' if score_change > 0 else ''}{score_change} pts, {trend.title()}).")

        # -------------------------------------------------------------
        # 7. OPTIONAL AI NARRATIVE GENERATION
        # -------------------------------------------------------------
        narrative: Optional[str] = None
        ai_generated = False

        if include_ai_narrative and settings.GEMINI_API_KEY:
            try:
                fact_prompt = f"""REPORT TYPE: {report_type.upper()} ({start_date.isoformat()} to {end_date.isoformat()})
WORKOUTS: {workouts_completed}/{target_workouts} completed ({completion_rate_pct}%). Top muscles: {', '.join(top_muscles) if top_muscles else 'General'}.
NUTRITION: {logged_days_count}/{total_days} days logged ({logging_completion_pct}% consistency). Avg Cals: {nutrition_section.average_calories_per_logged_day or 'N/A'} (Target: {target_calories}). Avg Protein: {nutrition_section.average_protein_per_logged_day or 'N/A'}g (Target: {target_protein}g).
PROGRESS: Weight change: {progress_section.weight_change_kg or '0'} kg over {progress_section.measurement_count} logs.
FITNESS SCORE: {starting_score} -> {ending_score} (Change: {score_change}, Trend: {trend}).
ADHERENCE: {adherence_score if adherence_score is not None else 'N/A'}% ({adherence_label})."""

                messages = [
                    LLMMessage(
                        role="system",
                        content=(
                            "You are FitMind AI Coach generating a concise progress report summary. "
                            "Rely strictly on the provided report facts. Do NOT invent numbers, metrics, or medical diagnoses. "
                            "Provide a 2-paragraph encouraging, clear summary of key progress and 1-2 practical tips for the upcoming period."
                        ),
                    ),
                    LLMMessage(role="user", content=fact_prompt),
                ]
                req = LLMCompletionRequest(messages=messages, temperature=0.7)
                res = ai_client.generate(req)
                if res and res.content:
                    narrative = res.content.strip()
                    ai_generated = True
            except Exception as e:
                logger.warning(f"AI narrative generation skipped due to error: {e}")
                narrative = None
                ai_generated = False

        return FitnessReportResponse(
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            generated_at=datetime.now(timezone.utc),
            headline=headline,
            adherence_score=adherence_score,
            adherence_label=adherence_label,
            adherence_breakdown=adherence_breakdown,
            summary_facts=facts,
            workouts=workout_section,
            nutrition=nutrition_section,
            progress=progress_section,
            fitness_score=fitness_score_section,
            narrative=narrative,
            ai_generated=ai_generated,
        )
