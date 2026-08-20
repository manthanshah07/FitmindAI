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


def test_extract_date_utility():
    from datetime import datetime
    from app.core.timezone_utils import extract_date

    assert extract_date(None) is None
    d = date(2026, 8, 19)
    assert extract_date(d) == d
    dt = datetime(2026, 8, 19, 14, 30, 0)
    assert extract_date(dt) == d
    assert extract_date("2026-08-19T14:30:00Z") == d
    assert extract_date("2026-08-19 14:30:00") == d
    assert extract_date("invalid-date-string") is None
    assert extract_date(12345) is None
