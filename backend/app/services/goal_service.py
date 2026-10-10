from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalResponse, GoalTypeEnum
from app.core.weight import get_current_weight


def check_goal_conflict(
    goal_type_str: str,
    target_weight_kg: Optional[float],
    current_weight: Optional[float],
) -> Tuple[bool, Optional[str]]:
    """
    Evaluates goal consistency against current weight:
    - fat_loss / weight_loss: requires target_weight_kg < current_weight
    - muscle_gain: requires target_weight_kg >= current_weight
    - maintain / maintenance: requires |target_weight_kg - current_weight| <= 1.5 kg (if specified)
    """
    if current_weight is None or target_weight_kg is None:
        return False, None

    gt = goal_type_str.lower()

    if gt in ("fat_loss", "weight_loss"):
        if target_weight_kg >= current_weight:
            return True, f"Fat loss goal requires target weight less than current weight ({current_weight:.1f} kg)."
    elif gt == "muscle_gain":
        if target_weight_kg < current_weight:
            return True, f"Muscle gain goal requires target weight greater than or equal to current weight ({current_weight:.1f} kg)."
    elif gt in ("maintain", "maintenance"):
        if abs(target_weight_kg - current_weight) > 1.5:
            return True, f"Maintenance goal target weight must be within 1.5 kg of current weight ({current_weight:.1f} kg)."

    return False, None


class GoalService:
    @staticmethod
    def create_or_update_goal(db: Session, user: User, data: GoalCreate) -> GoalResponse:
        current_weight = get_current_weight(db, user)

        # Validate goal integrity before saving (reject invalid new/updated goals with 422)
        has_conflict, reason = check_goal_conflict(
            goal_type_str=data.goal_type.value,
            target_weight_kg=data.target_weight_kg,
            current_weight=current_weight,
        )
        if has_conflict:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=reason or "Goal矛盾: Target weight conflicts with goal type and current weight.",
            )

        active_goal = db.query(Goal).filter(Goal.user_id == user.id, Goal.is_active == True).first()

        if active_goal:
            active_goal.goal_type = data.goal_type.value
            active_goal.target_weight_kg = data.target_weight_kg
            active_goal.target_date = data.target_date
            db.commit()
            db.refresh(active_goal)
            res = GoalResponse.model_validate(active_goal)
            res.has_goal_conflict = False
            res.conflict_reason = None
            return res

        new_goal = Goal(
            user_id=user.id,
            goal_type=data.goal_type.value,
            target_weight_kg=data.target_weight_kg,
            target_date=data.target_date,
            is_active=True,
        )
        db.add(new_goal)
        db.commit()
        db.refresh(new_goal)
        res = GoalResponse.model_validate(new_goal)
        res.has_goal_conflict = False
        res.conflict_reason = None
        return res

    @staticmethod
    def get_active_goal(db: Session, user: User) -> Optional[GoalResponse]:
        active_goal = db.query(Goal).filter(Goal.user_id == user.id, Goal.is_active == True).first()
        if not active_goal:
            return None

        res = GoalResponse.model_validate(active_goal)
        current_weight = get_current_weight(db, user)
        has_conflict, reason = check_goal_conflict(
            goal_type_str=active_goal.goal_type,
            target_weight_kg=float(active_goal.target_weight_kg) if active_goal.target_weight_kg is not None else None,
            current_weight=current_weight,
        )
        res.has_goal_conflict = has_conflict
        res.conflict_reason = reason
        return res
