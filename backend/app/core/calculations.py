from datetime import date
from typing import Optional, Dict, Any, Tuple


def calculate_age_from_dob(dob: Optional[date], reference_date: Optional[date] = None) -> Optional[int]:
    if not dob:
        return None
    ref = reference_date or date.today()
    age = ref.year - dob.year - ((ref.month, ref.day) < (dob.month, dob.day))
    return age if 0 <= age <= 120 else None


def calculate_tdee(
    weight_kg: Optional[float],
    height_cm: Optional[float],
    date_of_birth: Optional[date] = None,
    gender: Optional[str] = None,
    activity_level: Optional[str] = None,
    reference_date: Optional[date] = None,
) -> Dict[str, Any]:
    height_used = float(height_cm) if height_cm and float(height_cm) > 0 else 175.0

    is_weight_defaulted = False
    if weight_kg and float(weight_kg) > 0:
        weight_used = float(weight_kg)
    else:
        weight_used = 70.0
        is_weight_defaulted = True


    computed_age = calculate_age_from_dob(date_of_birth, reference_date=reference_date)
    if computed_age is not None:
        age_used = computed_age
        is_age_defaulted = False
    else:
        age_used = 25
        is_age_defaulted = True

    if gender == "male":
        gender_offset = 5.0
    elif gender == "female":
        gender_offset = -161.0
    else:
        gender_offset = -78.0

    bmr = round(10.0 * weight_used + 6.25 * height_used - 5.0 * age_used + gender_offset)

    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "very_active": 1.725,
        "extra_active": 1.9,
    }
    multiplier = activity_multipliers.get(activity_level or "moderate", 1.55)
    tdee = round(bmr * multiplier)

    return {
        "bmr": bmr,
        "tdee": tdee,
        "age_used": age_used,
        "weight_used": weight_used,
        "height_used": height_used,
        "is_age_defaulted": is_age_defaulted,
        "is_weight_defaulted": is_weight_defaulted,
    }


def calculate_calorie_adherence(
    actual_calories: Optional[float],
    target_calories: Optional[float],
    as_percentage: bool = True,
) -> Optional[float]:
    """
    Authoritative canonical calculation for calorie target adherence.
    Measures proximity of actual caloric intake to target calories:
        adherence_ratio = max(0.0, min(1.0, 1.0 - (abs(actual - target) / target)))

    If as_percentage is True, returns [0.0, 100.0] rounded to 1 decimal place.
    If as_percentage is False, returns normalized [0.0, 1.0] for ML modeling.
    Returns None if actual_calories or target_calories is missing or non-positive.
    """
    if actual_calories is None or target_calories is None:
        return None
    try:
        actual = float(actual_calories)
        target = float(target_calories)
    except (ValueError, TypeError):
        return None

    if target <= 0.0 or actual < 0.0:
        return None

    relative_error = abs(actual - target) / target
    score = max(0.0, min(1.0, 1.0 - relative_error))

    if as_percentage:
        return round(score * 100.0, 1)
    return round(score, 4)
