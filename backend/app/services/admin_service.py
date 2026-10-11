from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.admin_audit_log import AdminAuditLog
from app.models.chat_message import ChatMessage
from app.models.nutrition import Food, MealLog
from app.models.profile import Profile
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.models.workout import Exercise, WorkoutLog
from app.schemas.admin import (
    AdminAuditLogItem,
    AdminAuditLogListResponse,
    AdminExerciseItem,
    AdminExerciseListResponse,
    AdminExerciseUpdateRequest,
    AdminFoodItem,
    AdminFoodListResponse,
    AdminFoodUpdateRequest,
    AdminStatsResponse,
    AdminSystemHealth,
    AdminUserItem,
    AdminUserListResponse,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AdminService:
    @staticmethod
    def get_platform_stats(db: Session) -> AdminStatsResponse:
        now = utc_now()
        cutoff_7d = now - timedelta(days=7)
        cutoff_30d = now - timedelta(days=30)

        total_users = db.query(func.count(User.id)).scalar() or 0
        new_signups_7d = (
            db.query(func.count(User.id))
            .filter(User.created_at >= cutoff_7d)
            .scalar()
            or 0
        )

        # Active users in 7d / 30d: users with last_active_at or logged activity within window
        workout_users_7d = db.query(WorkoutLog.user_id).filter(WorkoutLog.started_at >= cutoff_7d)
        meal_users_7d = db.query(MealLog.user_id).filter(MealLog.logged_at >= cutoff_7d)
        chat_users_7d = db.query(ChatMessage.user_id).filter(ChatMessage.created_at >= cutoff_7d)

        active_users_7d = (
            db.query(func.count(User.id))
            .filter(
                or_(
                    User.last_active_at >= cutoff_7d,
                    User.id.in_(workout_users_7d),
                    User.id.in_(meal_users_7d),
                    User.id.in_(chat_users_7d),
                )
            )
            .scalar()
            or 0
        )

        workout_users_30d = db.query(WorkoutLog.user_id).filter(WorkoutLog.started_at >= cutoff_30d)
        meal_users_30d = db.query(MealLog.user_id).filter(MealLog.logged_at >= cutoff_30d)
        chat_users_30d = db.query(ChatMessage.user_id).filter(ChatMessage.created_at >= cutoff_30d)

        active_users_30d = (
            db.query(func.count(User.id))
            .filter(
                or_(
                    User.last_active_at >= cutoff_30d,
                    User.id.in_(workout_users_30d),
                    User.id.in_(meal_users_30d),
                    User.id.in_(chat_users_30d),
                )
            )
            .scalar()
            or 0
        )

        total_workouts_logged = db.query(func.count(WorkoutLog.id)).scalar() or 0
        total_meals_logged = db.query(func.count(MealLog.id)).scalar() or 0
        total_ai_messages = db.query(func.count(ChatMessage.id)).scalar() or 0

        ai_status = "configured" if getattr(settings, "GEMINI_API_KEY", None) else "fallback"

        return AdminStatsResponse(
            total_users=total_users,
            active_users_7d=active_users_7d,
            active_users_30d=active_users_30d,
            new_signups_7d=new_signups_7d,
            total_workouts_logged=total_workouts_logged,
            total_meals_logged=total_meals_logged,
            total_ai_messages=total_ai_messages,
            system_health=AdminSystemHealth(
                database_status="healthy",
                ai_provider_status=ai_status,
                formula_version=2,
            ),
        )

    @staticmethod
    def _build_admin_user_item(db: Session, user: User) -> AdminUserItem:
        workouts_count = (
            db.query(func.count(WorkoutLog.id))
            .filter(WorkoutLog.user_id == user.id)
            .scalar()
            or 0
        )
        meals_count = (
            db.query(func.count(MealLog.id))
            .filter(MealLog.user_id == user.id)
            .scalar()
            or 0
        )
        full_name = user.profile.full_name if user.profile else None

        return AdminUserItem(
            id=user.id,
            email=user.email,
            full_name=full_name,
            is_active=user.is_active,
            is_admin=user.is_admin,
            created_at=user.created_at,
            last_active_at=user.last_active_at,
            workouts_count=workouts_count,
            meals_count=meals_count,
        )

    @staticmethod
    def list_users(
        db: Session,
        q: Optional[str] = None,
        status_filter: Optional[str] = None,
        role_filter: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> AdminUserListResponse:
        query = db.query(User).outerjoin(Profile, Profile.user_id == User.id)

        if q and q.strip():
            term = f"%{q.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(User.email).like(term),
                    func.lower(func.coalesce(Profile.full_name, "")).like(term),
                )
            )

        if status_filter == "active":
            query = query.filter(User.is_active.is_(True))
        elif status_filter == "inactive":
            query = query.filter(User.is_active.is_(False))

        if role_filter == "admin":
            query = query.filter(User.is_admin.is_(True))
        elif role_filter == "member":
            query = query.filter(User.is_admin.is_(False))

        total = query.count()
        offset = max(0, (page - 1) * limit)
        users = (
            query.order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        items = [AdminService._build_admin_user_item(db, u) for u in users]
        return AdminUserListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
        )

    @staticmethod
    def update_user_status(
        db: Session,
        admin_user: User,
        target_user_id: UUID,
        req: UserStatusUpdateRequest,
    ) -> AdminUserItem:
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if admin_user.id == target_user.id and not req.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot deactivate their own account",
            )

        if target_user.is_admin and not req.is_active:
            active_admins_count = (
                db.query(func.count(User.id))
                .filter(User.is_admin.is_(True), User.is_active.is_(True))
                .scalar()
                or 0
            )
            if active_admins_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate the last remaining active admin",
                )

        prev_status = target_user.is_active
        target_user.is_active = req.is_active
        db.add(target_user)

        if not req.is_active:
            # Immediately revoke all active refresh tokens for the deactivated user
            now = utc_now()
            active_tokens = (
                db.query(RefreshToken)
                .filter(
                    RefreshToken.user_id == target_user.id,
                    RefreshToken.is_revoked.is_(False),
                )
                .all()
            )
            for token_row in active_tokens:
                token_row.is_revoked = True
                token_row.revoked_at = now
                db.add(token_row)

        action_name = "user.activate" if req.is_active else "user.deactivate"
        audit_entry = AdminAuditLog(
            admin_id=admin_user.id,
            action=action_name,
            target_user_id=target_user.id,
            details={
                "target_email": target_user.email,
                "previous_is_active": prev_status,
                "new_is_active": req.is_active,
                "reason": req.reason,
            },
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(target_user)

        return AdminService._build_admin_user_item(db, target_user)

    @staticmethod
    def update_user_role(
        db: Session,
        admin_user: User,
        target_user_id: UUID,
        req: UserRoleUpdateRequest,
    ) -> AdminUserItem:
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if admin_user.id == target_user.id and not req.is_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot demote their own account",
            )

        if target_user.is_admin and not req.is_admin:
            active_admins_count = (
                db.query(func.count(User.id))
                .filter(User.is_admin.is_(True), User.is_active.is_(True))
                .scalar()
                or 0
            )
            if active_admins_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot demote the last remaining active admin",
                )

        prev_role = target_user.is_admin
        target_user.is_admin = req.is_admin
        db.add(target_user)

        action_name = "user.promote_admin" if req.is_admin else "user.demote_admin"
        audit_entry = AdminAuditLog(
            admin_id=admin_user.id,
            action=action_name,
            target_user_id=target_user.id,
            details={
                "target_email": target_user.email,
                "previous_is_admin": prev_role,
                "new_is_admin": req.is_admin,
            },
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(target_user)

        return AdminService._build_admin_user_item(db, target_user)

    @staticmethod
    def list_exercises(
        db: Session,
        q: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> AdminExerciseListResponse:
        query = db.query(Exercise)
        if q and q.strip():
            term = f"%{q.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Exercise.name).like(term),
                    func.lower(Exercise.primary_muscle).like(term),
                )
            )
        total = query.count()
        offset = max(0, (page - 1) * limit)
        rows = query.order_by(Exercise.name.asc()).offset(offset).limit(limit).all()

        return AdminExerciseListResponse(
            items=[AdminExerciseItem.model_validate(r) for r in rows],
            total=total,
            page=page,
            limit=limit,
        )

    @staticmethod
    def update_exercise(
        db: Session,
        admin_user: User,
        exercise_id: UUID,
        req: AdminExerciseUpdateRequest,
    ) -> AdminExerciseItem:
        exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
        if not exercise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exercise not found",
            )

        changes = {}
        update_data = req.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            old_val = getattr(exercise, field, None)
            if old_val != value:
                setattr(exercise, field, value)
                changes[field] = {"from": old_val, "to": value}

        db.add(exercise)
        audit_entry = AdminAuditLog(
            admin_id=admin_user.id,
            action="content.update",
            target_user_id=None,
            details={
                "entity_type": "exercise",
                "entity_id": str(exercise.id),
                "name": exercise.name,
                "changes": changes,
            },
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(exercise)

        return AdminExerciseItem.model_validate(exercise)

    @staticmethod
    def list_foods(
        db: Session,
        q: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> AdminFoodListResponse:
        query = db.query(Food)
        if q and q.strip():
            term = f"%{q.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Food.name).like(term),
                    func.lower(func.coalesce(Food.brand, "")).like(term),
                )
            )
        total = query.count()
        offset = max(0, (page - 1) * limit)
        rows = query.order_by(Food.name.asc()).offset(offset).limit(limit).all()

        return AdminFoodListResponse(
            items=[
                AdminFoodItem(
                    id=r.id,
                    name=r.name,
                    brand=r.brand,
                    calories_per_100g=float(r.calories_per_100g),
                    protein_per_100g=float(r.protein_per_100g),
                    carbs_per_100g=float(r.carbs_per_100g),
                    fat_per_100g=float(r.fat_per_100g),
                    is_verified=bool(r.is_verified),
                    created_at=r.created_at,
                )
                for r in rows
            ],
            total=total,
            page=page,
            limit=limit,
        )

    @staticmethod
    def update_food(
        db: Session,
        admin_user: User,
        food_id: UUID,
        req: AdminFoodUpdateRequest,
    ) -> AdminFoodItem:
        food = db.query(Food).filter(Food.id == food_id).first()
        if not food:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Food not found",
            )

        changes = {}
        update_data = req.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            old_val = getattr(food, field, None)
            if isinstance(old_val, (int, float)) or hasattr(old_val, "__float__"):
                old_comparable = float(old_val) if not isinstance(old_val, bool) else old_val
            else:
                old_comparable = old_val
            if old_comparable != value:
                setattr(food, field, value)
                changes[field] = {"from": old_comparable, "to": value}

        db.add(food)
        audit_entry = AdminAuditLog(
            admin_id=admin_user.id,
            action="content.update",
            target_user_id=None,
            details={
                "entity_type": "food",
                "entity_id": str(food.id),
                "name": food.name,
                "changes": changes,
            },
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(food)

        return AdminFoodItem(
            id=food.id,
            name=food.name,
            brand=food.brand,
            calories_per_100g=float(food.calories_per_100g),
            protein_per_100g=float(food.protein_per_100g),
            carbs_per_100g=float(food.carbs_per_100g),
            fat_per_100g=float(food.fat_per_100g),
            is_verified=bool(food.is_verified),
            created_at=food.created_at,
        )

    @staticmethod
    def list_audit_logs(
        db: Session,
        page: int = 1,
        limit: int = 30,
    ) -> AdminAuditLogListResponse:
        query = db.query(AdminAuditLog)
        total = query.count()
        offset = max(0, (page - 1) * limit)
        rows = (
            query.order_by(AdminAuditLog.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        user_ids = set()
        for r in rows:
            if r.admin_id:
                user_ids.add(r.admin_id)
            if r.target_user_id:
                user_ids.add(r.target_user_id)

        email_map = {}
        if user_ids:
            users = db.query(User.id, User.email).filter(User.id.in_(user_ids)).all()
            email_map = {u.id: u.email for u in users}

        items = [
            AdminAuditLogItem(
                id=r.id,
                admin_id=r.admin_id,
                admin_email=email_map.get(r.admin_id),
                action=r.action,
                target_user_id=r.target_user_id,
                target_user_email=email_map.get(r.target_user_id) if r.target_user_id else None,
                details=r.details,
                created_at=r.created_at,
            )
            for r in rows
        ]

        return AdminAuditLogListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
        )
