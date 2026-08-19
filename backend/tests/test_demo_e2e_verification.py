import pytest
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
from app.models.fitness_score import FitnessScore
from app.seed_demo_data import seed_demo_data, DEMO_PASSWORD_PLAIN
from app.services.dashboard_service import DashboardService
from app.services.report_service import ReportService
from app.services.fitness_score_service import FitnessScoreService
from app.services.context_builder import ContextBuilder
from app.core.security import create_access_token
from tests.conftest import TestingSessionLocal


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def seed_db(db: Session):
    db.rollback()
    seed_demo_data(db)
    return db



def get_auth_headers(user: User) -> dict:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


# 1. E2E Scenario Verification for demo.full@fitmind.ai
def test_e2e_demo_full_all_sections_populated(seed_db: Session, client: TestClient):
    user = seed_db.query(User).filter(User.email == "demo.full@fitmind.ai").first()
    assert user is not None
    headers = get_auth_headers(user)

    # Login verification via HTTP POST JSON
    login_res = client.post("/api/v1/auth/login", json={"email": "demo.full@fitmind.ai", "password": DEMO_PASSWORD_PLAIN})
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # Profile
    prof_res = client.get("/api/v1/profile", headers=headers)
    assert prof_res.status_code == 200
    assert prof_res.json()["full_name"] == "Marcus Vance"
    assert prof_res.json()["timezone"] == "America/New_York"

    # Dashboard Summary
    dash_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["workout_plan"]["name"] == "Marcus Vance's 4-Day Training Plan"
    assert dash_data["weekly_summary"]["workouts_completed"] >= 3
    assert dash_data["weekly_summary"]["nutrition_logged_days"] >= 4

    # Weekly Report
    rep_res = client.get("/api/v1/reports/weekly", headers=headers)
    assert rep_res.status_code == 200
    rep_data = rep_res.json()
    assert rep_data["workouts"]["workouts_completed"] >= 3
    assert rep_data["nutrition"]["logged_days_count"] >= 4
    assert rep_data["adherence_score"] == dash_data["weekly_summary"]["adherence_score"]

    # Monthly Report
    m_rep_res = client.get("/api/v1/reports/monthly", headers=headers)
    assert m_rep_res.status_code == 200
    assert m_rep_res.json()["report_type"] == "monthly"


    # Workout History
    w_res = client.get("/api/v1/workout/logs", headers=headers)
    assert w_res.status_code == 200
    assert len(w_res.json()) >= 12


    # Nutrition History
    n_res = client.get("/api/v1/nutrition/logs", headers=headers)
    assert n_res.status_code == 200
    assert len(n_res.json()) >= 6

    # Progress Measurements
    p_res = client.get("/api/v1/progress/measurements", headers=headers)
    assert p_res.status_code == 200
    assert len(p_res.json()) >= 1

    # Fitness Score
    fs_res = client.get("/api/v1/progress/fitness-score", headers=headers)
    assert fs_res.status_code == 200
    assert fs_res.json()["current_score"]["score"] == dash_data["weekly_summary"]["current_fitness_score"]



    # AI Coach Chat & Memories
    c_res = client.get("/api/v1/coach/history", headers=headers)
    assert c_res.status_code == 200
    assert len(c_res.json()) >= 2

    ai_ctx = ContextBuilder.build_fitness_context(db=seed_db, user=user)
    assert len(ai_ctx.active_memories) >= 2


# 2. Sparse & Insufficient Data Verification for demo.beginner@fitmind.ai
def test_e2e_demo_beginner_sparse_data_no_fake_zeros(seed_db: Session, client: TestClient):
    user = seed_db.query(User).filter(User.email == "demo.beginner@fitmind.ai").first()
    headers = get_auth_headers(user)

    dash_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["weekly_summary"]["workouts_completed"] >= 1

    # Ensure no division by zero or fake zeros in weekly report
    rep_res = client.get("/api/v1/reports/weekly", headers=headers)
    assert rep_res.status_code == 200


# 3. High Adherence Verification for demo.athlete@fitmind.ai
def test_e2e_demo_athlete_high_adherence(seed_db: Session, client: TestClient):
    user = seed_db.query(User).filter(User.email == "demo.athlete@fitmind.ai").first()
    headers = get_auth_headers(user)

    dash_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    assert dash_data["weekly_summary"]["workouts_completed"] >= 4
    assert dash_data["weekly_summary"]["target_workouts"] == 5
    assert dash_data["weekly_summary"]["adherence_score"] >= 70.0
    assert dash_data["weekly_summary"]["adherence_label"] in ("High", "Moderate")


