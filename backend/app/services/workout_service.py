from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
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
    WorkoutLogCreate,
    WorkoutLogResponse,
)
from app.services.exercise_service import ExerciseService


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

        db.query(WorkoutPlan).filter(
            WorkoutPlan.user_id == user.id, WorkoutPlan.is_active == True
        ).update({"is_active": False})

        user_profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        active_goal = db.query(Goal).filter(Goal.user_id == user.id, Goal.is_active == True).first()

        goal_name = active_goal.goal_type if active_goal else "General Fitness"
        equip = user_profile.equipment if user_profile and user_profile.equipment else ["bodyweight"]

        plan_name = data.name if data and data.name else f"Calibrated {goal_name.replace('_', ' ').title()} Routine"
        days = data.days_per_week if data and data.days_per_week else 4

        new_plan = WorkoutPlan(
            user_id=user.id,
            name=plan_name,
            days_per_week=days,
            is_active=True,
            ai_generated=False,
        )
        db.add(new_plan)
        db.flush()

        if data and data.exercises and len(data.exercises) > 0:
            # Validate every supplied exercise_id exists
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
                    sets=ex_data.sets if ex_data.sets is not None else 3,
                    reps=ex_data.reps if ex_data.reps else "10-15",
                    rest_seconds=ex_data.rest_seconds if ex_data.rest_seconds is not None else 60,
                    notes=ex_data.notes,
                    order_index=ex_data.order_index if ex_data.order_index is not None else (idx + 1),
                )
                db.add(plan_ex)
        else:
            # Find matching exercises in DB based on available equipment
            available_exercises = db.query(Exercise).all()
            selected_exercises = []

            for ex in available_exercises:
                req_equip = ex.equipment_required or ["bodyweight"]
                if any(e in equip or e == "bodyweight" for e in req_equip):
                    selected_exercises.append(ex)

            if not selected_exercises:
                selected_exercises = available_exercises[:4]

            # Add exercises to plan across days
            for idx, ex in enumerate(selected_exercises[:6]):
                day = (idx % days) + 1
                plan_ex = WorkoutPlanExercise(
                    plan_id=new_plan.id,
                    exercise_id=ex.id,
                    day_of_week=day,
                    sets=3,
                    reps="8-12" if "strength" in (ex.category or "") else "10-15",
                    rest_seconds=60,
                    order_index=idx + 1,
                )
                db.add(plan_ex)

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
    def log_workout_session(db: Session, user: User, data: WorkoutLogCreate) -> WorkoutLogResponse:
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
            # Validate all exercise IDs exist
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

        log = WorkoutLog(
            user_id=user.id,
            plan_id=data.plan_id,
            started_at=started_at_utc,
            ended_at=ended_at_utc,
            notes=data.notes,
        )
        db.add(log)
        db.flush()

        for item in data.logged_exercises or []:
            log_ex = WorkoutLogExercise(
                log_id=log.id,
                exercise_id=item.exercise_id,
                set_number=item.set_number,
                reps_completed=item.reps_completed,
                weight_kg=item.weight_kg,
                rpe=item.rpe,
                notes=item.notes,
            )
            db.add(log_ex)

        db.commit()

        created_log = (
            db.query(WorkoutLog)
            .options(
                joinedload(WorkoutLog.logged_exercises).joinedload(WorkoutLogExercise.exercise)
            )
            .filter(WorkoutLog.id == log.id)
            .first()
        )

        return WorkoutLogResponse.model_validate(created_log)

    @staticmethod
    def get_workout_logs(
        db: Session, user: User, limit: int = 20, skip: int = 0
    ) -> List[WorkoutLogResponse]:
        logs = (
            db.query(WorkoutLog)
            .options(
                joinedload(WorkoutLog.logged_exercises).joinedload(WorkoutLogExercise.exercise)
            )
            .filter(WorkoutLog.user_id == user.id)
            .order_by(WorkoutLog.started_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [WorkoutLogResponse.model_validate(l) for l in logs]

    @staticmethod
    def get_workout_log_by_id(
        db: Session, user: User, log_id: UUID
    ) -> Optional[WorkoutLogResponse]:
        log = (
            db.query(WorkoutLog)
            .options(
                joinedload(WorkoutLog.logged_exercises).joinedload(WorkoutLogExercise.exercise)
            )
            .filter(WorkoutLog.user_id == user.id, WorkoutLog.id == log_id)
            .first()
        )
        if not log:
            return None
        return WorkoutLogResponse.model_validate(log)
