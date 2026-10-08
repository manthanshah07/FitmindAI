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


def test_extract_date_with_timezone_boundaries():
    from datetime import datetime, timezone
    from app.core.timezone_utils import extract_date

    # 23:45 IST on Oct 7 = 18:15 UTC on Oct 7
    dt_utc_2345_ist = datetime(2026, 10, 7, 18, 15, tzinfo=timezone.utc)
    # 00:15 IST on Oct 8 = 18:45 UTC on Oct 7
    dt_utc_0015_ist = datetime(2026, 10, 7, 18, 45, tzinfo=timezone.utc)

    # In UTC calendar date, both are Oct 7:
    assert extract_date(dt_utc_2345_ist, "UTC") == date(2026, 10, 7)
    assert extract_date(dt_utc_0015_ist, "UTC") == date(2026, 10, 7)

    # In Asia/Kolkata timezone:
    # 18:15 UTC is 23:45 IST -> Oct 7
    assert extract_date(dt_utc_2345_ist, "Asia/Kolkata") == date(2026, 10, 7)
    # 18:45 UTC is 00:15 IST -> Oct 8
    assert extract_date(dt_utc_0015_ist, "Asia/Kolkata") == date(2026, 10, 8)

    # US/Eastern (EDT, UTC-4): 21:00 EDT on Oct 7 = 01:00 UTC on Oct 8
    dt_utc_0100_oct8 = datetime(2026, 10, 8, 1, 0, tzinfo=timezone.utc)
    assert extract_date(dt_utc_0100_oct8, "America/New_York") == date(2026, 10, 7)
    assert extract_date(dt_utc_0100_oct8, "UTC") == date(2026, 10, 8)

    # ISO string with offset
    assert extract_date("2026-10-07T23:45:00+05:30", "Asia/Kolkata") == date(2026, 10, 7)
    assert extract_date("2026-10-08T00:15:00+05:30", "Asia/Kolkata") == date(2026, 10, 8)


def test_calculate_calorie_adherence_canonical():
    from app.core.calculations import calculate_calorie_adherence

    # Exact target: 100.0% adherence
    assert calculate_calorie_adherence(2000.0, 2000.0) == 100.0
    assert calculate_calorie_adherence(2000.0, 2000.0, as_percentage=False) == 1.0

    # Modest deficit: 1800 on 2000 target = 10% error = 90.0% adherence
    assert calculate_calorie_adherence(1800.0, 2000.0) == 90.0
    assert calculate_calorie_adherence(1800.0, 2000.0, as_percentage=False) == 0.9

    # Modest surplus: 2200 on 2000 target = 10% error = 90.0% adherence
    assert calculate_calorie_adherence(2200.0, 2000.0) == 90.0
    assert calculate_calorie_adherence(2200.0, 2000.0, as_percentage=False) == 0.9

    # Large deviation: 4000 on 2000 target = 100% error = 0.0% adherence
    assert calculate_calorie_adherence(4000.0, 2000.0) == 0.0

    # Extreme deviation: 5000 on 2000 target (bounded at 0.0)
    assert calculate_calorie_adherence(5000.0, 2000.0) == 0.0

    # Zero actual calories
    assert calculate_calorie_adherence(0.0, 2000.0) == 0.0

    # Missing / None values
    assert calculate_calorie_adherence(None, 2000.0) is None
    assert calculate_calorie_adherence(2000.0, None) is None
    assert calculate_calorie_adherence(None, None) is None

    # Zero or negative targets
    assert calculate_calorie_adherence(2000.0, 0.0) is None
    assert calculate_calorie_adherence(2000.0, -100.0) is None
    assert calculate_calorie_adherence(-500.0, 2000.0) is None
