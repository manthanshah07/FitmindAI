from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Set
from uuid import UUID
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import desc, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from app.core.idempotency import compute_request_fingerprint, normalize_weight
from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.workout import (
    WorkoutPlan,
    WorkoutPlanExercise,
    WorkoutLog,
    WorkoutLogExercise,
    Exercise,
)
from app.schemas.workout import (
    WorkoutPlanCreate,
    WorkoutPlanResponse,
    WorkoutPlanExerciseResponse,
    WorkoutLogCreate,
    WorkoutLogResponse,
    WorkoutLogExerciseResponse,
    LastPerformanceResponse,
    LastPerformanceItemResponse,
    LastPerformanceSetResponse,
)
from app.services.exercise_service import ExerciseService

COMPOUND_PRIORITY: Dict[str, int] = {
    "Barbell Bench Press": 1,
    "Barbell Squat": 1,
    "Barbell Deadlift": 1,
    "Overhead Press": 1,
    "Pull-up": 1,
    "Pull-Up": 1,
    "Chin-up": 1,
    "Barbell Bent-Over Row": 1,
    "Push-up": 1,
    "Incline Dumbbell Press": 2,
    "Dumbbell Bench Press": 2,
    "Leg Press": 2,
    "Bulgarian Split Squat": 2,
    "Romanian Deadlift": 2,
    "Dumbbell Romanian Deadlift": 2,
    "One-Arm Dumbbell Row": 2,
    "Lat Pulldown": 2,
    "Seated Cable Row": 2,
    "Dips (Chest Focus)": 2,
    "Barbell Hip Thrust": 2,
    "Goblet Squat": 2,
    "Walking Lunge": 2,
    "Close-Grip Bench Press": 2,
    "Arnold Press": 2,
    "Dumbbell Shoulder Press": 2,
    "Cable Face Pull": 3,
    "Dumbbell Lateral Raise": 3,
    "Cable Lateral Raise": 3,
    "Barbell Bicep Curl": 3,
    "Dumbbell Bicep Curl": 3,
    "Dumbbell Hammer Curl": 3,
    "Tricep Rope Pushdown": 3,
    "Skull Crusher (Barbell Lying Extension)": 3,
    "Overhead Dumbbell Tricep Extension": 3,
    "Lying Leg Curl": 3,
    "Leg Extension": 3,
    "Standing Calf Raise": 3,
    "Cable Crossover": 3,
    "Plank": 4,
    "Hanging Leg Raise": 4,
    "Glute Bridge": 4,
    "Kettlebell Swing": 4,
    "Stationary Cycling": 4,
    "Knee Push-Up": 4,
    "Bodyweight Squat": 4,
}


def _matches_equipment(required: Optional[List[str]], user_equip: List[str]) -> bool:
    if "full_gym" in user_equip:
        return True
    req = required or ["bodyweight"]
    norm_user = {e.lower().strip() for e in user_equip}
    norm_user.add("bodyweight")
    return all(r.lower().strip() in norm_user for r in req)


def _get_split_structure(days: int) -> List[Tuple[str, List[str]]]:
    """Returns a list of (day_label, [target_muscle_groups]) based on days per week."""
    if days <= 2:
        return [
            ("Full Body A", ["Chest", "Quadriceps", "Upper Back", "Hamstrings", "Abs"]),
            ("Full Body B", ["Shoulders", "Quadriceps", "Lats", "Glutes", "Triceps", "Biceps"]),
        ]
    elif days == 3:
        return [
            ("Full Body A", ["Chest", "Quadriceps", "Upper Back", "Hamstrings", "Abs"]),
            ("Full Body B", ["Shoulders", "Quadriceps", "Lats", "Glutes", "Triceps", "Biceps"]),
            ("Full Body C", ["Chest", "Hamstrings", "Upper Back", "Quadriceps", "Calves"]),
        ]
    elif days == 4:
        return [
            ("Upper Body A", ["Chest", "Upper Back", "Chest", "Lats", "Triceps", "Biceps"]),
            ("Lower Body A", ["Quadriceps", "Hamstrings", "Quadriceps", "Hamstrings", "Calves", "Abs"]),
            ("Upper Body B", ["Shoulders", "Lats", "Chest", "Upper Back", "Shoulders", "Biceps"]),
            ("Lower Body B", ["Hamstrings", "Quadriceps", "Glutes", "Quadriceps", "Calves", "Abs"]),
        ]
    elif days == 5:
        return [
            ("Push", ["Chest", "Chest", "Shoulders", "Shoulders", "Triceps"]),
            ("Pull", ["Lats", "Upper Back", "Lats", "Rear Deltoids", "Biceps", "Biceps"]),
            ("Legs", ["Quadriceps", "Hamstrings", "Quadriceps", "Glutes", "Calves"]),
            ("Upper Body", ["Chest", "Upper Back", "Shoulders", "Lats", "Triceps", "Biceps"]),
            ("Lower Body", ["Quadriceps", "Hamstrings", "Glutes", "Calves", "Abs"]),
        ]
    else:  # 6 or 7 days
        return [
            ("Push A", ["Chest", "Chest", "Shoulders", "Shoulders", "Triceps"]),
            ("Pull A", ["Lats", "Upper Back", "Lats", "Rear Deltoids", "Biceps"]),
            ("Legs A", ["Quadriceps", "Hamstrings", "Quadriceps", "Calves", "Abs"]),
            ("Push B", ["Shoulders", "Chest", "Shoulders", "Triceps", "Triceps"]),
            ("Pull B", ["Upper Back", "Lats", "Rear Deltoids", "Biceps", "Lats"]),
            ("Legs B", ["Hamstrings", "Quadriceps", "Glutes", "Calves", "Abs"]),
        ]


