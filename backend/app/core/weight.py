"""Centralized weight resolution helper ensuring single source of truth (fixes D6)."""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.profile import Profile
from app.models.progress import Measurement


def get_current_weight(db: Session, user: User) -> Optional[float]:
    """
    Returns user's current weight in kg.
    Precedence:
    1. Latest recorded weigh-in in measurements (measured_at DESC, created_at DESC) where weight_kg IS NOT NULL.
    2. Fallback to profile.weight_kg if no measurement exists.
    3. None if neither is present.
    """
    latest_measurement = (
        db.query(Measurement)
        .filter(Measurement.user_id == user.id, Measurement.weight_kg.isnot(None))
        .order_by(Measurement.measured_at.desc(), Measurement.created_at.desc())
        .first()
    )
    if latest_measurement and latest_measurement.weight_kg is not None:
        return float(latest_measurement.weight_kg)

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if profile and profile.weight_kg is not None:
        return float(profile.weight_kg)

    return None
