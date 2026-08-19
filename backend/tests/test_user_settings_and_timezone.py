from datetime import date, datetime, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.timezone_utils import get_timezone_aware_range, get_user_today_date, get_user_zone_info

client = TestClient(app)


def get_auth_headers(email: str = "settingsuser@example.com", password: str = "Password123!"):
    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_profile_returns_default_settings():
    headers = get_auth_headers("getdefaults@example.com")
    response = client.get("/api/v1/profile", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["timezone"] == "UTC"
    assert data["preferred_workout_duration_minutes"] == 45
    assert data["target_workout_days_per_week"] == 4


def test_update_profile_valid_timezone_success():
    headers = get_auth_headers("validtz@example.com")
    payload = {
        "timezone": "Asia/Kolkata",
        "preferred_workout_duration_minutes": 60,
        "target_workout_days_per_week": 5,
    }
    response = client.patch("/api/v1/profile", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["timezone"] == "Asia/Kolkata"
    assert data["preferred_workout_duration_minutes"] == 60
    assert data["target_workout_days_per_week"] == 5


def test_update_profile_invalid_timezone_rejection():
    headers = get_auth_headers("invalidtz@example.com")
    payload = {
        "timezone": "Mars/Olympus_Mons",
    }
    response = client.patch("/api/v1/profile", json=payload, headers=headers)
    assert response.status_code == 422
    err_data = response.json()
    assert "Invalid IANA timezone identifier" in str(err_data)


def test_timezone_utils_range_calculation():
    start_date = date(2026, 8, 19)
    end_date = date(2026, 8, 19)
    start_utc, end_utc = get_timezone_aware_range(start_date, end_date, "Asia/Kolkata")

    assert start_utc == datetime(2026, 8, 18, 18, 30, 0, tzinfo=timezone.utc)
    assert end_utc == datetime(2026, 8, 19, 18, 29, 59, 999999, tzinfo=timezone.utc)


def test_timezone_utils_dst_handling_america_new_york():
    start_date = date(2026, 8, 19)
    end_date = date(2026, 8, 19)
    start_utc, end_utc = get_timezone_aware_range(start_date, end_date, "America/New_York")

    assert start_utc == datetime(2026, 8, 19, 4, 0, 0, tzinfo=timezone.utc)
    assert end_utc == datetime(2026, 8, 20, 3, 59, 59, 999999, tzinfo=timezone.utc)


def test_dashboard_and_reports_agree_under_user_timezone():
    headers = get_auth_headers("agree_tz@example.com")
    patch_res = client.patch("/api/v1/profile", json={"timezone": "Asia/Kolkata"}, headers=headers)
    assert patch_res.status_code == 200

    dash_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    rep_res = client.get("/api/v1/reports/weekly", headers=headers)
    assert rep_res.status_code == 200
    rep_data = rep_res.json()

    assert dash_data["weekly_summary"]["workouts_completed"] == rep_data["workouts"]["workouts_completed"]
    assert dash_data["weekly_summary"]["nutrition_logged_days"] == rep_data["nutrition"]["logged_days_count"]
    assert dash_data["weekly_summary"]["current_fitness_score"] == rep_data["fitness_score"]["ending_score"]