def _configure_sets_and_reps(goal: str, compound_rank: int) -> Tuple[int, str, int]:
    """Returns (sets, reps, rest_seconds) deterministically by goal and compound priority."""
    g = (goal or "").lower().replace(" ", "_")

    if "muscle" in g or "hypertrophy" in g:
        if compound_rank == 1:
            return 4, "6-8", 120
        elif compound_rank == 2:
            return 3, "8-10", 90
        else:
            return 3, "10-12", 60
    elif "fat" in g or "loss" in g or "cut" in g:
        if compound_rank == 1:
            return 3, "10-12", 60
        else:
            return 3, "12-15", 45
    else:  # strength, general_fitness, maintenance
        if compound_rank == 1:
            return 5, "5", 180
        elif compound_rank == 2:
            return 4, "6-8", 120
        else:
            return 3, "8-10", 90


class WorkoutService:
    @staticmethod
    def get_active_plan(db: Session, user: User) -> Optional[WorkoutPlanResponse]:
        plan = (
            db.query(WorkoutPlan)
            .options(
                joinedload(WorkoutPlan.plan_exercises).joinedload(WorkoutPlanExercise.exercise)
            )
            .filter(WorkoutPlan.user_id == user.id, WorkoutPlan.is_active == True)
            .order_by(WorkoutPlan.created_at.desc())
            .first()
        )

        if not plan:
            return None
        return WorkoutPlanResponse.model_validate(plan)

    @staticmethod
    def generate_workout_plan(
        db: Session, user: User, data: Optional[WorkoutPlanCreate] = None
    ) -> WorkoutPlanResponse:
        ExerciseService.seed_default_exercises(db)

        # Deactivate existing active plans
        db.query(WorkoutPlan).filter(
            WorkoutPlan.user_id == user.id, WorkoutPlan.is_active == True
        ).update({"is_active": False})

        user_profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        active_goal = db.query(Goal).filter(Goal.user_id == user.id, Goal.is_active == True).first()

        goal_name = active_goal.goal_type if active_goal else "general_fitness"
        equip = user_profile.equipment if user_profile and user_profile.equipment else ["bodyweight"]

        days = data.days_per_week if data and data.days_per_week else (user_profile.target_days if user_profile and user_profile.target_days else 4)
        days = max(2, min(6, days))

        plan_title = (
            data.name
            if data and data.name
            else f"{days}-Day Calibrated {goal_name.replace('_', ' ').title()} Split"
        )

        new_plan = WorkoutPlan(
            user_id=user.id,
            name=plan_title,
            days_per_week=days,
            is_active=True,
            ai_generated=False,
        )
        db.add(new_plan)
        db.flush()

        if data and data.exercises and len(data.exercises) > 0:
            # Custom explicit exercises provided
            supplied_ids = [ex.exercise_id for ex in data.exercises]
            unique_ids = set(supplied_ids)
            existing_count = db.query(Exercise).filter(Exercise.id.in_(unique_ids)).count()
            if existing_count < len(unique_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more exercise IDs do not exist",
                )

            for idx, ex_data in enumerate(data.exercises):
                plan_ex = WorkoutPlanExercise(
                    plan_id=new_plan.id,
                    exercise_id=ex_data.exercise_id,
                    day_of_week=ex_data.day_of_week if ex_data.day_of_week is not None else ((idx % days) + 1),
                    day_label=ex_data.day_label or f"Day {ex_data.day_of_week or ((idx % days) + 1)}",
                    sets=ex_data.sets if ex_data.sets is not None else 3,
                    reps=ex_data.reps if ex_data.reps else "8-12",
                    rest_seconds=ex_data.rest_seconds if ex_data.rest_seconds is not None else 60,
                    notes=ex_data.notes,
                    order_index=ex_data.order_index if ex_data.order_index is not None else (idx + 1),
                )
                db.add(plan_ex)
        else:
            # Plan Generator v2: Rule-Based & Deterministic
            all_exercises = db.query(Exercise).order_by(Exercise.name.asc()).all()

            # Filter exercises matching user equipment
            eligible_exercises = [
                ex for ex in all_exercises
                if _matches_equipment(ex.equipment_required, equip)
            ]
            if not eligible_exercises:
                # Fallback to bodyweight if equipment filter leaves empty
                eligible_exercises = [
                    ex for ex in all_exercises
                    if _matches_equipment(ex.equipment_required, ["bodyweight"])
                ]

            split_structure = _get_split_structure(days)

            # Build each day deterministically
            global_order = 1
            for day_idx, (day_label, target_muscles) in enumerate(split_structure, start=1):
                day_exercises: List[Exercise] = []
                used_in_day: Set[UUID] = set()

                for muscle in target_muscles:
                    # Find candidates for this muscle group
                    candidates = [
                        ex for ex in eligible_exercises
                        if ex.primary_muscle.lower() == muscle.lower()
                        and ex.id not in used_in_day
                    ]

                    if not candidates:
                        # Try secondary muscles or matching category
                        candidates = [
                            ex for ex in eligible_exercises
                            if ex.id not in used_in_day
                            and any(m.lower() == muscle.lower() for m in (ex.secondary_muscles or []))
                        ]

                    if candidates:
                        # Deterministic compound sorting
                        candidates.sort(
                            key=lambda x: (
                                COMPOUND_PRIORITY.get(x.name, 3),
                                x.name,
                            )
                        )
                        selected_ex = candidates[0]
                        day_exercises.append(selected_ex)
                        used_in_day.add(selected_ex.id)

                # Ensure minimum 4 and maximum 6 exercises per day
                if len(day_exercises) < 4:
                    for ex in eligible_exercises:
                        if ex.id not in used_in_day:
                            day_exercises.append(ex)
                            used_in_day.add(ex.id)
                            if len(day_exercises) >= 4:
                                break

                # Sort day exercises so compound lifts (rank 1 and 2) are strictly placed first
                day_exercises.sort(
                    key=lambda x: (
                        COMPOUND_PRIORITY.get(x.name, 3),
                        x.name,
                    )
                )
                day_exercises = day_exercises[:6]

                for order_in_day, ex in enumerate(day_exercises, start=1):
                    compound_rank = COMPOUND_PRIORITY.get(ex.name, 3)
                    sets, reps, rest = _configure_sets_and_reps(goal_name, compound_rank)

                    plan_ex = WorkoutPlanExercise(
                        plan_id=new_plan.id,
                        exercise_id=ex.id,
                        day_of_week=day_idx,
                        day_label=day_label,
                        sets=sets,
                        reps=reps,
                        rest_seconds=rest,
                        order_index=order_in_day,
                    )
                    db.add(plan_ex)
                    global_order += 1

        db.commit()

        created_plan = (
            db.query(WorkoutPlan)
            .options(
                joinedload(WorkoutPlan.plan_exercises).joinedload(WorkoutPlanExercise.exercise)
            )
            .filter(WorkoutPlan.id == new_plan.id)
            .first()
        )

        return WorkoutPlanResponse.model_validate(created_plan)

    @staticmethod
    def log_workout_session(
        db: Session,
        user: User,
        data: WorkoutLogCreate,
        idempotency_key: Optional[str] = None,
    ) -> Tuple[WorkoutLogResponse, bool]:
        fingerprint: Optional[str] = None

        if idempotency_key:
            if data.ended_at is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="ended_at is required for keyed workout submission",
                )

            fingerprint, _ = compute_request_fingerprint(data)

            # Initial lookup
            existing = (
                db.query(WorkoutLog)
                .options(
                    joinedload(WorkoutLog.logged_exercises).joinedload(WorkoutLogExercise.exercise)
                )
                .filter(
                    WorkoutLog.user_id == user.id,
                    WorkoutLog.idempotency_key == idempotency_key,
                )
                .first()
            )
            if existing:
                if existing.request_fingerprint == fingerprint:
                    return WorkoutService._enrich_log_response(db, user, existing), True
                else:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail={
                            "code": "idempotency_key_reused",
                            "message": "Idempotency key reused with different payload",
                        },
                    )

        if data.plan_id:
            plan = (
                db.query(WorkoutPlan)
                .filter(WorkoutPlan.id == data.plan_id, WorkoutPlan.user_id == user.id)
                .first()
            )
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workout plan not found or does not belong to user",
                )

        if data.logged_exercises and len(data.logged_exercises) > 0:
            requested_ids = [item.exercise_id for item in data.logged_exercises]
            unique_requested_ids = set(requested_ids)
            existing_count = db.query(Exercise).filter(Exercise.id.in_(unique_requested_ids)).count()

            if existing_count < len(unique_requested_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more exercise IDs do not exist",
                )

        started_at_utc = data.started_at
        if started_at_utc.tzinfo is not None:
            started_at_utc = started_at_utc.astimezone(timezone.utc)
        else:
            started_at_utc = started_at_utc.replace(tzinfo=timezone.utc)

        ended_at_utc = data.ended_at or datetime.now(timezone.utc)
        if ended_at_utc.tzinfo is not None:
            ended_at_utc = ended_at_utc.astimezone(timezone.utc)
        else:
            ended_at_utc = ended_at_utc.replace(tzinfo=timezone.utc)

        # Race-safe write transaction
        try:
            log = WorkoutLog(
                user_id=user.id,
                plan_id=data.plan_id,
                started_at=started_at_utc,
                ended_at=ended_at_utc,
                notes=data.notes,
                idempotency_key=idempotency_key,
                request_fingerprint=fingerprint,
            )
            db.add(log)
            db.flush()

            for item in data.logged_exercises or []:
                norm_w = normalize_weight(item.weight_kg)
                log_ex = WorkoutLogExercise(
                    log_id=log.id,
                    exercise_id=item.exercise_id,
                    set_number=item.set_number,
                    reps_completed=item.reps_completed,
                    weight_kg=Decimal(norm_w) if norm_w is not None else None,
                    rpe=item.rpe,
                    notes=item.notes,
                )
                db.add(log_ex)

            db.commit()
        except IntegrityError as exc:
            db.rollback()
            if idempotency_key:
                err_str = str(exc).lower()
                is_idempotency_conflict = (
                    "uq_workout_logs_user_idempotency" in err_str
                    or "workout_logs.idempotency_key" in err_str
                    or "idempotency_key" in err_str
                )
                if is_idempotency_conflict:
                    winner = (
                        db.query(WorkoutLog)
                        .options(
                            joinedload(WorkoutLog.logged_exercises).joinedload(WorkoutLogExercise.exercise)
                        )
                        .filter(
                            WorkoutLog.user_id == user.id,
                            WorkoutLog.idempotency_key == idempotency_key,
                        )
                        .first()
                    )
                    if winner:
                        if winner.request_fingerprint == fingerprint:
                            return WorkoutService._enrich_log_response(db, user, winner), True
                        else:
                            raise HTTPException(
                                status_code=status.HTTP_409_CONFLICT,
                                detail={
                                    "code": "idempotency_key_reused",
                                    "message": "Idempotency key reused with different payload",
                                },
                            )
            raise exc

        created_log = (
            db.query(WorkoutLog)
            .options(
                joinedload(WorkoutLog.logged_exercises).joinedload(WorkoutLogExercise.exercise),
                joinedload(WorkoutLog.plan),
            )
            .filter(WorkoutLog.id == log.id)
            .first()
        )

        return WorkoutService._enrich_log_response(db, user, created_log), False

    @staticmethod
    def _enrich_log_response(db: Session, user: User, log: WorkoutLog) -> WorkoutLogResponse:
        """Enriches WorkoutLog with duration, volume, sets completed, and PR flags."""
        resp = WorkoutLogResponse.model_validate(log)

        if log.ended_at and log.started_at:
            resp.duration_seconds = max(0, int((log.ended_at - log.started_at).total_seconds()))

        total_vol = 0.0
        completed_count = 0
        for item in log.logged_exercises:
            w = float(item.weight_kg) if item.weight_kg is not None else 0.0
            r = item.reps_completed or 0
            if r > 0:
                completed_count += 1
                total_vol += w * r

        resp.total_volume_kg = round(total_vol, 2)
        resp.total_sets_completed = completed_count
        resp.name = log.plan.name if log.plan else "Workout Session"

        # Determine Personal Records (PR) for sets in this log
        exercise_ids = {item.exercise_id for item in log.logged_exercises}
        if exercise_ids:
            # For each exercise, find max weight logged prior to this session
            max_weights: Dict[UUID, float] = {}
            for ex_id in exercise_ids:
                max_row = (
                    db.query(func.max(WorkoutLogExercise.weight_kg))
                    .join(WorkoutLog, WorkoutLog.id == WorkoutLogExercise.log_id)
                    .filter(
                        WorkoutLog.user_id == user.id,
                        WorkoutLogExercise.exercise_id == ex_id,
                        WorkoutLog.started_at < log.started_at,
                    )
                    .scalar()
                )
                max_weights[ex_id] = float(max_row) if max_row is not None else 0.0

            for set_resp in resp.logged_exercises:
                ex_max = max_weights.get(set_resp.exercise_id, 0.0)
                set_w = float(set_resp.weight_kg) if set_resp.weight_kg is not None else 0.0
                if set_w > 0.0 and (ex_max == 0.0 or set_w >= ex_max) and (set_resp.reps_completed or 0) > 0:
                    set_resp.is_personal_record = True

        return resp

    @staticmethod
    def get_workout_logs(
        db: Session, user: User, limit: int = 20, skip: int = 0
    ) -> List[WorkoutLogResponse]:
        logs = (
            db.query(WorkoutLog)
            .options(
                joinedload(WorkoutLog.logged_exercises).joinedload(WorkoutLogExercise.exercise),
                joinedload(WorkoutLog.plan),
            )
            .filter(WorkoutLog.user_id == user.id)
            .order_by(WorkoutLog.started_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [WorkoutService._enrich_log_response(db, user, l) for l in logs]

    @staticmethod
    def get_workout_log_by_id(
        db: Session, user: User, log_id: UUID
    ) -> Optional[WorkoutLogResponse]:
        log = (
            db.query(WorkoutLog)
            .options(
                joinedload(WorkoutLog.logged_exercises).joinedload(WorkoutLogExercise.exercise),
                joinedload(WorkoutLog.plan),
            )
            .filter(WorkoutLog.user_id == user.id, WorkoutLog.id == log_id)
            .first()
        )
        if not log:
            return None
        return WorkoutService._enrich_log_response(db, user, log)

    @staticmethod
    def get_last_performance(
        db: Session, user: User, exercise_ids: List[UUID]
    ) -> LastPerformanceResponse:
        """Retrieves user's most recent performance sets for each requested exercise."""
        performances: Dict[str, LastPerformanceItemResponse] = {}

        for ex_id in exercise_ids:
            # Find the most recent workout log containing this exercise
            latest_log_id_subq = (
                db.query(WorkoutLog.id, WorkoutLog.started_at)
                .join(WorkoutLogExercise, WorkoutLogExercise.log_id == WorkoutLog.id)
                .filter(
                    WorkoutLog.user_id == user.id,
                    WorkoutLogExercise.exercise_id == ex_id,
                )
                .order_by(desc(WorkoutLog.started_at))
                .first()
            )

            if not latest_log_id_subq:
                continue

            latest_log_id, last_performed_at = latest_log_id_subq

            # Fetch the sets from that session
            sets = (
                db.query(WorkoutLogExercise)
                .filter(
                    WorkoutLogExercise.log_id == latest_log_id,
                    WorkoutLogExercise.exercise_id == ex_id,
                )
                .order_by(WorkoutLogExercise.set_number.asc())
                .all()
            )

            set_responses: List[LastPerformanceSetResponse] = []
            best_weight = 0.0
            best_reps = 0

            for s in sets:
                w = float(s.weight_kg) if s.weight_kg is not None else None
                r = s.reps_completed
                if w and w > best_weight:
                    best_weight = w
                if r and r > best_reps:
                    best_reps = r

                set_responses.append(
                    LastPerformanceSetResponse(
                        set_number=s.set_number,
                        weight_kg=w,
                        reps_completed=r,
                        rpe=s.rpe,
                    )
                )

            performances[str(ex_id)] = LastPerformanceItemResponse(
                exercise_id=ex_id,
                last_performed_at=last_performed_at,
                sets=set_responses,
                best_weight_kg=best_weight if best_weight > 0 else None,
                best_reps=best_reps if best_reps > 0 else None,
            )

        return LastPerformanceResponse(performances=performances)
