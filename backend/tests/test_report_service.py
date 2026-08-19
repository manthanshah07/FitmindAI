from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User
from app.models.workout import WorkoutLog, WorkoutPlan, WorkoutLogExercise, Exercise
from app.models.nutrition import MealLog, MealLogItem, Food
from app.models.progress import Measurement
from app.services.report_service import ReportService
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest
from app.schemas.ai import LLMCompletionResponse
from tests.conftest import TestingSessionLocal, client


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user_a(db):
    email = "report_user_a@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = AuthService.register_user(
            db, RegisterRequest(email=email, password="Password123!", full_name="Report User A")
        )
    return user


@pytest.fixture
def auth_headers_user_a(db, user_a):
    tokens = AuthService.authenticate_user(
        db, MagicMock(email=user_a.email, password="Password123!")
    )
    return {"Authorization": f"Bearer {tokens.access_token}"}


@pytest.fixture
def user_b(db):
    email = "report_user_b@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = AuthService.register_user(
            db, RegisterRequest(email=email, password="Password123!", full_name="Report User B")
        )
    return user


@pytest.fixture
def auth_headers_user_b(db, user_b):
    tokens = AuthService.authenticate_user(
        db, MagicMock(email=user_b.email, password="Password123!")
    )
    return {"Authorization": f"Bearer {tokens.access_token}"}


class TestReportService:
    def test_weekly_boundaries_calculation(self):
        ref = date(2026, 8, 19)
        start, end = ReportService.get_weekly_boundaries(ref)
        assert start == date(2026, 8, 13)
        assert end == date(2026, 8, 19)
        assert (end - start).days + 1 == 7

    def test_monthly_boundaries_calculation(self):
        ref = date(2026, 8, 19)
        start, end = ReportService.get_month_boundaries(ref)
        assert start == date(2026, 8, 1)
        assert end == date(2026, 8, 31)

        # Feb leap year / non-leap year
        start_feb, end_feb = ReportService.get_month_boundaries(date(2026, 2, 10))
        assert start_feb == date(2026, 2, 1)
        assert end_feb == date(2026, 2, 28)

    def test_deterministic_report_with_sparse_data(self, db, user_a):
        # User with no workouts, no nutrition, no measurements
        report = ReportService.generate_weekly_report(
            db, user_a, target_date=date(2026, 8, 19), include_ai_narrative=False
        )

        assert report.report_type == "weekly"
        assert report.start_date == date(2026, 8, 13)
        assert report.end_date == date(2026, 8, 19)

        # Workout section should indicate no data
        assert report.workouts.workouts_completed == 0
        assert report.workouts.has_data is False

        # Nutrition section should indicate no data
        assert report.nutrition.logged_days_count == 0
        assert report.nutrition.has_data is False
        assert report.nutrition.average_calories_per_logged_day is None

        # Progress section should indicate no data
        assert report.progress.measurement_count == 0
        assert report.progress.has_data is False

        # Adherence should indicate insufficient data
        assert report.adherence_score is None
        assert report.adherence_label == "Insufficient Data"

    def test_deterministic_report_with_recorded_activity(self, db, user_a):
        ref_date = date(2026, 8, 19)
        now_dt = datetime.combine(ref_date, datetime.min.time()).replace(tzinfo=timezone.utc)

        # 1. Add Workout Log
        ex = Exercise(name="Bench Press", primary_muscle="chest")
        db.add(ex)
        db.commit()

        w_log = WorkoutLog(
            user_id=user_a.id,
            started_at=now_dt,
            ended_at=now_dt + timedelta(minutes=45)
        )
        db.add(w_log)
        db.commit()

        w_ex = WorkoutLogExercise(
            log_id=w_log.id,
            exercise_id=ex.id,
            set_number=1,
            reps_completed=10,
            weight_kg=60.0
        )
        db.add(w_ex)
        db.commit()

        # 2. Add Meal Log
        food = Food(
            name="Chicken Breast",
            calories_per_100g=165.0,
            protein_per_100g=31.0,
            carbs_per_100g=0.0,
            fat_per_100g=3.6
        )
        db.add(food)
        db.commit()

        m_log = MealLog(user_id=user_a.id, meal_type="lunch", logged_at=now_dt)
        db.add(m_log)
        db.commit()

        m_item = MealLogItem(
            meal_log_id=m_log.id,
            food_id=food.id,
            quantity_grams=200.0,
            calculated_calories=330.0,
            calculated_protein=62.0,
            calculated_carbs=0.0,
            calculated_fat=7.2
        )
        db.add(m_item)
        db.commit()

        # 3. Add Measurement
        meas = Measurement(user_id=user_a.id, measured_at=ref_date, weight_kg=75.0)
        db.add(meas)
        db.commit()

        # Generate report
        report = ReportService.generate_weekly_report(
            db, user_a, target_date=ref_date, include_ai_narrative=False
        )

        assert report.workouts.workouts_completed == 1
        assert report.workouts.total_duration_minutes == 45
        assert report.workouts.has_data is True
        assert "Chest" in report.workouts.most_frequent_muscles

        assert report.nutrition.logged_days_count == 1
        assert report.nutrition.average_calories_per_logged_day == 330.0
        assert report.nutrition.average_protein_per_logged_day == 62.0
        assert report.nutrition.has_data is True

        assert report.progress.measurement_count == 1
        assert report.progress.ending_weight_kg == 75.0

        assert report.adherence_score is not None
        assert report.adherence_label in ["High", "Moderate", "Low"]


