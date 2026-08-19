import json
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.ai_memory import AIMemory
from app.models.chat_message import ChatMessage
from app.schemas.ai import LLMCompletionResponse
from app.schemas.ai_memory import AIMemoryCreate
from app.services.ai_memory_service import AIMemoryService
from app.services.context_builder import ContextBuilder
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest
from app.core.ai_exceptions import AITimeoutError
from tests.conftest import TestingSessionLocal

client = TestClient(app)


def make_mock_structured_json(answer: str = "Mock coaching answer", quality: str = "moderate") -> str:
    return json.dumps({
        "answer": answer,
        "observations": [
            {"category": "nutrition", "text": "Observed protein target.", "severity": "info"}
        ],
        "recommendations": [
            {"category": "nutrition", "title": "Protein", "action": "Eat protein.", "priority": "medium"}
        ],
        "warnings": [],
        "data_quality": quality
    })


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user_a(db):
    email = "mem_user_a@example.com"
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
    email = "mem_user_b@example.com"
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


class TestAIMemoryService:
    def test_create_and_retrieve_memory(self, db, user_a):
        mem = AIMemoryService.create_memory(
            db, user_a, AIMemoryCreate(key="workout_pref", value="Prefers 45-minute home workouts")
        )
        assert mem is not None
        assert mem.user_id == user_a.id
        assert mem.is_active is True

        active = AIMemoryService.get_active_memories(db, user_a)
        assert len(active) == 1
        assert active[0].key == "workout_pref"
        assert active[0].value == "Prefers 45-minute home workouts"

    def test_deactivate_memory(self, db, user_a):
        mem = AIMemoryService.create_memory(
            db, user_a, AIMemoryCreate(key="temp_pref", value="Temporary preference")
        )
        assert mem is not None
        deactivated = AIMemoryService.deactivate_memory(db, user_a, mem.id)
        assert deactivated is True

        active = AIMemoryService.get_active_memories(db, user_a)
        assert len(active) == 0

    def test_medical_keyword_safety_block(self, db, user_a):
        # Sensitive medical notes MUST NOT be saved in AI memory
        mem = AIMemoryService.create_memory(
            db, user_a, AIMemoryCreate(key="medical_info", value="Has severe knee pain and needs surgery")
        )
        assert mem is None

    def test_extract_and_save_preferences(self, db, user_a):
        extracted = AIMemoryService.extract_and_save_preferences(
            db, user_a, "I prefer home workouts with dumbbells"
        )
        assert len(extracted) == 1
        assert extracted[0].key == "workout_preference"
        assert "home" in extracted[0].value.lower()


class TestContextBuilderIntegration:
    def test_context_builder_includes_active_memories_and_bounded_chat(self, db, user_a):
        # 1. Add active memory
        AIMemoryService.create_memory(
            db, user_a, AIMemoryCreate(key="fav_exercise", value="Loves overhead press")
        )

        # 2. Add chat message history
        user_msg = ChatMessage(user_id=user_a.id, role="user", content="How is my routine?")
        asst_msg = ChatMessage(
            user_id=user_a.id,
            role="assistant",
            content="Your routine looks balanced.",
            response_json={"answer": "Your routine looks balanced."},
        )
        db.add_all([user_msg, asst_msg])
        db.commit()

        # 3. Build context
        ctx = ContextBuilder.build_fitness_context(db, user_a)
        assert len(ctx.active_memories) >= 1
        assert any(m.key == "fav_exercise" for m in ctx.active_memories)

        assert len(ctx.recent_chat_history) >= 2
        assert ctx.recent_chat_history[0].role == "user"
        assert ctx.recent_chat_history[0].content == "How is my routine?"
        assert ctx.recent_chat_history[1].role == "assistant"
        assert ctx.recent_chat_history[1].content == "Your routine looks balanced."


class TestCoachChatHistoryAPI:
    def test_get_history_unauthenticated_fails(self):
        res = client.get("/api/v1/coach/history")
        assert res.status_code == 401

    @patch("app.core.ai_client.ai_client.generate")
    def test_chat_persistence_and_history_retrieval(self, mock_generate, client, auth_headers_user_a, user_a, db):
        mock_generate.return_value = LLMCompletionResponse(
            content=make_mock_structured_json(answer="I remember your goal is muscle gain."),
            model="gemini-2.5-flash-lite",
        )

        # 1. User A sends chat message
        res = client.post("/api/v1/coach/chat", json={"message": "What is my focus?"}, headers=auth_headers_user_a)
        assert res.status_code == 200
        assert res.json()["answer"] == "I remember your goal is muscle gain."

        # 2. Fetch history for User A
        hist_res = client.get("/api/v1/coach/history", headers=auth_headers_user_a)
        assert hist_res.status_code == 200
        history = hist_res.json()
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[0]["content"] == "What is my focus?"
        assert history[1]["role"] == "assistant"
        assert history[1]["response"]["answer"] == "I remember your goal is muscle gain."

    @patch("app.core.ai_client.ai_client.generate")
    def test_cross_user_chat_isolation(self, mock_generate, client, auth_headers_user_a, auth_headers_user_b):
        mock_generate.return_value = LLMCompletionResponse(
            content=make_mock_structured_json(answer="User A specific answer."),
            model="gemini-2.5-flash-lite",
        )


        # User A sends a message
        client.post("/api/v1/coach/chat", json={"message": "User A secret query"}, headers=auth_headers_user_a)

        # User B fetches history -> MUST be empty for User B
        hist_b = client.get("/api/v1/coach/history", headers=auth_headers_user_b)
        assert hist_b.status_code == 200
        assert len(hist_b.json()) == 0

    @patch("app.core.ai_client.ai_client.generate")
    def test_gemini_failure_does_not_persist_fake_assistant_message(self, mock_generate, client, auth_headers_user_a, db, user_a):
        mock_generate.side_effect = AITimeoutError("AI service request timed out.")

        # Request fails due to timeout
        res = client.post("/api/v1/coach/chat", json={"message": "Will fail?"}, headers=auth_headers_user_a)
        assert res.status_code == 504

        # History should NOT contain assistant message or uncommitted messages
        hist_res = client.get("/api/v1/coach/history", headers=auth_headers_user_a)
        assert hist_res.status_code == 200
        # Check that no assistant message was persisted
        history = hist_res.json()
        assert not any(h["role"] == "assistant" for h in history)
