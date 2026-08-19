import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.core.config import Settings
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.ai import LLMCompletionResponse
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest
from tests.conftest import TestingSessionLocal, client


def make_mock_json():
    import json
    return json.dumps({
        "answer": "Test answer",
        "observations": [],
        "recommendations": [],
        "warnings": [],
        "data_quality": "moderate"
    })


@pytest.fixture(autouse=True)
def enable_rate_limiter_for_tests():
    """Ensure limiter is enabled and reset before rate-limit tests."""
    limiter.enabled = True
    yield
    limiter.enabled = True


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user_a(db):
    email = "rl_user_a@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = AuthService.register_user(
            db, RegisterRequest(email=email, password="Password123!", full_name="User A")
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
    email = "rl_user_b@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = AuthService.register_user(
            db, RegisterRequest(email=email, password="Password123!", full_name="User B")
        )
    return user


@pytest.fixture
def auth_headers_user_b(db, user_b):
    tokens = AuthService.authenticate_user(
        db, MagicMock(email=user_b.email, password="Password123!")
    )
    return {"Authorization": f"Bearer {tokens.access_token}"}


class TestRateLimitingAndProductionSecurity:
    def test_login_rate_limiting(self, client):
        # Login limit is 5/minute. Send 6 requests.
        status_codes = []
        for i in range(7):
            res = client.post(
                "/api/v1/auth/login",
                json={"email": "nonexistent@example.com", "password": "wrongpassword"}
            )
            status_codes.append(res.status_code)

        assert 429 in status_codes
        # Find 429 response and verify clean JSON structure
        rate_limit_res = [res for res in status_codes if res == 429]
        assert len(rate_limit_res) > 0

    @patch("app.core.ai_client.ai_client.generate")
    def test_coach_chat_rate_limiting_and_user_isolation(
        self, mock_generate, client, auth_headers_user_a, auth_headers_user_b
    ):
        mock_generate.return_value = LLMCompletionResponse(
            content=make_mock_json(),
            model="gemini-2.5-flash-lite",
        )

        # Coach limit is 10/minute. User A sends 11 messages.
        user_a_responses = []
        for i in range(12):
            res = client.post(
                "/api/v1/coach/chat",
                json={"message": f"Question {i}"},
                headers=auth_headers_user_a,
            )
            user_a_responses.append(res)

        user_a_statuses = [r.status_code for r in user_a_responses]
        assert 429 in user_a_statuses

        # Verify 429 response structure
        blocked_res = next(r for r in user_a_responses if r.status_code == 429)
        data = blocked_res.json()
        assert "detail" in data
        assert data["error_code"] == "RATE_LIMIT_EXCEEDED"

        # User B sends a message -> MUST succeed (200 OK) because limit is per user!
        res_b = client.post(
            "/api/v1/coach/chat",
            json={"message": "User B question"},
            headers=auth_headers_user_b,
        )
        assert res_b.status_code == 200

    def test_production_config_rejects_unsafe_defaults(self):
        # Production with default secret must fail startup validation
        with pytest.raises((ValueError, ValidationError)):
            Settings(
                ENVIRONMENT="production",
                JWT_SECRET="default_dev_secret_change_me_in_production_32_bytes",
            )

    def test_production_config_rejects_wildcard_cors(self):
        # Production with wildcard CORS must fail startup validation
        with pytest.raises((ValueError, ValidationError)):
            Settings(
                ENVIRONMENT="production",
                JWT_SECRET="a_very_secure_production_secret_32_bytes_long!",
                CORS_ORIGINS=["*"],
            )
