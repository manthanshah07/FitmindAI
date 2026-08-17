from datetime import datetime, date, timezone
import uuid
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    measured_at = Column(Date, nullable=False, default=date.today, index=True)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    chest_cm = Column(Numeric(5, 2), nullable=True)
    waist_cm = Column(Numeric(5, 2), nullable=True)
    hips_cm = Column(Numeric(5, 2), nullable=True)
    bicep_cm = Column(Numeric(5, 2), nullable=True)
    thigh_cm = Column(Numeric(5, 2), nullable=True)
    body_fat_pct = Column(Numeric(4, 1), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", backref="measurements")
