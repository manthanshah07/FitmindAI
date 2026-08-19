import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Numeric, JSON, Integer

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    height_cm: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    activity_level: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    diet_preference: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    equipment: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    medical_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", server_default="UTC", nullable=False)
    preferred_workout_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, default=45, nullable=True)
    target_workout_days_per_week: Mapped[Optional[int]] = mapped_column(Integer, default=4, nullable=True)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="profile")