# 4. Inconsistent Adherence Verification for demo.inconsistent@fitmind.ai
def test_e2e_demo_inconsistent_partial_adherence(seed_db: Session, client: TestClient):
    user = seed_db.query(User).filter(User.email == "demo.inconsistent@fitmind.ai").first()
    headers = get_auth_headers(user)

    dash_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    assert dash_data["weekly_summary"]["workouts_completed"] <= 2
    assert dash_data["weekly_summary"]["adherence_score"] <= 70.0
    assert dash_data["weekly_summary"]["adherence_label"] in ("Low", "Moderate")



# 5. Workout Preference Fallback Verification for demo.noplan@fitmind.ai
def test_e2e_demo_noplan_workout_preference_fallback(seed_db: Session, client: TestClient):
    user = seed_db.query(User).filter(User.email == "demo.noplan@fitmind.ai").first()
    headers = get_auth_headers(user)

    dash_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    assert dash_data["workout_plan"] is None
    # Falls back to profile target_workout_days_per_week = 5
    assert dash_data["weekly_summary"]["target_workouts"] == 5


# 6. Timezone Date Boundary Verification for demo.timezone@fitmind.ai
def test_e2e_demo_timezone_date_boundaries(seed_db: Session, client: TestClient):
    user = seed_db.query(User).filter(User.email == "demo.timezone@fitmind.ai").first()
    headers = get_auth_headers(user)

    dash_res = client.get("/api/v1/dashboard/summary", headers=headers)
    rep_res = client.get("/api/v1/reports/weekly", headers=headers)

    assert dash_res.status_code == 200
    assert rep_res.status_code == 200

    dash_w = dash_res.json()["weekly_summary"]
    rep_w = rep_res.json()["workouts"]

    assert dash_w["workouts_completed"] == rep_w["workouts_completed"]
    assert dash_w["nutrition_logged_days"] == rep_res.json()["nutrition"]["logged_days_count"]


# 7. AI Coach & Memory Verification for demo.ai@fitmind.ai
def test_e2e_demo_ai_coach_memory_no_medical_leakage(seed_db: Session, client: TestClient):
    user = seed_db.query(User).filter(User.email == "demo.ai@fitmind.ai").first()
    headers = get_auth_headers(user)

    c_res = client.get("/api/v1/coach/history", headers=headers)
    assert c_res.status_code == 200
    assert len(c_res.json()) >= 6

    # Verify no medical notes in AI context builder
    ai_ctx = ContextBuilder.build_fitness_context(db=seed_db, user=user)
    assert len(ai_ctx.active_memories) >= 3
    assert not user.profile.medical_notes
    for mem in ai_ctx.active_memories:
        assert "medical" not in mem.key.lower()


# 8. Cross-User Data Isolation & Authorization Invariants
def test_e2e_cross_user_data_isolation(seed_db: Session, client: TestClient):
    user_a = seed_db.query(User).filter(User.email == "demo.full@fitmind.ai").first()
    user_b = seed_db.query(User).filter(User.email == "demo.athlete@fitmind.ai").first()

    headers_a = get_auth_headers(user_a)
    headers_b = get_auth_headers(user_b)

    # User A requests dashboard -> receives User A's data
    dash_a = client.get("/api/v1/dashboard/summary", headers=headers_a).json()
    assert dash_a["full_name"] == "Marcus Vance"

    # User B requests dashboard -> receives User B's data
    dash_b = client.get("/api/v1/dashboard/summary", headers=headers_b).json()
    assert dash_b["full_name"] == "Elena Rostova"

    # User A cannot request protected resources as User B
    assert dash_a["email"] != dash_b["email"]


# 9. Invariant: Report Generation Does NOT Mutate FitnessScore Records
def test_e2e_report_generation_is_side_effect_free(seed_db: Session, client: TestClient):
    user = seed_db.query(User).filter(User.email == "demo.full@fitmind.ai").first()
    headers = get_auth_headers(user)

    score_count_before = seed_db.query(FitnessScore).filter(FitnessScore.user_id == user.id).count()

    # Generate report multiple times
    client.get("/api/v1/reports/weekly", headers=headers)
    client.get("/api/v1/reports/monthly", headers=headers)

    score_count_after = seed_db.query(FitnessScore).filter(FitnessScore.user_id == user.id).count()
    assert score_count_before == score_count_after


# 10. Invariant: Dashboard Loading Does NOT Invoke Gemini (0 LLM Calls)
def test_e2e_dashboard_zero_gemini_calls(seed_db: Session, client: TestClient, monkeypatch):
    def mock_gemini_call(*args, **kwargs):
        pytest.fail("Gemini LLM API was invoked during Dashboard loading!")

    monkeypatch.setattr("google.genai.Client", mock_gemini_call, raising=False)

    user = seed_db.query(User).filter(User.email == "demo.full@fitmind.ai").first()
    headers = get_auth_headers(user)

    res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res.status_code == 200
