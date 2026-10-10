import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple, Union
from uuid import UUID

from fastapi import HTTPException, status
from app.schemas.workout import WorkoutLogCreate


def normalize_weight(value: Optional[Union[float, Decimal, int, str]]) -> Optional[str]:
    """Parse weight using Decimal(str(value)) and quantize to 2 decimals using ROUND_HALF_UP.
    Required test cases:
      80.504 -> "80.50"
      80.505 -> "80.51"
      80.506 -> "80.51"
    """
    if value is None:
        return None
    d = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return str(d)


def normalize_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Convert datetime to canonical ISO 8601 UTC string format."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        dt_utc = dt.astimezone(timezone.utc)
    else:
        dt_utc = dt.replace(tzinfo=timezone.utc)
    return dt_utc.isoformat()


def str_discriminator(val: Optional[str]) -> Tuple[int, str]:
    """Sort discriminator ensuring None, '', '   ', and text stay distinct and comparable."""
    return (0, "") if val is None else (1, val)


def int_discriminator(val: Optional[int]) -> Tuple[int, int]:
    """Sort discriminator ensuring None and integers stay distinct and comparable."""
    return (0, 0) if val is None else (1, val)


def validate_idempotency_key(key: Optional[str]) -> Optional[str]:
    """Validate Idempotency-Key header according to Appendix B.1.
    - If None: return None (legacy unkeyed behavior).
    - If empty string or whitespace-only: raise 422.
    - If len > 128: raise 422.
    - Return key exactly as received (no trimming, no case alteration).
    """
    if key is None:
        return None
    if not key or key.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Idempotency-Key header cannot be empty or whitespace-only",
        )
    if len(key) > 128:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Idempotency-Key header must not exceed 128 characters",
        )
    return key


def build_canonical_payload(data: WorkoutLogCreate) -> Dict[str, Any]:
    """Build order-independent canonical payload dictionary for fingerprinting.
    - Notes are preserved verbatim (no trim, lowercase, or alteration).
    - Exercise order is ignored (exercises sorted by exercise_id).
    - Sets sorted by (set_number, reps_completed, weight_kg, rpe, notes) using discriminators.
    - Weights normalized via Decimal(str(v)) and ROUND_HALF_UP.
    """
    # Group sets by exercise_id
    grouped_exercises: Dict[str, List[Dict[str, Any]]] = {}
    for item in data.logged_exercises or []:
        ex_id_str = str(item.exercise_id)
        if ex_id_str not in grouped_exercises:
            grouped_exercises[ex_id_str] = []

        norm_weight = normalize_weight(item.weight_kg)
        set_dict = {
            "set_number": item.set_number,
            "reps_completed": item.reps_completed,
            "weight_kg": norm_weight,
            "rpe": item.rpe,
            "notes": item.notes,  # never trimmed or lowercased
        }
        grouped_exercises[ex_id_str].append(set_dict)

    canonical_exercises: List[Dict[str, Any]] = []
    # Sort exercises by exercise_id
    for ex_id in sorted(grouped_exercises.keys()):
        # Sort sets within exercise by set_number and every other field with null discriminators
        sets_list = grouped_exercises[ex_id]
        sorted_sets = sorted(
            sets_list,
            key=lambda s: (
                s["set_number"],
                int_discriminator(s["reps_completed"]),
                str_discriminator(s["weight_kg"]),
                int_discriminator(s["rpe"]),
                str_discriminator(s["notes"]),
            ),
        )
        canonical_exercises.append({
            "exercise_id": ex_id,
            "sets": sorted_sets,
        })

    plan_id_str = str(data.plan_id) if data.plan_id else None
    return {
        "plan_id": plan_id_str,
        "started_at": normalize_datetime(data.started_at),
        "ended_at": normalize_datetime(data.ended_at),
        "notes": data.notes,  # preserved verbatim
        "exercises": canonical_exercises,
    }


def compute_request_fingerprint(data: WorkoutLogCreate) -> Tuple[str, Dict[str, Any]]:
    """Compute SHA-256 hash of canonical JSON with sorted keys and fixed separators."""
    canonical_dict = build_canonical_payload(data)
    canonical_json = json.dumps(canonical_dict, sort_keys=True, separators=(",", ":"))
    fingerprint = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
    return fingerprint, canonical_dict
