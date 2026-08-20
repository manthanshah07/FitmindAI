import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
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
def client():
    return TestClient(app)


@pytest.fixture
def normal_user(db: Session):
    user = User(
        email=f"normal_{uuid4().hex[:8]}@example.com",
        password_hash="hash123",
        is_active=True,
        is_admin=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db: Session):
    user = User(
        email=f"admin_{uuid4().hex[:8]}@example.com",
        password_hash="hash123",
        is_active=True,
        is_admin=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestAdminRBACAuthorization:
    def test_unauthenticated_request_returns_401(self, client: TestClient):
        endpoints = [
            ("POST", "/api/v1/admin/seed-demo"),
            ("POST", "/api/v1/admin/seed-test-subjects"),
            ("GET", "/api/v1/admin/verify-test-subjects"),
            ("GET", "/api/v1/admin/db-info"),
        ]
        for method, path in endpoints:
            if method == "POST":
                res = client.post(path)
            else:
                res = client.get(path)
            assert res.status_code == 401, f"{method} {path} should return 401 when unauthenticated"

    def test_invalid_or_malformed_jwt_returns_401(self, client: TestClient):
        bad_headers = [
            {"Authorization": "Bearer invalid_token_str"},
            {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid_signature"},
            {"Authorization": "NotBearer token"},
        ]
        for headers in bad_headers:
            res = client.get("/api/v1/admin/db-info", headers=headers)
            assert res.status_code == 401

    def test_authenticated_non_admin_returns_403(self, client: TestClient, normal_user: User):
        token = create_access_token({"sub": str(normal_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        endpoints = [
            ("POST", "/api/v1/admin/seed-demo"),
            ("POST", "/api/v1/admin/seed-test-subjects"),
            ("GET", "/api/v1/admin/verify-test-subjects"),
            ("GET", "/api/v1/admin/db-info"),
        ]
        for method, path in endpoints:
            if method == "POST":
                res = client.post(path, headers=headers)
            else:
                res = client.get(path, headers=headers)
            assert res.status_code == 403, f"{method} {path} should return 403 for non-admin user"
            assert res.json()["detail"] == "Administrative privileges required"

    def test_header_manipulation_bypass_attempt_fails(self, client: TestClient, normal_user: User):
        # A non-admin user passing legacy X-Admin-Secret header MUST still be rejected (403)
        token = create_access_token({"sub": str(normal_user.id)})
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Admin-Secret": "any_secret_value",
        }
        res = client.get("/api/v1/admin/db-info", headers=headers)
        assert res.status_code == 403

    def test_authenticated_admin_user_succeeds(self, client: TestClient, admin_user: User):
        token = create_access_token({"sub": str(admin_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        res_info = client.get("/api/v1/admin/db-info", headers=headers)
        assert res_info.status_code == 200
        assert res_info.json()["status"] == "ok"

        res_verify = client.get("/api/v1/admin/verify-test-subjects", headers=headers)
        assert res_verify.status_code == 200
        assert res_verify.json()["status"] in ("ok", "incomplete")
