import json
from unittest.mock import patch, MagicMock
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.schemas.ai import LLMCompletionResponse
from app.schemas.coach_response import (
    CoachResponseStructured,
    ObservationItem,
    RecommendationItem,
)
from app.schemas.coach import CoachChatResponse
from app.core.ai_exceptions import (
    AITimeoutError,
    AIRateLimitError,
    AIProviderUnavailableError,
    AIResponseError,
)
from tests.conftest import TestingSessionLocal

client = TestClient(app)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def auth_headers_user(db):
    from app.services.auth_service import AuthService
    from app.schemas.auth import RegisterRequest

    email = "structured_coach_user@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = AuthService.register_user(
            db, RegisterRequest(email=email, password="Password123!", full_name="Structured User")
        )
    tokens = AuthService.authenticate_user(
        db, MagicMock(email=email, password="Password123!")
    )
    return {"Authorization": f"Bearer {tokens.access_token}"}, user


def make_valid_structured_json(
    answer: str = "Focus on hitting your daily protein target of 140g.",
    quality: str = "moderate",
) -> str:
    return json.dumps({
        "answer": answer,
        "observations": [
            {
                "category": "nutrition",
                "text": "Your average daily protein intake is 110g over 5 logged days.",
                "severity": "caution",
            }
        ],
        "recommendations": [
            {
                "category": "nutrition",
                "title": "Increase Protein Intake",
                "action": "Add a protein shake or chicken breast to reach 140g daily.",
                "priority": "high",
            }
        ],
        "warnings": [
            "You have 2 unlogged nutrition days in the past week."
        ],
        "data_quality": quality,
    })


# =====================================================================
# 1. SCHEMA VALIDATION TESTS
# =====================================================================

def test_valid_structured_response_accepted():
    resp = CoachResponseStructured(
        answer="Valid coaching answer",
        observations=[
            ObservationItem(category="workout", text="Logged 3 workouts", severity="info")
        ],
        recommendations=[
            RecommendationItem(category="workout", title="Squat", action="Do 3 sets of squats", priority="medium")
        ],
        warnings=["Data is sparse"],
        data_quality="sparse",
    )
    assert resp.answer == "Valid coaching answer"
    assert len(resp.observations) == 1
    assert resp.data_quality == "sparse"


def test_missing_required_answer_rejected():
    with pytest.raises(ValidationError):
        CoachResponseStructured(
            observations=[],
            recommendations=[],
            data_quality="moderate",
        )


def test_blank_whitespace_answer_rejected():
    with pytest.raises(ValidationError):
        CoachResponseStructured(answer="    ", data_quality="moderate")


def test_invalid_severity_rejected():
    with pytest.raises(ValidationError):
        ObservationItem(category="nutrition", text="Test", severity="fatal")  # Invalid severity


def test_invalid_priority_rejected():
    with pytest.raises(ValidationError):
        RecommendationItem(category="workout", title="T", action="A", priority="critical")  # Invalid priority


def test_invalid_data_quality_rejected():
    with pytest.raises(ValidationError):
        CoachResponseStructured(answer="Test answer", data_quality="perfect")  # Invalid data_quality


def test_blank_category_rejected():
    with pytest.raises(ValidationError):
        ObservationItem(category="   ", text="Valid text", severity="info")


# =====================================================================
# 2. AI PARSING & ERROR HANDLING TESTS
# =====================================================================

def test_valid_gemini_json_parsed_correctly(auth_headers_user):
    headers, _ = auth_headers_user
    mock_json = make_valid_structured_json("Parsed answer successfully", "comprehensive")
    mock_llm_resp = LLMCompletionResponse(content=mock_json, model="gemini-2.5-flash-lite")

    with patch("app.services.coach_service.ai_client.generate", return_value=mock_llm_resp):
        res = client.post(
            "/api/v1/coach/chat",
            json={"message": "How is my progress?"},
            headers=headers,
        )

    assert res.status_code == 200
    data = res.json()
    assert data["answer"] == "Parsed answer successfully"
    assert data["data_quality"] == "comprehensive"
    assert len(data["observations"]) == 1
    assert data["observations"][0]["severity"] == "caution"


def test_malformed_json_returns_http_502(auth_headers_user):
    headers, _ = auth_headers_user
    mock_llm_resp = LLMCompletionResponse(content="THIS_IS_NOT_JSON", model="gemini-2.5-flash-lite")

    with patch("app.services.coach_service.ai_client.generate", return_value=mock_llm_resp):
        res = client.post(
            "/api/v1/coach/chat",
            json={"message": "Malformed test"},
            headers=headers,
        )

    assert res.status_code == 502
    assert "invalid" in res.json()["detail"].lower() or "empty" in res.json()["detail"].lower()


def test_missing_required_field_in_json_returns_http_502(auth_headers_user):
    headers, _ = auth_headers_user
    invalid_json = json.dumps({"observations": [], "data_quality": "moderate"})  # missing answer!
    mock_llm_resp = LLMCompletionResponse(content=invalid_json, model="gemini-2.5-flash-lite")

    with patch("app.services.coach_service.ai_client.generate", return_value=mock_llm_resp):
        res = client.post(
            "/api/v1/coach/chat",
            json={"message": "Missing answer test"},
            headers=headers,
        )

    assert res.status_code == 502


