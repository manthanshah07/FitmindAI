from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalResponse


class GoalService:
    @staticmethod
    def create_or_update_goal(db: Session, user: User, data: GoalCreate) -> GoalResponse:
        # Find active goal if it exists
        active_goal = db.query(Goal).filter(Goal.user_id == user.id, Goal.is_active == True).first()

        if active_goal:
            active_goal.goal_type = data.goal_type.value
            active_goal.target_weight_kg = data.target_weight_kg
            active_goal.target_date = data.target_date
            db.commit()
            db.refresh(active_goal)
            return GoalResponse.model_validate(active_goal)

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
        return GoalResponse.model_validate(new_goal)

    @staticmethod
    def get_active_goal(db: Session, user: User) -> Optional[GoalResponse]:
        active_goal = db.query(Goal).filter(Goal.user_id == user.id, Goal.is_active == True).first()
        if not active_goal:
            return None
        return GoalResponse.model_validate(active_goal)
