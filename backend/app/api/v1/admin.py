import os
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, require_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminAuditLogListResponse,
    AdminExerciseItem,
    AdminExerciseListResponse,
    AdminExerciseUpdateRequest,
    AdminFoodItem,
    AdminFoodListResponse,
    AdminFoodUpdateRequest,
    AdminStatsResponse,
    AdminUserItem,
    AdminUserListResponse,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
)
from app.seed_demo_data import seed_test_subjects, seed_demo_data
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.get_platform_stats(db)


@router.get("/users", response_model=AdminUserListResponse)
def list_admin_users(
    q: Optional[str] = Query(None, description="Search by email or name"),
    status: Optional[str] = Query(None, description="Filter by active | inactive"),
    role: Optional[str] = Query(None, description="Filter by admin | member"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.list_users(
        db=db,
        q=q,
        status_filter=status,
        role_filter=role,
        page=page,
        limit=limit,
    )


@router.post("/users/{user_id}/status", response_model=AdminUserItem)
@router.patch("/users/{user_id}/status", response_model=AdminUserItem)
def update_admin_user_status(
    user_id: UUID,
    req: UserStatusUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.update_user_status(
        db=db,
        admin_user=admin_user,
        target_user_id=user_id,
        req=req,
    )


@router.post("/users/{user_id}/role", response_model=AdminUserItem)
@router.patch("/users/{user_id}/role", response_model=AdminUserItem)
def update_admin_user_role(
    user_id: UUID,
    req: UserRoleUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.update_user_role(
        db=db,
        admin_user=admin_user,
        target_user_id=user_id,
        req=req,
    )


@router.get("/content/exercises", response_model=AdminExerciseListResponse)
def list_admin_exercises(
    q: Optional[str] = Query(None, description="Search exercise name or muscle"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.list_exercises(db=db, q=q, page=page, limit=limit)


@router.patch("/content/exercises/{exercise_id}", response_model=AdminExerciseItem)
def update_admin_exercise(
    exercise_id: UUID,
    req: AdminExerciseUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.update_exercise(
        db=db,
        admin_user=admin_user,
        exercise_id=exercise_id,
        req=req,
    )


@router.get("/content/foods", response_model=AdminFoodListResponse)
def list_admin_foods(
    q: Optional[str] = Query(None, description="Search food name or brand"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.list_foods(db=db, q=q, page=page, limit=limit)


@router.patch("/content/foods/{food_id}", response_model=AdminFoodItem)
def update_admin_food(
    food_id: UUID,
    req: AdminFoodUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.update_food(
        db=db,
        admin_user=admin_user,
        food_id=food_id,
        req=req,
    )


@router.get("/audit-log", response_model=AdminAuditLogListResponse)
def list_admin_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.list_audit_logs(db=db, page=page, limit=limit)


@router.post("/seed-demo", status_code=status.HTTP_200_OK)
@router.post("/seed-test-subjects", status_code=status.HTTP_200_OK)
def trigger_test_subjects_seeding(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Trigger test subject data seeding via authenticated HTTP POST request.
    Requires database-backed admin user authentication (is_admin == True).
    """
    os.environ["SEED_TEST_SUBJECTS_PRODUCTION"] = "true"
    os.environ["DEMO_SEED_PRODUCTION"] = "true"

    try:
        seeded_emails = seed_test_subjects(db)
        return {
            "status": "success",
            "message": f"Successfully seeded {len(seeded_emails)} test subject user accounts.",
            "count": len(seeded_emails),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed test subjects: {str(e)}",
        )


@router.get("/verify-test-subjects", status_code=status.HTTP_200_OK)
def verify_test_subjects_health(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated diagnostic endpoint verifying health of test subject accounts.
    Requires database-backed admin user authentication (is_admin == True).
    """
    from app.core.security import verify_password
    from app.seed_demo_data import TEST_SUBJECTS_CONFIG, TEST_SUBJECT_PASSWORD

    bind = db.get_bind()
    db_dialect = bind.dialect.name
    total_valid = 0

    for cfg in TEST_SUBJECTS_CONFIG:
        email = cfg["email"]
        user = db.query(User).filter(User.email == email).first()
        if not user:
            continue

        pwd_ok = verify_password(TEST_SUBJECT_PASSWORD, user.password_hash)
        if user.is_active and user.is_verified and pwd_ok:
            total_valid += 1

    return {
        "status": "ok" if total_valid == len(TEST_SUBJECTS_CONFIG) else "incomplete",
        "database_type": db_dialect,
        "total_test_subjects": len(TEST_SUBJECTS_CONFIG),
        "valid_test_subjects": total_valid,
    }


@router.get("/db-info", status_code=status.HTTP_200_OK)
def get_db_diagnostic_info(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated diagnostic endpoint returning database metrics.
    Requires database-backed admin user authentication (is_admin == True).
    """
    from sqlalchemy import inspect

    bind = db.get_bind()
    url = bind.url
    db_host = url.host or "local"
    db_name = url.database or "unknown"
    db_type = bind.dialect.name

    inspector = inspect(bind)
    has_users_table = inspector.has_table("users")

    total_users = 0
    demo_full_exists = False

    if has_users_table:
        total_users = db.query(User).count()
        demo_full_user = db.query(User).filter(User.email == "demo.full@fitmind.ai").first()
        demo_full_exists = demo_full_user is not None

    return {
        "status": "ok",
        "database_type": db_type,
        "database_host": db_host,
        "database_name": db_name,
        "users_table_exists": has_users_table,
        "total_users_count": total_users,
        "demo_full_exists": demo_full_exists,
    }