def test_invalid_enum_in_json_returns_http_502(auth_headers_user):
    headers, _ = auth_headers_user
    invalid_json = json.dumps({
        "answer": "Answer with bad enum",
        "data_quality": "superb"  # Invalid data_quality enum
    })
    mock_llm_resp = LLMCompletionResponse(content=invalid_json, model="gemini-2.5-flash-lite")

    with patch("app.services.coach_service.ai_client.generate", return_value=mock_llm_resp):
        res = client.post(
            "/api/v1/coach/chat",
            json={"message": "Enum test"},
            headers=headers,
        )

    assert res.status_code == 502


def test_sdk_types_do_not_leak_outside_ai_client(auth_headers_user):
    headers, _ = auth_headers_user
    mock_json = make_valid_structured_json()
    mock_llm_resp = LLMCompletionResponse(content=mock_json, model="gemini-2.5-flash-lite")

    with patch("app.services.coach_service.ai_client.generate", return_value=mock_llm_resp) as mock_gen:
        res = client.post(
            "/api/v1/coach/chat",
            json={"message": "Check response type"},
            headers=headers,
        )
        assert res.status_code == 200
        # AIClient returns LLMCompletionResponse, not a google.genai type
        ret_val = mock_gen.return_value
        assert isinstance(ret_val, LLMCompletionResponse)


# =====================================================================
# 3. COACH API CONTRACT & SECURITY TESTS
# =====================================================================

def test_authenticated_chat_returns_structured_schema(auth_headers_user):
    headers, _ = auth_headers_user
    mock_json = make_valid_structured_json("Structured API Test")
    mock_llm_resp = LLMCompletionResponse(content=mock_json, model="gemini-2.5-flash-lite")

    with patch("app.services.coach_service.ai_client.generate", return_value=mock_llm_resp):
        res = client.post(
            "/api/v1/coach/chat",
            json={"message": "What should I focus on?"},
            headers=headers,
        )

    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "observations" in data
    assert "recommendations" in data
    assert "warnings" in data
    assert "data_quality" in data
    assert data["answer"] == "Structured API Test"


def test_unauthenticated_chat_returns_401():
    res = client.post("/api/v1/coach/chat", json={"message": "Hello"})
    assert res.status_code == 401


def test_rate_limit_error_returns_429(auth_headers_user):
    headers, _ = auth_headers_user
    with patch("app.services.coach_service.ai_client.generate", side_effect=AIRateLimitError("Quota limit")):
        res = client.post("/api/v1/coach/chat", json={"message": "Hi"}, headers=headers)
        assert res.status_code == 429


def test_timeout_error_returns_504(auth_headers_user):
    headers, _ = auth_headers_user
    with patch("app.services.coach_service.ai_client.generate", side_effect=AITimeoutError("Timeout")):
        res = client.post("/api/v1/coach/chat", json={"message": "Hi"}, headers=headers)
        assert res.status_code == 504


def test_provider_unavailable_returns_503(auth_headers_user):
    headers, _ = auth_headers_user
    with patch("app.services.coach_service.ai_client.generate", side_effect=AIProviderUnavailableError("Down")):
        res = client.post("/api/v1/coach/chat", json={"message": "Hi"}, headers=headers)
        assert res.status_code == 503


# =====================================================================
# 4. CONTEXT INTEGRITY & PROMPT VERIFICATION
# =====================================================================

def test_phase5_analytics_passed_to_ai_request(db, auth_headers_user):
    headers, user = auth_headers_user
    mock_json = make_valid_structured_json("Analytics check")
    mock_llm_resp = LLMCompletionResponse(content=mock_json, model="gemini-2.5-flash-lite")

    with patch("app.services.coach_service.ai_client.generate", return_value=mock_llm_resp) as mock_gen:
        res = client.post(
            "/api/v1/coach/chat",
            json={"message": "Check analytics in prompt"},
            headers=headers,
        )
        assert res.status_code == 200
        req = mock_gen.call_args[0][0]
        user_prompt = req.messages[1].content
        assert "analytics" in user_prompt
        assert "weight_trend" in user_prompt
        assert "data_completeness" in user_prompt
        # Verify JSON format requested
        assert req.response_mime_type == "application/json"


def test_medical_and_workout_notes_excluded_from_ai_prompt(db, auth_headers_user):
    headers, user = auth_headers_user

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if profile:
        profile.medical_notes = "CONFIDENTIAL_ASTHMA_NOTE_FOR_TEST"
        db.commit()

    mock_json = make_valid_structured_json("Notes privacy check")
    mock_llm_resp = LLMCompletionResponse(content=mock_json, model="gemini-2.5-flash-lite")

    with patch("app.services.coach_service.ai_client.generate", return_value=mock_llm_resp) as mock_gen:
        res = client.post(
            "/api/v1/coach/chat",
            json={"message": "Privacy check"},
            headers=headers,
        )
        assert res.status_code == 200
        user_prompt = mock_gen.call_args[0][0].messages[1].content
        assert "CONFIDENTIAL_ASTHMA_NOTE_FOR_TEST" not in user_prompt
        assert "medical_notes" not in user_prompt
