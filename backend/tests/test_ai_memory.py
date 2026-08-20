import pytest
from uuid import uuid4
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.ai_memory import AIMemory
from app.schemas.ai_memory import AIMemoryCreate
from app.services.ai_memory_service import AIMemoryService
from tests.conftest import TestingSessionLocal


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_user(db: Session):
    email = f"aimemory_{uuid4().hex[:8]}@example.com"
    user = User(
        email=email,
        password_hash="hashedpassword123",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestAIMemoryService:
    def test_create_and_get_active_memories(self, db: Session, test_user: User):
        # Initial memories should be empty
        initial = AIMemoryService.get_active_memories(db, test_user)
        assert len(initial) == 0

        # Create valid memory
        memory_data = AIMemoryCreate(
            memory_type="preference",
            key="workout_preference",
            value="Prefers morning workouts",
            source="user_setting",
        )
        created = AIMemoryService.create_memory(db, test_user, memory_data)
        assert created is not None
        assert created.key == "workout_preference"
        assert created.value == "Prefers morning workouts"
        assert created.is_active is True

        # Fetch active memories
        active = AIMemoryService.get_active_memories(db, test_user)
        assert len(active) == 1
        assert active[0].id == created.id

    def test_create_memory_blocks_sensitive_medical_keywords(self, db: Session, test_user: User):
        sensitive_data = AIMemoryCreate(
            memory_type="constraint",
            key="medical_note",
            value="Has prescription medication for heart condition",
        )
        created = AIMemoryService.create_memory(db, test_user, sensitive_data)
        assert created is None

        # Verify nothing saved in DB
        active = AIMemoryService.get_active_memories(db, test_user)
        assert len(active) == 0

    def test_create_memory_updates_existing_key(self, db: Session, test_user: User):
        m1 = AIMemoryService.create_memory(
            db,
            test_user,
            AIMemoryCreate(key="diet_type", value="Keto", memory_type="diet"),
        )
        assert m1 is not None

        # Update same key
        m2 = AIMemoryService.create_memory(
            db,
            test_user,
            AIMemoryCreate(key="diet_type", value="Low Carb", memory_type="diet"),
        )
        assert m2 is not None
        assert m2.id == m1.id
        assert m2.value == "Low Carb"

        # Verify only 1 active entry exists
        active = AIMemoryService.get_active_memories(db, test_user)
        assert len(active) == 1

    def test_deactivate_memory(self, db: Session, test_user: User):
        created = AIMemoryService.create_memory(
            db,
            test_user,
            AIMemoryCreate(key="tempo_pref", value="Fast tempo"),
        )
        assert created is not None

        # Deactivate invalid memory ID returns False
        assert AIMemoryService.deactivate_memory(db, test_user, uuid4()) is False

        # Deactivate valid memory ID returns True
        res = AIMemoryService.deactivate_memory(db, test_user, created.id)
        assert res is True

        # Verify no active memories remaining
        active = AIMemoryService.get_active_memories(db, test_user)
        assert len(active) == 0

    def test_extract_and_save_preferences_empty_or_medical(self, db: Session, test_user: User):
        assert AIMemoryService.extract_and_save_preferences(db, test_user, "") == []
        assert AIMemoryService.extract_and_save_preferences(db, test_user, None) == []

        # Text with medical keywords should be ignored
        medical_text = "I prefer home workouts but I am taking prescription medicine for pain."
        res = AIMemoryService.extract_and_save_preferences(db, test_user, medical_text)
        assert res == []

    def test_extract_and_save_preferences_patterns(self, db: Session, test_user: User):
        # Workout preferences
        w_res = AIMemoryService.extract_and_save_preferences(
            db, test_user, "I prefer home workouts and prefer quick workouts"
        )
        assert len(w_res) >= 1

        # Dietary preferences
        d_res = AIMemoryService.extract_and_save_preferences(
            db, test_user, "I am vegetarian and prefer vegan options"
        )
        assert len(d_res) >= 1

        # Dislike exercise pattern
        dislike_res = AIMemoryService.extract_and_save_preferences(
            db, test_user, "I dislike burpees"
        )
        assert len(dislike_res) == 1
        assert dislike_res[0].key == "disliked_exercise_burpees"
        assert dislike_res[0].value == "Dislikes exercise: burpees"
