from datetime import datetime, date, timezone
import uuid
from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base


class FitnessScore(Base):
    __tablename__ = "fitness_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Integer, nullable=False)
    workout_adherence_pct = Column(Numeric(5, 2), nullable=True)
    nutrition_score = Column(Numeric(5, 2), nullable=True)
    protein_score = Column(Numeric(5, 2), nullable=True)
    sleep_score = Column(Numeric(5, 2), default=75.00, nullable=True)
    recovery_score = Column(Numeric(5, 2), default=75.00, nullable=True)
    consistency_score = Column(Numeric(5, 2), nullable=True)
    calculated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    period_start = Column(Date, nullable=False, index=True)
    period_end = Column(Date, nullable=False, index=True)

    user = relationship("User", backref="fitness_scores")

    __table_args__ = (
        UniqueConstraint("user_id", "period_start", "period_end", name="uq_user_fitness_score_period"),
    )
