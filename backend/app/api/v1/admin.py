import os
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.seed_demo_data import seed_test_subjects, seed_demo_data

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/seed-test-subjects", status_code=status.HTTP_200_OK)
@router.post("/seed-demo", status_code=status.HTTP_200_OK)
def trigger_test_subjects_seeding(
    x_admin_secret: str = Header(..., description="Admin authorization secret header"),
    db: Session = Depends(get_db),
):
    """
    Trigger production test subject data seeding via HTTP POST request.
    Requires header `X-Admin-Secret` matching ADMIN_SEED_SECRET or JWT_SECRET.
    """
    expected_secret = os.getenv("ADMIN_SEED_SECRET", settings.JWT_SECRET)
    if not x_admin_secret or x_admin_secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin authorization secret header",
        )

    # Force allow production seeding for explicit admin HTTP request
    os.environ["SEED_TEST_SUBJECTS_PRODUCTION"] = "true"
    os.environ["DEMO_SEED_PRODUCTION"] = "true"

    try:
        seeded_emails = seed_test_subjects(db)
        return {
            "status": "success",
            "message": f"Successfully seeded {len(seeded_emails)} test subject user accounts.",
            "seeded_emails": seeded_emails,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed test subjects: {str(e)}",
        )


@router.get("/verify-test-subjects", status_code=status.HTTP_200_OK)
def verify_test_subjects_health(
    db: Session = Depends(get_db),
):
    """
    Safe production health verification for the 10 test subject accounts.
    Returns database connection type and verification status per test subject without exposing secrets.
    """
    from app.models.user import User
    from app.core.security import verify_password
    from app.seed_demo_data import TEST_SUBJECTS_CONFIG, TEST_SUBJECT_PASSWORD, engine

    db_dialect = engine.dialect.name
    results = []
    total_valid = 0

    for cfg in TEST_SUBJECTS_CONFIG:
        email = cfg["email"]
        user = db.query(User).filter(User.email == email).first()

        if not user:
            results.append({
                "email": email,
                "exists": False,
                "is_active": False,
                "is_verified": False,
                "password_verified": False,
            })
            continue

        pwd_ok = verify_password(TEST_SUBJECT_PASSWORD, user.password_hash)

        is_valid = user.is_active and user.is_verified and pwd_ok

        if is_valid:
            total_valid += 1

        results.append({
            "email": email,
            "exists": True,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "password_verified": pwd_ok,
        })

    return {
        "status": "ok" if total_valid == len(TEST_SUBJECTS_CONFIG) else "incomplete",
        "database_type": db_dialect,
        "total_test_subjects": len(TEST_SUBJECTS_CONFIG),
        "valid_test_subjects": total_valid,
        "subjects": results,
    }


@router.get("/db-info", status_code=status.HTTP_200_OK)
def get_db_diagnostic_info(db: Session = Depends(get_db)):
    """
    Safe diagnostic endpoint returning DB provider, host (hostname only), table existence,
    user count, and test subject existence without exposing credentials or secrets.
    """
    from sqlalchemy import inspect
    from app.models.user import User
    from app.seed_demo_data import engine

    url = engine.url
    db_host = url.host or "local"
    db_name = url.database or "unknown"
    db_type = engine.dialect.name

    inspector = inspect(engine)
    has_users_table = inspector.has_table("users")

    total_users = 0
    demo_full_exists = False

    if has_users_table:
        total_users = db.query(User).count()
        demo_full_user = db.query(User).filter(User.email == "demo.full@fitmind.ai").first()
        demo_full_exists = demo_full_user is not None

    seed_env_var = os.getenv("SEED_TEST_SUBJECTS_PRODUCTION") or os.getenv("DEMO_SEED_PRODUCTION")

    return {
        "status": "ok",
        "database_type": db_type,
        "database_host": db_host,
        "database_name": db_name,
        "users_table_exists": has_users_table,
        "total_users_count": total_users,
        "demo_full_exists": demo_full_exists,
        "seed_env_var_value": seed_env_var,
    }


@router.post("/run-seeder", status_code=status.HTTP_200_OK)
def run_test_subjects_seeder(db: Session = Depends(get_db)):
    """
    Direct HTTP trigger to run test subject seeding on the connected database.
    """
    os.environ["SEED_TEST_SUBJECTS_PRODUCTION"] = "true"
    os.environ["DEMO_SEED_PRODUCTION"] = "true"
    try:
        seeded_emails = seed_test_subjects(db)
        return {
            "status": "success",
            "message": f"Successfully seeded {len(seeded_emails)} test subject user accounts.",
            "seeded_emails": seeded_emails,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed test subjects: {str(e)}",
        )



