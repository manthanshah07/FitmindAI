import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.workout import WorkoutPlan, WorkoutLog, WorkoutLogExercise
from app.models.nutrition import MealLog, MealLogItem
from app.models.progress import Measurement
from app.models.fitness_score import FitnessScore
from app.models.ai_memory import AIMemory
from app.models.chat_message import ChatMessage
from app.models.refresh_token import RefreshToken
from app.core.security import verify_password

logger = logging.getLogger(__name__)


class UserService:
    @staticmethod
    def export_user_data(db: Session, user: User) -> Dict[str, Any]:
        """
        Gathers and returns all data records belonging to the authenticated user.
        Strict user data isolation enforced across all database queries.
        """
        # 1. User & Profile
        user_info = {
            "id": str(user.id),
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
        }

        profile_record = db.query(Profile).filter(Profile.user_id == user.id).first()
        profile_data = None
        if profile_record:
            profile_data = {
                "full_name": profile_record.full_name,
                "date_of_birth": profile_record.date_of_birth.isoformat() if profile_record.date_of_birth else None,
                "gender": profile_record.gender,
                "height_cm": float(profile_record.height_cm) if profile_record.height_cm is not None else None,
                "weight_kg": float(profile_record.weight_kg) if profile_record.weight_kg is not None else None,
                "activity_level": profile_record.activity_level,
                "diet_preference": profile_record.diet_preference,
                "equipment": profile_record.equipment,
                "medical_notes": profile_record.medical_notes,
                "timezone": profile_record.timezone,
                "preferred_workout_duration_minutes": profile_record.preferred_workout_duration_minutes,
                "target_workout_days_per_week": profile_record.target_workout_days_per_week,
                "onboarding_complete": profile_record.onboarding_complete,
            }

        # 2. Goals
        goals = db.query(Goal).filter(Goal.user_id == user.id).order_by(Goal.created_at.desc()).all()
        goals_data = [
            {
                "id": str(g.id),
                "goal_type": g.goal_type,
                "target_weight_kg": float(g.target_weight_kg) if g.target_weight_kg is not None else None,
                "target_date": g.target_date.isoformat() if g.target_date else None,
                "is_active": g.is_active,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in goals
        ]

        # 3. Workout Plans
        plans = (
            db.query(WorkoutPlan)
            .options(joinedload(WorkoutPlan.plan_exercises))
            .filter(WorkoutPlan.user_id == user.id)
            .all()
        )
        plans_data = []
        for p in plans:
            plans_data.append({
                "id": str(p.id),
                "name": p.name,
                "description": p.description,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "exercises": [
                    {
                        "exercise_id": str(pe.exercise_id),
                        "day_of_week": pe.day_of_week,
                        "day_label": pe.day_label,
                        "order_in_day": pe.order_in_day,
                        "sets": pe.sets,
                        "reps": pe.reps,
                    }
                    for pe in p.plan_exercises or []
                ],
            })

        # 4. Workout Logs
        workout_logs = (
            db.query(WorkoutLog)
            .options(joinedload(WorkoutLog.logged_exercises))
            .filter(WorkoutLog.user_id == user.id)
            .order_by(WorkoutLog.started_at.desc())
            .all()
        )
        logs_data = []
        for wl in workout_logs:
            logs_data.append({
                "id": str(wl.id),
                "name": wl.name,
                "started_at": wl.started_at.isoformat() if wl.started_at else None,
                "ended_at": wl.ended_at.isoformat() if wl.ended_at else None,
                "duration_seconds": wl.duration_seconds,
                "total_volume_kg": float(wl.total_volume_kg) if wl.total_volume_kg is not None else None,
                "total_sets_completed": wl.total_sets_completed,
                "notes": wl.notes,
                "exercises": [
                    {
                        "exercise_id": str(le.exercise_id),
                        "set_number": le.set_number,
                        "reps_completed": le.reps_completed,
                        "weight_kg": float(le.weight_kg) if le.weight_kg is not None else None,
                        "rpe": float(le.rpe) if le.rpe is not None else None,
                        "notes": le.notes,
                    }
                    for le in wl.logged_exercises or []
                ],
            })

        # 5. Meal Logs
        meal_logs = (
            db.query(MealLog)
            .options(joinedload(MealLog.items))
            .filter(MealLog.user_id == user.id)
            .order_by(MealLog.logged_at.desc())
            .all()
        )
        meal_data = []
        for ml in meal_logs:
            meal_data.append({
                "id": str(ml.id),
                "meal_type": ml.meal_type,
                "logged_at": ml.logged_at.isoformat() if ml.logged_at else None,
                "notes": ml.notes,
                "items": [
                    {
                        "food_id": str(it.food_id),
                        "quantity_grams": float(it.quantity_grams) if it.quantity_grams is not None else None,
                        "calculated_calories": float(it.calculated_calories) if it.calculated_calories is not None else None,
                        "calculated_protein": float(it.calculated_protein) if it.calculated_protein is not None else None,
                        "calculated_carbs": float(it.calculated_carbs) if it.calculated_carbs is not None else None,
                        "calculated_fat": float(it.calculated_fat) if it.calculated_fat is not None else None,
                    }
                    for it in ml.items or []
                ],
            })

        # 6. Body Measurements
        measurements = (
            db.query(Measurement)
            .filter(Measurement.user_id == user.id)
            .order_by(Measurement.measured_at.desc())
            .all()
        )
        measurements_data = [
            {
                "id": str(m.id),
                "measured_at": m.measured_at.isoformat() if m.measured_at else None,
                "weight_kg": float(m.weight_kg) if m.weight_kg is not None else None,
                "chest_cm": float(m.chest_cm) if m.chest_cm is not None else None,
                "waist_cm": float(m.waist_cm) if m.waist_cm is not None else None,
                "hips_cm": float(m.hips_cm) if m.hips_cm is not None else None,
                "bicep_cm": float(m.bicep_cm) if m.bicep_cm is not None else None,
                "thigh_cm": float(m.thigh_cm) if m.thigh_cm is not None else None,
                "body_fat_pct": float(m.body_fat_pct) if m.body_fat_pct is not None else None,
            }
            for m in measurements
        ]

        # 7. Fitness Scores
        scores = (
            db.query(FitnessScore)
            .filter(FitnessScore.user_id == user.id)
            .order_by(FitnessScore.period_end.desc())
            .all()
        )
        scores_data = [
            {
                "id": str(s.id),
                "score": s.score,
                "workout_adherence_pct": float(s.workout_adherence_pct) if s.workout_adherence_pct is not None else None,
                "nutrition_score": float(s.nutrition_score) if s.nutrition_score is not None else None,
                "protein_score": float(s.protein_score) if s.protein_score is not None else None,
                "consistency_score": float(s.consistency_score) if s.consistency_score is not None else None,
                "period_start": s.period_start.isoformat() if s.period_start else None,
                "period_end": s.period_end.isoformat() if s.period_end else None,
            }
            for s in scores
        ]

        # 8. AI Memories
        memories = (
            db.query(AIMemory)
            .filter(AIMemory.user_id == user.id)
            .all()
        )
        memories_data = [
            {
                "key": mem.key,
                "value": mem.value,
                "memory_type": mem.memory_type,
                "confidence_score": float(mem.confidence_score) if mem.confidence_score is not None else None,
            }
            for mem in memories
        ]

        # 9. Chat Messages
        chats = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == user.id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )
        chats_data = [
            {
                "id": str(c.id),
                "role": c.role,
                "content": c.content,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in chats
        ]

        return {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "user": user_info,
            "profile": profile_data,
            "goals": goals_data,
            "workout_plans": plans_data,
            "workout_logs": logs_data,
            "meal_logs": meal_data,
            "measurements": measurements_data,
            "fitness_scores": scores_data,
            "ai_memories": memories_data,
            "chat_messages": chats_data,
        }

    @staticmethod
    def delete_user_account(db: Session, user: User, password: str) -> None:
        """
        Completely removes the user's data and account after password verification.
        Revokes all refresh tokens and cascades child records.
        """
        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect password confirmation",
            )

        # 1. Delete dependent records explicitly to guarantee cascade on SQLite and PostgreSQL
        db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete(synchronize_session=False)
        db.query(ChatMessage).filter(ChatMessage.user_id == user.id).delete(synchronize_session=False)
        db.query(AIMemory).filter(AIMemory.user_id == user.id).delete(synchronize_session=False)
        db.query(FitnessScore).filter(FitnessScore.user_id == user.id).delete(synchronize_session=False)
        db.query(Measurement).filter(Measurement.user_id == user.id).delete(synchronize_session=False)

        # Meal logs and items
        user_meal_log_ids = [m.id for m in db.query(MealLog.id).filter(MealLog.user_id == user.id).all()]
        if user_meal_log_ids:
            db.query(MealLogItem).filter(MealLogItem.meal_log_id.in_(user_meal_log_ids)).delete(synchronize_session=False)
            db.query(MealLog).filter(MealLog.user_id == user.id).delete(synchronize_session=False)

        # Workout logs and exercises
        user_workout_log_ids = [w.id for w in db.query(WorkoutLog.id).filter(WorkoutLog.user_id == user.id).all()]
        if user_workout_log_ids:
            db.query(WorkoutLogExercise).filter(WorkoutLogExercise.workout_log_id.in_(user_workout_log_ids)).delete(synchronize_session=False)
            db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id).delete(synchronize_session=False)

        # Workout plans
        db.query(WorkoutPlan).filter(WorkoutPlan.user_id == user.id).delete(synchronize_session=False)

        # Goals and Profile
        db.query(Goal).filter(Goal.user_id == user.id).delete(synchronize_session=False)
        db.query(Profile).filter(Profile.user_id == user.id).delete(synchronize_session=False)

        # 2. Delete user
        db.delete(user)
        db.commit()
