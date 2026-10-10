"""
Test suite for central weight resolution helper (fixes D6).
"""
import pytest
from datetime import date, timedelta
from tests.conftest import TestingSessionLocal
from app.models.user import User
from app.models.profile import Profile
from app.models.progress import Measurement
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequest
from app.core.weight import get_current_weight


class TestWeightResolution:
    def test_weight_fallback_to_profile_when_no_measurements(self):
        db = TestingSessionLocal()
        try:
            user = AuthService.register_user(
                db, RegisterRequest(email="weight_profile_only@example.com", password="Password123!", full_name="Weight User")
            )
            profile = db.query(Profile).filter(Profile.user_id == user.id).first()
            profile.weight_kg = 82.5
            db.commit()

            resolved = get_current_weight(db, user)
            assert resolved == 82.5
        finally:
            db.close()

    def test_weight_measurement_takes_precedence_over_profile(self):
        db = TestingSessionLocal()
        try:
            user = AuthService.register_user(
                db, RegisterRequest(email="weight_prec_user@example.com", password="Password123!", full_name="Prec User")
            )
            profile = db.query(Profile).filter(Profile.user_id == user.id).first()
            profile.weight_kg = 85.0
            db.commit()

            # Add older measurement
            m1 = Measurement(
                user_id=user.id,
                measured_at=date.today() - timedelta(days=5),
                weight_kg=83.0,
            )
            # Add newer measurement
            m2 = Measurement(
                user_id=user.id,
                measured_at=date.today() - timedelta(days=1),
                weight_kg=81.2,
            )
            db.add_all([m1, m2])
            db.commit()

            resolved = get_current_weight(db, user)
            # Latest measurement (81.2 kg) takes precedence over profile (85.0 kg)
            assert resolved == 81.2
        finally:
            db.close()

    def test_weight_none_when_no_profile_or_measurements(self):
        db = TestingSessionLocal()
        try:
            user = AuthService.register_user(
                db, RegisterRequest(email="weight_none_user@example.com", password="Password123!", full_name="None User")
            )
            profile = db.query(Profile).filter(Profile.user_id == user.id).first()
            profile.weight_kg = None
            db.commit()

            resolved = get_current_weight(db, user)
            assert resolved is None
        finally:
            db.close()
