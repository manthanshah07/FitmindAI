import pytest
from sqlalchemy.orm import Session
from tests.conftest import TestingSessionLocal

from app.models.user import User
from app.models.profile import Profile
from app.models.workout import WorkoutPlan, WorkoutLog
from app.models.nutrition import MealLog
from app.models.progress import Measurement
from app.models.ai_memory import AIMemory
from app.models.chat_message import ChatMessage
from app.models.fitness_score import FitnessScore
from app.seed_demo_data import seed_demo_data, DEMO_ACCOUNTS_CONFIG, DEMO_PASSWORD_PLAIN
from app.core.security import verify_password
from app.services.dashboard_service import DashboardService
from app.services.report_service import ReportService
from app.services.fitness_score_service import FitnessScoreService


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_seed_demo_data_creates_all_10_accounts(db: Session):
    seeded_emails = seed_demo_data(db)
    assert len(seeded_emails) == 10

    for cfg in DEMO_ACCOUNTS_CONFIG:
        email = cfg["email"]
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        assert verify_password(DEMO_PASSWORD_PLAIN, user.password_hash)
        assert user.profile is not None
        assert user.profile.full_name == cfg["full_name"]
        assert user.profile.timezone == cfg["timezone"]


def test_seed_demo_data_is_idempotent(db: Session):
    seed_demo_data(db)
    first_count = db.query(User).count()

    seeded_emails_2 = seed_demo_data(db)
    second_count = db.query(User).count()

    assert len(seeded_emails_2) == 10
    assert first_count == second_count


def test_demo_noplan_has_no_active_workout_plan(db: Session):
    seed_demo_data(db)
    user = db.query(User).filter(User.email == "demo.noplan@fitmind.ai").first()
    assert user is not None

    active_plan = (
        db.query(WorkoutPlan)
        .filter(WorkoutPlan.user_id == user.id, WorkoutPlan.is_active == True)
        .first()
    )
    assert active_plan is None
    assert user.profile.target_workout_days_per_week == 5
    assert user.profile.preferred_workout_duration_minutes == 60


def test_demo_timezone_uses_asia_kolkata(db: Session):
    seed_demo_data(db)
    user = db.query(User).filter(User.email == "demo.timezone@fitmind.ai").first()
    assert user is not None
    assert user.profile.timezone == "Asia/Kolkata"

    log_count = db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id).count()
    assert log_count > 0


def test_demo_seeding_does_not_affect_normal_non_demo_user(db: Session):
    normal_user = User(
        email="normal.athlete@example.com",
        password_hash="HashedPassword123!",
        is_active=True,
    )
    db.add(normal_user)
    db.commit()

    normal_id = normal_user.id

    seed_demo_data(db)

    preserved_user = db.query(User).filter(User.id == normal_id).first()
    assert preserved_user is not None
    assert preserved_user.email == "normal.athlete@example.com"


def test_seeded_data_works_with_dashboard_service(db: Session):
    seed_demo_data(db)
    full_user = db.query(User).filter(User.email == "demo.full@fitmind.ai").first()
    assert full_user is not None

    summary = DashboardService.get_dashboard_summary(db=db, user=full_user)
    assert summary.full_name == "Marcus Vance"
    assert summary.onboarding_complete is True
    assert summary.workout_plan is not None
    assert summary.weekly_summary.has_weekly_data is True


def test_seeded_data_works_with_report_service(db: Session):
    seed_demo_data(db)
    athlete_user = db.query(User).filter(User.email == "demo.athlete@fitmind.ai").first()
    assert athlete_user is not None

    report = ReportService.generate_weekly_report(
        db=db, user=athlete_user, include_ai_narrative=False
    )
    assert report.workouts.workouts_completed > 0
    assert report.nutrition.logged_days_count > 0
    assert report.adherence_score is not None


def test_seeded_ai_data_contains_no_medical_notes(db: Session):
    seed_demo_data(db)
    ai_user = db.query(User).filter(User.email == "demo.ai@fitmind.ai").first()
    assert ai_user is not None

    assert not ai_user.profile.medical_notes

    memories = db.query(AIMemory).filter(AIMemory.user_id == ai_user.id).all()
    chats = db.query(ChatMessage).filter(ChatMessage.user_id == ai_user.id).all()

    assert len(memories) >= 2
    assert len(chats) >= 2
    for m in memories:
        assert "medical" not in m.key.lower()
        assert "injury" not in m.value.lower()


def test_fitness_score_service_remains_authoritative(db: Session):
    seed_demo_data(db)
    progress_user = db.query(User).filter(User.email == "demo.progress@fitmind.ai").first()
    assert progress_user is not None

    scores = db.query(FitnessScore).filter(FitnessScore.user_id == progress_user.id).all()
    assert len(scores) > 0


