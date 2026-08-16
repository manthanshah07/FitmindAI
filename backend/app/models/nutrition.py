from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, Boolean, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base


class Food(Base):
    __tablename__ = "foods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), unique=True, nullable=False, index=True)
    brand = Column(String(100), nullable=True)
    calories_per_100g = Column(Numeric(7, 2), nullable=False)
    protein_per_100g = Column(Numeric(6, 2), nullable=False)
    carbs_per_100g = Column(Numeric(6, 2), nullable=False)
    fat_per_100g = Column(Numeric(6, 2), nullable=False)
    fiber_per_100g = Column(Numeric(6, 2), nullable=True)
    is_verified = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class MealLog(Base):
    __tablename__ = "meal_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    meal_type = Column(String(20), nullable=False)  # 'breakfast', 'lunch', 'dinner', 'snack'
    logged_at = Column(DateTime(timezone=True), nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", backref="meal_logs")
    items = relationship("MealLogItem", back_populates="meal_log", cascade="all, delete-orphan")


class MealLogItem(Base):
    __tablename__ = "meal_log_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meal_log_id = Column(UUID(as_uuid=True), ForeignKey("meal_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    food_id = Column(UUID(as_uuid=True), ForeignKey("foods.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity_grams = Column(Numeric(8, 2), nullable=False)
    calculated_calories = Column(Numeric(8, 2), nullable=False)
    calculated_protein = Column(Numeric(7, 2), nullable=False)
    calculated_carbs = Column(Numeric(7, 2), nullable=False)
    calculated_fat = Column(Numeric(7, 2), nullable=False)

    meal_log = relationship("MealLog", back_populates="items")
    food = relationship("Food")
