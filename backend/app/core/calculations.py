from datetime import date
from typing import Optional, Dict, Any, Tuple


def calculate_age_from_dob(dob: Optional[date]) -> Optional[int]:
    if not dob:
        return None
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return age if 0 <= age <= 120 else None


def calculate_tdee(
    weight_kg: Optional[float],
    height_cm: Optional[float],
    date_of_birth: Optional[date] = None,
    gender: Optional[str] = None,
    activity_level: Optional[str] = None,
) -> Dict[str, Any]:
    height_used = float(height_cm) if height_cm and float(height_cm) > 0 else 175.0

    is_weight_defaulted = False
    if weight_kg and float(weight_kg) > 0:
        weight_used = float(weight_kg)
    else:
        weight_used = 70.0
        is_weight_defaulted = True


    computed_age = calculate_age_from_dob(date_of_birth)
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