def test_demo_full_authentication_flow(db: Session):
    from fastapi.testclient import TestClient
    from app.main import app

    seed_demo_data(db)
    client = TestClient(app)

    res = client.post("/api/v1/auth/login", json={"email": "demo.full@fitmind.ai", "password": DEMO_PASSWORD_PLAIN})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "demo.full@fitmind.ai"


def test_inactive_and_wrong_password_auth_behavior(db: Session):
    from fastapi.testclient import TestClient
    from app.main import app

    db.rollback()
    seed_demo_data(db)
    client = TestClient(app)


    # Wrong password returns 401
    bad_pw_res = client.post("/api/v1/auth/login", json={"email": "demo.full@fitmind.ai", "password": "WrongPassword123!"})
    assert bad_pw_res.status_code == 401
    assert bad_pw_res.json()["detail"] == "Invalid email or password"

    # Inactive user returns 403
    user = db.query(User).filter(User.email == "demo.full@fitmind.ai").first()
    user.is_active = False
    db.commit()

    inactive_res = client.post("/api/v1/auth/login", json={"email": "demo.full@fitmind.ai", "password": DEMO_PASSWORD_PLAIN})
    assert inactive_res.status_code == 403
    assert inactive_res.json()["detail"] == "Account is inactive"


def test_database_configuration_alignment():
    from app.core.config import settings
    from app.core.database import engine

    assert str(engine.url) == settings.DATABASE_URL


def test_production_safety_check_blocks_unauthorized_execution(db: Session, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.delenv("DEMO_SEED_PRODUCTION", raising=False)
    monkeypatch.delenv("DEMO_SEED_ALLOW", raising=False)

    with pytest.raises(RuntimeError) as exc_info:
        seed_demo_data(db)
    assert "SAFETY BLOCK" in str(exc_info.value)


def test_admin_trigger_demo_seeding_endpoint(db: Session):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.models.user import User
    from app.core.security import create_access_token

    client = TestClient(app)

    # 1. Unauthenticated (no JWT) -> 401
    res_unauth = client.post("/api/v1/admin/seed-demo")
    assert res_unauth.status_code == 401

    # 2. Non-admin user -> 403
    non_admin_user = User(email="normal_user_seed@example.com", password_hash="hash123", is_admin=False)
    db.add(non_admin_user)
    db.commit()
    db.refresh(non_admin_user)

    normal_token = create_access_token({"sub": str(non_admin_user.id)})
    res_forbidden = client.post(
        "/api/v1/admin/seed-demo",
        headers={"Authorization": f"Bearer {normal_token}"},
    )
    assert res_forbidden.status_code == 403

    # 3. Admin user -> 200 Success
    admin_user = User(email="admin_user_seed@example.com", password_hash="hash123", is_admin=True)
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    admin_token = create_access_token({"sub": str(admin_user.id)})
    res_success = client.post(
        "/api/v1/admin/seed-demo",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_success.status_code == 200
    data = res_success.json()
    assert data["status"] == "success"
    assert data["count"] == 10
    assert "seeded_emails" not in data


def test_verify_test_subjects_health_endpoint_requires_auth(db: Session):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.models.user import User
    from app.core.security import create_access_token

    db.rollback()
    seed_demo_data(db)

    client = TestClient(app)

    # Unauthenticated request blocked (401)
    res_unauth = client.get("/api/v1/admin/verify-test-subjects")
    assert res_unauth.status_code == 401

    # Admin request succeeds
    admin_user = User(email="admin_health@example.com", password_hash="hash123", is_admin=True)
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    admin_token = create_access_token({"sub": str(admin_user.id)})
    res = client.get(
        "/api/v1/admin/verify-test-subjects",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["total_test_subjects"] == 10
    assert data["valid_test_subjects"] == 10


def test_db_diagnostic_info_and_removed_dangerous_endpoints(db: Session):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.models.user import User
    from app.core.security import create_access_token

    client = TestClient(app)

    # Unauthenticated access to /admin/db-info blocked (401)
    res_unauth = client.get("/api/v1/admin/db-info")
    assert res_unauth.status_code == 401

    # Authenticated admin request to /admin/db-info succeeds
    admin_user = User(email="admin_dbinfo@example.com", password_hash="hash123", is_admin=True)
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    admin_token = create_access_token({"sub": str(admin_user.id)})
    res_info = client.get(
        "/api/v1/admin/db-info",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_info.status_code == 200
    info_data = res_info.json()
    assert info_data["status"] == "ok"
    assert info_data["users_table_exists"] is True

    # Dangerous unauthenticated endpoints /run-seeder and /migrate remain removed (404)
    res_run_seeder = client.post("/api/v1/admin/run-seeder")
    assert res_run_seeder.status_code == 404

    res_migrate = client.post("/api/v1/admin/migrate")





