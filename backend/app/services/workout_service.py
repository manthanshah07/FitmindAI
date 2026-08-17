from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
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
        log = WorkoutLog(
            user_id=user.id,
            plan_id=data.plan_id,
            started_at=data.started_at,
            ended_at=data.ended_at or datetime.now(timezone.utc),
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
