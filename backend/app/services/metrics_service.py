"""
Unified metrics service for FitMind AI.
Single source of truth for all fitness calculation logic (fixes D4, D5).
No client-side arithmetic; shared identically by Today, Progress, and Reports.
"""
from datetime import date
from typing import List, Optional, Tuple, Dict, Any
from app.models.workout import WorkoutLog, WorkoutPlan


def calculate_calorie_adherence(
    actual_cals: float, target_cals: float, as_percentage: bool = True
) -> float:
    """
    Computes caloric adherence with inverted penalty:
    100% adherence when actual == target.
    Decreases linearly based on deviation |actual - target| / target.
    Clamped to [0.0, 100.0].
    """
    if target_cals <= 0:
        return 0.0
    diff = abs(actual_cals - target_cals)
    error_ratio = diff / target_cals
    score = max(0.0, 1.0 - error_ratio)
    if as_percentage:
        return round(score * 100.0, 2)
    return round(score, 4)


def calculate_protein_adherence(
    actual_protein: float, target_protein: float
) -> float:
    """
    Computes protein adherence:
    min(100.0, (actual_protein / target_protein) * 100.0).
    """
    if target_protein <= 0:
        return 0.0
    ratio = (actual_protein / target_protein) * 100.0
    return min(100.0, max(0.0, round(ratio, 2)))


def calculate_workout_session_credit(
    sets_completed: int,
    sets_planned: int,
) -> float:
    """
    Calculates credit for an individual workout session (fixes D4):
    - Sessions with < 3 completed sets earn 0.0 credit (anti-cheating / incomplete work).
    - Credit = min(1.0, sets_completed / max(1, sets_planned)).
    """
    if sets_completed < 3:
        return 0.0
    planned = max(1, sets_planned)
    return min(1.0, round(sets_completed / float(planned), 4))


def get_planned_sets_for_day(
    plan: Optional[WorkoutPlan],
    session_date: Optional[date] = None,
    day_label: Optional[str] = None,
) -> int:
    """
    Determines planned sets for a workout session:
    1. If plan has exercises matching day_label or day_of_week (0=Mon), sum their sets.
    2. Else if plan has any exercises, compute average sets per day.
    3. Fallback: 12 sets (standard 3-4 exercise session).
    """
    if not plan or not plan.plan_exercises:
        return 12

    day_exercises = []
    if day_label:
        day_exercises = [pe for pe in plan.plan_exercises if pe.day_label == day_label]

    if not day_exercises and session_date:
        dow = session_date.weekday()  # 0=Monday, 6=Sunday
        day_exercises = [
            pe for pe in plan.plan_exercises
            if pe.day_of_week == dow or pe.day_of_week == (dow + 1)
        ]

    if day_exercises:
        total = sum(pe.sets or 3 for pe in day_exercises)
        return max(1, total)

    # Average sets per day in plan
    distinct_days = set()
    total_plan_sets = 0
    for pe in plan.plan_exercises:
        d = pe.day_label or pe.day_of_week or "default"
        distinct_days.add(d)
        total_plan_sets += (pe.sets or 3)

    num_days = max(1, len(distinct_days))
    avg_sets = int(round(total_plan_sets / float(num_days)))
    return max(1, avg_sets)


def calculate_weekly_workout_adherence(
    session_data: List[Tuple[int, int]],  # List of (sets_completed, sets_planned)
    target_days_per_week: int,
) -> Tuple[float, int, int]:
    """
    Calculates weekly workout adherence across all sessions in a 7-day period:
    - Session credit = calculate_workout_session_credit(sets_completed, sets_planned).
    - Weekly adherence = min(100.0, (sum(session_credits) / max(1, target_days_per_week)) * 100.0).
    Returns (adherence_pct, total_sets_completed, total_sets_planned).
    """
    target_days = max(1, target_days_per_week)
    total_completed = 0
    total_planned = 0
    total_credit = 0.0

    for sets_done, sets_target in session_data:
        total_completed += sets_done
        total_planned += sets_target
        total_credit += calculate_workout_session_credit(sets_done, sets_target)

    adherence_pct = min(100.0, round((total_credit / float(target_days)) * 100.0, 2))
    return adherence_pct, total_completed, total_planned


def calculate_logging_consistency(
    active_days: int, total_days: int = 7
) -> float:
    """
    Calculates consistency score:
    (active_days / max(1, total_days)) * 100.0 capped at 100.0.
    """
    t_days = max(1, total_days)
    score = (active_days / float(t_days)) * 100.0
    return min(100.0, max(0.0, round(score, 2)))
