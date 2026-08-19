from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User
from app.models.fitness_score import FitnessScore
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest
from tests.conftest import TestingSessionLocal, client


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user_dash(db):
    email = "dash_user@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = AuthService.register_user(
            db, RegisterRequest(email=email, password="Password123!", full_name="Dashboard User")
        )
    return user


@pytest.fixture
def auth_headers_dash(db, user_dash):
    tokens = AuthService.authenticate_user(
        db, MagicMock(email=user_dash.email, password="Password123!")
    )
    return {"Authorization": f"Bearer {tokens.access_token}"}


class TestDashboardAPI:
    def test_unauthenticated_dashboard_summary_fails(self, client):
        res = client.get("/api/v1/dashboard/summary")
        assert res.status_code == 401

    def test_authenticated_dashboard_summary_success(self, client, auth_headers_dash):
        res = client.get("/api/v1/dashboard/summary", headers=auth_headers_dash)
        assert res.status_code == 200
        data = res.json()

        assert "full_name" in data
        assert "email" in data
        assert "tdee_calories" in data
        assert "today_nutrition" in data
        assert "weekly_summary" in data

        weekly = data["weekly_summary"]
        assert "workouts_completed" in weekly
        assert "target_workouts" in weekly
        assert "nutrition_logged_days" in weekly
        assert "adherence_label" in weekly

    def test_dashboard_summary_does_not_mutate_fitness_score_table(
        self, client, db, user_dash, auth_headers_dash
    ):
        # Record initial FitnessScore row count for user
        initial_count = db.query(FitnessScore).filter(FitnessScore.user_id == user_dash.id).count()

        # Call GET /api/v1/dashboard/summary
        res = client.get("/api/v1/dashboard/summary", headers=auth_headers_dash)
        assert res.status_code == 200

        # Assert count is unchanged (0 side-effect commits!)
        final_count = db.query(FitnessScore).filter(FitnessScore.user_id == user_dash.id).count()
        assert final_count == initial_count

    def test_dashboard_summary_does_not_invoke_gemini(
        self, client, auth_headers_dash
    ):
        with patch("app.core.ai_client.ai_client.generate") as mock_generate:
            res = client.get("/api/v1/dashboard/summary", headers=auth_headers_dash)
            assert res.status_code == 200
            # Gemini MUST NOT be called for dashboard rendering!
            mock_generate.assert_not_called()