class TestReportsAPI:
    def test_get_weekly_report_unauthenticated_fails(self, client):
        res = client.get("/api/v1/reports/weekly")
        assert res.status_code == 401

    def test_get_monthly_report_unauthenticated_fails(self, client):
        res = client.get("/api/v1/reports/monthly")
        assert res.status_code == 401

    @patch("app.core.ai_client.ai_client.generate")
    def test_get_weekly_report_authenticated_success(
        self, mock_generate, client, auth_headers_user_a
    ):
        mock_generate.return_value = LLMCompletionResponse(
            content="Mock executive summary of your weekly progress.",
            model="gemini-2.5-flash-lite",
        )

        res = client.get("/api/v1/reports/weekly?date=2026-08-19", headers=auth_headers_user_a)
        assert res.status_code == 200
        data = res.json()

        assert data["report_type"] == "weekly"
        assert data["start_date"] == "2026-08-13"
        assert data["end_date"] == "2026-08-19"
        assert "headline" in data
        assert "workouts" in data
        assert "nutrition" in data
        assert "progress" in data
        assert "fitness_score" in data
        assert data["narrative"] == "Mock executive summary of your weekly progress."
        assert data["ai_generated"] is True

    @patch("app.core.ai_client.ai_client.generate")
    def test_get_monthly_report_authenticated_success(
        self, mock_generate, client, auth_headers_user_a
    ):
        mock_generate.return_value = LLMCompletionResponse(
            content="Mock executive summary of monthly progress.",
            model="gemini-2.5-flash-lite",
        )

        res = client.get("/api/v1/reports/monthly?date=2026-08-19", headers=auth_headers_user_a)
        assert res.status_code == 200
        data = res.json()

        assert data["report_type"] == "monthly"
        assert data["start_date"] == "2026-08-01"
        assert data["end_date"] == "2026-08-31"

    @patch("app.core.ai_client.ai_client.generate")
    def test_ai_narrative_failure_does_not_fail_report(
        self, mock_generate, client, auth_headers_user_a
    ):
        # AI engine raises an exception
        mock_generate.side_effect = Exception("AI Provider Unavailable")

        res = client.get("/api/v1/reports/weekly?date=2026-08-19", headers=auth_headers_user_a)
        assert res.status_code == 200
        data = res.json()

        # Deterministic metrics return cleanly
        assert data["report_type"] == "weekly"
        assert data["narrative"] is None
        assert data["ai_generated"] is False

    def test_cross_user_report_isolation(
        self, client, auth_headers_user_a, auth_headers_user_b
    ):
        # User A requests weekly report
        res_a = client.get("/api/v1/reports/weekly", headers=auth_headers_user_a)
        assert res_a.status_code == 200

        # User B requests weekly report -> receives User B's report isolated
        res_b = client.get("/api/v1/reports/weekly", headers=auth_headers_user_b)
        assert res_b.status_code == 200
