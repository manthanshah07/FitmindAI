import pytest
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Depends, status
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.api.deps import get_current_user
from tests.conftest import TestingSessionLocal

# Dummy protected route for dependency testing
@app.get("/api/v1/test-protected", tags=["Test"])
def protected_route_test(current_user: User = Depends(get_current_user)):
    return {"status": "success", "email": current_user.email}


client = TestClient(app)


class TestRegistration:
    def test_successful_registration(self):
        payload = {
            "email": "testuser@example.com",
            "password": "SecurePassword123!",
            "full_name": "Test User",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "testuser@example.com"
        assert "password" not in data
        assert "password_hash" not in data
        assert data["is_active"] is True
        assert data["is_verified"] is False

        # Verify DB entry
        db = TestingSessionLocal()
        db_user = db.query(User).filter(User.email == "testuser@example.com").first()
        assert db_user is not None
        assert db_user.password_hash != "SecurePassword123!"
        db.close()

    def test_duplicate_email_registration(self):
        payload = {
            "email": "duplicate@example.com",
            "password": "SecurePassword123!",
        }
        res1 = client.post("/api/v1/auth/register", json=payload)
        assert res1.status_code == 201

        res2 = client.post("/api/v1/auth/register", json=payload)
        assert res2.status_code == 400
        assert res2.json()["detail"] == "Email is already registered"

    def test_invalid_email_format(self):
        payload = {
            "email": "notanemail",
            "password": "SecurePassword123!",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422

    def test_short_password(self):
        payload = {
            "email": "shortpw@example.com",
            "password": "short",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422


class TestLogin:
    def test_successful_login(self):
        reg_payload = {
            "email": "loginuser@example.com",
            "password": "Password123!",
        }
        client.post("/api/v1/auth/register", json=reg_payload)

        login_payload = {
            "email": "loginuser@example.com",
            "password": "Password123!",
        }
        response = client.post("/api/v1/auth/login", json=login_payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "loginuser@example.com"

        # Verify refresh token stored in DB
        db = TestingSessionLocal()
        tokens = db.query(RefreshToken).all()
        assert len(tokens) == 1
        assert tokens[0].token_hash != data["refresh_token"]  # Hashed in DB
        db.close()

    def test_login_incorrect_password(self):
        reg_payload = {"email": "wrongpw@example.com", "password": "CorrectPassword123!"}
        client.post("/api/v1/auth/register", json=reg_payload)

        login_payload = {"email": "wrongpw@example.com", "password": "WrongPassword!"}
        response = client.post("/api/v1/auth/login", json=login_payload)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"

    def test_login_nonexistent_email(self):
        login_payload = {"email": "nonexistent@example.com", "password": "Password123!"}
        response = client.post("/api/v1/auth/login", json=login_payload)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"

    def test_login_inactive_user(self):
        db = TestingSessionLocal()
        inactive_user = User(
            email="inactive@example.com",
            password_hash=hash_password("Password123!"),
            is_active=False,
        )
        db.add(inactive_user)
        db.commit()
        db.close()

        login_payload = {"email": "inactive@example.com", "password": "Password123!"}
        response = client.post("/api/v1/auth/login", json=login_payload)
        assert response.status_code == 403
        assert response.json()["detail"] == "Account is inactive"


class TestProtectedRoutes:
    def test_protected_route_success(self):
        reg_payload = {"email": "protected@example.com", "password": "Password123!"}
        client.post("/api/v1/auth/register", json=reg_payload)
        login_res = client.post("/api/v1/auth/login", json=reg_payload)
        access_token = login_res.json()["access_token"]

        response = client.get(
            "/api/v1/test-protected",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert response.status_code == 200
        assert response.json() == {"status": "success", "email": "protected@example.com"}

    def test_protected_route_missing_header(self):
        response = client.get("/api/v1/test-protected")
        assert response.status_code == 401

    def test_protected_route_invalid_token(self):
        response = client.get(
            "/api/v1/test-protected",
            headers={"Authorization": "Bearer invalid_token_value"},
        )
        assert response.status_code == 401

    def test_protected_route_expired_token(self):
        reg_payload = {"email": "expired@example.com", "password": "Password123!"}
        reg_res = client.post("/api/v1/auth/register", json=reg_payload)
        user_id = reg_res.json()["id"]

        expired_token = create_access_token(
            {"sub": str(user_id)},
            expires_delta=timedelta(seconds=-10),  # expired 10s ago
        )

        response = client.get(
            "/api/v1/test-protected",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401


class TestRefreshToken:
    def test_successful_refresh_and_rotation(self):
        reg_payload = {"email": "refresh@example.com", "password": "Password123!"}
        client.post("/api/v1/auth/register", json=reg_payload)
        login_res = client.post("/api/v1/auth/login", json=reg_payload)

        old_access = login_res.json()["access_token"]
        old_refresh = login_res.json()["refresh_token"]

        refresh_res = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
        assert refresh_res.status_code == 200
        new_data = refresh_res.json()

        assert new_data["access_token"] != old_access
        assert new_data["refresh_token"] != old_refresh

        # Test token rotation: old refresh token cannot be reused
        reuse_res = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
        assert reuse_res.status_code == 401

    def test_invalid_refresh_token(self):
        res = client.post("/api/v1/auth/refresh", json={"refresh_token": "bogus_token"})
        assert res.status_code == 401


class TestLogout:
    def test_successful_logout(self):
        reg_payload = {"email": "logout@example.com", "password": "Password123!"}
        client.post("/api/v1/auth/register", json=reg_payload)
        login_res = client.post("/api/v1/auth/login", json=reg_payload)
        refresh_token = login_res.json()["refresh_token"]

        logout_res = client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
        assert logout_res.status_code == 200
        assert logout_res.json() == {"message": "Successfully logged out"}

        # Subsequent refresh attempt with logged-out token fails
        refresh_attempt = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert refresh_attempt.status_code == 401
