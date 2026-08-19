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
