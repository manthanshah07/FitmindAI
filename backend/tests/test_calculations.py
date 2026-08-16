from datetime import date
from app.core.calculations import calculate_age_from_dob, calculate_tdee


def test_calculate_age_from_dob():
    assert calculate_age_from_dob(None) is None
    today = date.today()
    dob = date(today.year - 30, today.month, today.day)
    assert calculate_age_from_dob(dob) == 30


def test_calculate_tdee_with_inputs():
    res = calculate_tdee(
        weight_kg=80.0,
        height_cm=180.0,
        date_of_birth=date(1995, 1, 1),
        gender="male",
        activity_level="very_active",
    )
    assert res["weight_used"] == 80.0
    assert res["height_used"] == 180.0
    assert res["is_weight_defaulted"] is False
    assert res["tdee"] > 2000
