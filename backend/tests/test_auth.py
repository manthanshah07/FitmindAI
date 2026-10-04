import pytest
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Depends, status
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token, hash_password, hash_token
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

    def test_password_missing_letters_or_digits(self):
        # Missing digits
        res1 = client.post("/api/v1/auth/register", json={"email": "nodigits@example.com", "password": "PasswordOnly!"})
        assert res1.status_code == 422

        # Missing letters
        res2 = client.post("/api/v1/auth/register", json={"email": "noletters@example.com", "password": "1234567890!"})
        assert res2.status_code == 422


class TestLogin:
    def test_successful_login_sets_httponly_cookie(self):
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
        assert data.get("refresh_token") is None  # Never leaked in response body
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "loginuser@example.com"

        # Verify HttpOnly Cookie was set
        assert settings.REFRESH_COOKIE_NAME in response.cookies
        cookie_val = response.cookies[settings.REFRESH_COOKIE_NAME]
        assert len(cookie_val) > 20

        # Verify refresh token stored in DB
        db = TestingSessionLocal()
        tokens = db.query(RefreshToken).all()
        assert len(tokens) == 1
        assert tokens[0].token_hash == hash_token(cookie_val)  # Hashed correctly
        assert tokens[0].is_revoked is False
        db.close()

    def test_login_incorrect_password(self):
        reg_payload = {"email": "wrongpw@example.com", "password": "CorrectPassword123!"}
        client.post("/api/v1/auth/register", json=reg_payload)

        login_payload = {"email": "wrongpw@example.com", "password": "WrongPassword!"}
        response = client.post("/api/v1/auth/login", json=login_payload)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"
        assert settings.REFRESH_COOKIE_NAME not in response.cookies

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
    def test_successful_refresh_and_rotation_with_cookie(self):
        reg_payload = {"email": "refresh@example.com", "password": "Password123!"}
        client.post("/api/v1/auth/register", json=reg_payload)
        login_res = client.post("/api/v1/auth/login", json=reg_payload)

        old_access = login_res.json()["access_token"]
        old_refresh = login_res.cookies[settings.REFRESH_COOKIE_NAME]

        # Call refresh endpoint with cookie
        refresh_res = client.post(
            "/api/v1/auth/refresh",
            cookies={settings.REFRESH_COOKIE_NAME: old_refresh},
        )
        assert refresh_res.status_code == 200
        new_data = refresh_res.json()

        assert new_data["access_token"] != old_access
        assert new_data.get("refresh_token") is None  # Not returned in JSON

        # Verify replacement cookie was set
        new_refresh = refresh_res.cookies.get(settings.REFRESH_COOKIE_NAME)
        assert new_refresh is not None
        assert new_refresh != old_refresh

        # Test token rotation: old refresh token cannot be reused outside grace window
        # Update old token's revoked_at in DB to simulate expired grace period
        db = TestingSessionLocal()
        old_record = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(old_refresh)).first()
        old_record.revoked_at = datetime.now(timezone.utc) - timedelta(seconds=60)
        db.commit()
        db.close()

        reuse_res = client.post(
            "/api/v1/auth/refresh",
            cookies={settings.REFRESH_COOKIE_NAME: old_refresh},
        )
        assert reuse_res.status_code == 401

    def test_multi_tab_refresh_grace_period(self):
        reg_payload = {"email": "multitab@example.com", "password": "Password123!"}
        client.post("/api/v1/auth/register", json=reg_payload)
        login_res = client.post("/api/v1/auth/login", json=reg_payload)
        shared_refresh = login_res.cookies[settings.REFRESH_COOKIE_NAME]

        # Tab A refreshes first
        res_a = client.post(
            "/api/v1/auth/refresh",
            cookies={settings.REFRESH_COOKIE_NAME: shared_refresh},
        )
        assert res_a.status_code == 200
        access_a = res_a.json()["access_token"]

        # Tab B refreshes immediately after with the same previous token (within 30s grace)
        res_b = client.post(
            "/api/v1/auth/refresh",
            cookies={settings.REFRESH_COOKIE_NAME: shared_refresh},
        )
        assert res_b.status_code == 200
        access_b = res_b.json()["access_token"]
        assert access_b is not None

    def test_missing_refresh_cookie(self):
        # Use a fresh client to avoid cookie bleedover from prior tests
        fresh_client = TestClient(app)
        res = fresh_client.post("/api/v1/auth/refresh")
        assert res.status_code == 401
        assert res.json()["detail"] == "Refresh token missing"

    def test_invalid_refresh_cookie(self):
        res = client.post(
            "/api/v1/auth/refresh",
            cookies={settings.REFRESH_COOKIE_NAME: "bogus_invalid_jwt_cookie"},
        )
        assert res.status_code == 401


class TestLogout:
    def test_successful_logout_clears_cookie_and_revokes(self):
        reg_payload = {"email": "logout@example.com", "password": "Password123!"}
        client.post("/api/v1/auth/register", json=reg_payload)
        login_res = client.post("/api/v1/auth/login", json=reg_payload)
        refresh_token = login_res.cookies[settings.REFRESH_COOKIE_NAME]

        logout_res = client.post(
            "/api/v1/auth/logout",
            cookies={settings.REFRESH_COOKIE_NAME: refresh_token},
        )
        assert logout_res.status_code == 200
        assert logout_res.json() == {"message": "Successfully logged out"}

        # Check DB revocation
        db = TestingSessionLocal()
        record = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(refresh_token)).first()
        assert record is not None
        assert record.is_revoked is True
        db.close()

        # Update revoked_at outside grace window
        db = TestingSessionLocal()
        record = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(refresh_token)).first()
        record.revoked_at = datetime.now(timezone.utc) - timedelta(seconds=60)
        db.commit()
        db.close()

        # Subsequent refresh attempt with revoked token fails
        refresh_attempt = client.post(
            "/api/v1/auth/refresh",
            cookies={settings.REFRESH_COOKIE_NAME: refresh_token},
        )
        assert refresh_attempt.status_code == 401


class TestCSRFProtection:
    def test_csrf_unauthorized_origin_rejected(self):
        reg_payload = {"email": "csrf@example.com", "password": "Password123!"}
        client.post("/api/v1/auth/register", json=reg_payload)
        login_res = client.post("/api/v1/auth/login", json=reg_payload)
        refresh_token = login_res.cookies[settings.REFRESH_COOKIE_NAME]

        # Request from malicious origin
        res = client.post(
            "/api/v1/auth/refresh",
            cookies={settings.REFRESH_COOKIE_NAME: refresh_token},
            headers={"Origin": "https://malicious-attacker-site.com"},
        )
        assert res.status_code == 403
        assert res.json()["detail"] == "CSRF origin validation failed"

    def test_csrf_authorized_origin_accepted(self):
        reg_payload = {"email": "allowedorigin@example.com", "password": "Password123!"}
        client.post("/api/v1/auth/register", json=reg_payload)
        login_res = client.post("/api/v1/auth/login", json=reg_payload)
        refresh_token = login_res.cookies[settings.REFRESH_COOKIE_NAME]

        # Request from authorized origin
        allowed_origin = settings.CORS_ORIGINS[0] if isinstance(settings.CORS_ORIGINS, list) else settings.CORS_ORIGINS
        res = client.post(
            "/api/v1/auth/refresh",
            cookies={settings.REFRESH_COOKIE_NAME: refresh_token},
            headers={"Origin": allowed_origin},
        )
        assert res.status_code == 200

