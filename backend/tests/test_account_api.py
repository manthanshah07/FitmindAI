import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.nutrition import MealLog
from app.models.progress import Measurement
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest
from tests.conftest import TestingSessionLocal

client = TestClient(app)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def create_user_and_headers(db, email: str, password: str = "Password123!", full_name: str = "Test User"):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = AuthService.register_user(
            db, RegisterRequest(email=email, password=password, full_name=full_name)
        )
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, user


# 1. Change Password Tests
def test_change_password_success(db):
    email = "changepw_success@example.com"
    old_pw = "OldPassword123!"
    new_pw = "NewPassword456!"
    headers, user = create_user_and_headers(db, email, old_pw)

    res = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": old_pw, "new_password": new_pw},
    )
    assert res.status_code == 200
    assert "Password changed successfully" in res.json()["message"]

    # Old password fails login
    fail_login = client.post("/api/v1/auth/login", json={"email": email, "password": old_pw})
    assert fail_login.status_code == 401

    # New password succeeds login
    success_login = client.post("/api/v1/auth/login", json={"email": email, "password": new_pw})
    assert success_login.status_code == 200


def test_change_password_wrong_current_password(db):
    headers, _ = create_user_and_headers(db, "changepw_wrong@example.com")
    res = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": "WrongPassword999!", "new_password": "ValidNewPass123!"},
    )
    assert res.status_code == 400
    assert "Current password is incorrect" in res.json()["detail"]


def test_change_password_same_as_current(db):
    pw = "SamePassword123!"
    headers, _ = create_user_and_headers(db, "changepw_same@example.com", pw)
    res = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": pw, "new_password": pw},
    )
    assert res.status_code == 400
    assert "New password must be different" in res.json()["detail"]


def test_change_password_complexity_rejected(db):
    headers, _ = create_user_and_headers(db, "changepw_weak@example.com")
    # No digit
    res1 = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": "Password123!", "new_password": "alllettersonly"},
    )
    assert res1.status_code == 422

    # Under 8 chars
    res2 = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": "Password123!", "new_password": "Pass1"},
    )
    assert res2.status_code == 422


# 2. Timezone at Registration Test
def test_registration_with_client_timezone(db):
    email = "tz_user@example.com"
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Tokyo User",
            "timezone": "Asia/Tokyo",
        },
    )
    assert res.status_code == 201

    user = db.query(User).filter(User.email == email).first()
    assert user is not None
    assert user.profile.timezone == "Asia/Tokyo"


# 3. Export User Data Tests & Strict User Isolation
def test_export_user_data_and_isolation(db):
    headers_a, user_a = create_user_and_headers(db, "export_user_a@example.com")
    headers_b, user_b = create_user_and_headers(db, "export_user_b@example.com")

    # Add Goal for User A and Goal for User B
    client.post(
        "/api/v1/goals",
        headers=headers_a,
        json={"goal_type": "fat_loss", "target_weight_kg": 75.0},
    )
    client.post(
        "/api/v1/goals",
        headers=headers_b,
        json={"goal_type": "muscle_gain", "target_weight_kg": 85.0},
    )

    # User A requests export
    res_a = client.get("/api/v1/user/export", headers=headers_a)
    assert res_a.status_code == 200
    data_a = res_a.json()

    assert data_a["user"]["id"] == str(user_a.id)
    assert data_a["user"]["email"] == user_a.email
    assert len(data_a["goals"]) >= 1
    # User A must ONLY see fat_loss, NOT User B's muscle_gain goal
    assert all(g["goal_type"] == "fat_loss" for g in data_a["goals"])
    assert not any(g["target_weight_kg"] == 85.0 for g in data_a["goals"])

    # User B requests export
    res_b = client.get("/api/v1/user/export", headers=headers_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["user"]["id"] == str(user_b.id)
    assert all(g["goal_type"] == "muscle_gain" for g in data_b["goals"])


# 4. Delete Account Tests
def test_delete_user_account_wrong_password(db):
    headers, _ = create_user_and_headers(db, "del_wrong_pw@example.com")
    res = client.request(
        "DELETE",
        "/api/v1/user/account",
        headers=headers,
        json={"password": "IncorrectPassword999!"},
    )
    assert res.status_code == 400
    assert "Incorrect password" in res.json()["detail"]


def test_delete_user_account_success(db):
    email = "del_success@example.com"
    pw = "DeletePassword123!"
    headers, user = create_user_and_headers(db, email, pw)
    user_id = user.id

    # User has profile, add measurement
    meas = Measurement(user_id=user_id, weight_kg=80.0)
    db.add(meas)
    db.commit()

    # Perform account deletion
    res = client.request(
        "DELETE",
        "/api/v1/user/account",
        headers=headers,
        json={"password": pw},
    )
    assert res.status_code == 200
    assert "Account successfully deleted" in res.json()["message"]

    # Verify user and dependent records no longer exist in database
    db.expire_all()
    deleted_user = db.query(User).filter(User.email == email).first()
    assert deleted_user is None

    deleted_meas = db.query(Measurement).filter(Measurement.user_id == user_id).all()
    assert len(deleted_meas) == 0

    deleted_profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    assert deleted_profile is None

    # Subsequent login attempt is blocked
    blocked_login = client.post("/api/v1/auth/login", json={"email": email, "password": pw})
    assert blocked_login.status_code == 401
