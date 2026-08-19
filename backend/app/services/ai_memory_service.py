import logging
import re
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.ai_memory import AIMemory
from app.schemas.ai_memory import AIMemoryCreate

logger = logging.getLogger(__name__)

# Keywords associated with sensitive medical information that MUST NEVER be stored in AI memory
SENSITIVE_MEDICAL_KEYWORDS = {
    "doctor", "physician", "hospital", "clinic", "diagnosis", "diagnose",
    "medication", "medicine", "prescription", "surgery", "operation",
    "treatment", "disease", "illness", "pain", "injury", "blood pressure",
    "heart condition", "cardiac", "fracture", "sprain"
}


class AIMemoryService:
    """
    Service for managing persistent AI user memories.
    Stores and retrieves active user preferences and training constraints while
    strictly blocking sensitive medical notes or raw unverified conversation data.
    """

    @staticmethod
    def get_active_memories(db: Session, user: User) -> List[AIMemory]:
        """Fetch all active memory items for the current user."""
        return (
            db.query(AIMemory)
            .filter(AIMemory.user_id == user.id, AIMemory.is_active == True)
            .order_by(AIMemory.created_at.asc())
            .all()
        )

    @staticmethod
    def create_memory(db: Session, user: User, data: AIMemoryCreate) -> Optional[AIMemory]:
        """
        Creates a new active memory for the user.
        Safely validates that memory content does not contain sensitive medical keywords.
        """
        combined_text = f"{data.key} {data.value}".lower()
        if any(kw in combined_text for kw in SENSITIVE_MEDICAL_KEYWORDS):
            logger.warning("Attempted to save memory containing sensitive medical keywords. Aborting.")
            return None

        # Check for duplicate active memory key
        existing = (
            db.query(AIMemory)
            .filter(
                AIMemory.user_id == user.id,
                AIMemory.key == data.key,
                AIMemory.is_active == True,
            )
            .first()
        )
        if existing:
            existing.value = data.value
            existing.memory_type = data.memory_type
            existing.source = data.source
            db.commit()
            db.refresh(existing)
            return existing

        new_memory = AIMemory(
            user_id=user.id,
            memory_type=data.memory_type,
            key=data.key,
            value=data.value,
            source=data.source or "conversation",
            is_active=True,
        )
        db.add(new_memory)
        db.commit()
        db.refresh(new_memory)
        return new_memory

    @staticmethod
    def deactivate_memory(db: Session, user: User, memory_id: UUID) -> bool:
        """Soft-deletes an AI memory entry by setting is_active=False."""
        memory = (
            db.query(AIMemory)
            .filter(AIMemory.user_id == user.id, AIMemory.id == memory_id)
            .first()
        )
        if not memory:
            return False
        memory.is_active = False
        db.commit()
        return True

    @staticmethod
    def extract_and_save_preferences(db: Session, user: User, text: str) -> List[AIMemory]:
        """
        Deterministic preference extractor that scans incoming user message text
        for explicit preference declarations and safely persists them.
        """
        if not text:
            return []

        lower_text = text.lower()
        saved_memories: List[AIMemory] = []

        # Check for medical keywords first — do NOT extract memory if medical topic
        if any(kw in lower_text for kw in SENSITIVE_MEDICAL_KEYWORDS):
            return []

        # Pattern 1: Workout preference (e.g. "I prefer home workouts", "I prefer short workouts")
        if "prefer home workout" in lower_text or "prefer bodyweight" in lower_text:
            m = AIMemoryService.create_memory(
                db, user, AIMemoryCreate(key="workout_preference", value="Prefers home/bodyweight workouts")
            )
            if m:
                saved_memories.append(m)

        elif "prefer short workout" in lower_text or "prefer quick workout" in lower_text:
            m = AIMemoryService.create_memory(
                db, user, AIMemoryCreate(key="workout_duration_preference", value="Prefers short/quick workout sessions")
            )
            if m:
                saved_memories.append(m)

        # Pattern 2: Diet preference (e.g. "I prefer vegetarian meals", "I am vegetarian")
        if "vegetarian" in lower_text and ("prefer" in lower_text or "am" in lower_text or "follow" in lower_text):
            m = AIMemoryService.create_memory(
                db, user, AIMemoryCreate(key="dietary_preference", value="Prefers vegetarian meal options")
            )
            if m:
                saved_memories.append(m)

        elif "vegan" in lower_text and ("prefer" in lower_text or "am" in lower_text or "follow" in lower_text):
            m = AIMemoryService.create_memory(
                db, user, AIMemoryCreate(key="dietary_preference", value="Prefers vegan meal options")
            )
            if m:
                saved_memories.append(m)

        # Pattern 3: Exercise dislikes (e.g. "I dislike burpees", "I hate lunges")
        dislike_match = re.search(r"i (?:dislike|hate|don't like|do not like) ([a-z0-9\s]{3,20})", lower_text)
        if dislike_match:
            exercise_name = dislike_match.group(1).strip()
            # Clean up trailing punctuation or filler words
            exercise_name = re.sub(r"[^\w\s]", "", exercise_name).strip()
            if exercise_name and len(exercise_name) < 25:
                m = AIMemoryService.create_memory(
                    db,
                    user,
                    AIMemoryCreate(
                        key=f"disliked_exercise_{exercise_name.replace(' ', '_')}",
                        value=f"Dislikes exercise: {exercise_name}",
                    ),
                )
                if m:
                    saved_memories.append(m)

        return saved_memories
