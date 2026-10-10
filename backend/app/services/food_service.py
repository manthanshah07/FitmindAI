from typing import List, Optional
from uuid import UUID
from sqlalchemy import case
from sqlalchemy.orm import Session
from app.models.nutrition import Food
from app.schemas.nutrition import FoodResponse
from app.core.food_catalog import FOOD_CATALOG

# Backward compatibility alias
DEFAULT_FOODS = FOOD_CATALOG


class FoodService:
    @staticmethod
    def get_foods(
        db: Session,
        search: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[FoodResponse]:
        if db.query(Food).first() is None:
            FoodService.seed_default_foods(db)

        query = db.query(Food)
        if search:
            query = query.filter(Food.name.ilike(f"%{search}%"))
            query = query.order_by(
                case(
                    (Food.name.ilike(f"{search}%"), 0),
                    (Food.name.ilike(f"% {search}%"), 1),
                    else_=2,
                ),
                Food.name.asc(),
            )
        else:
            query = query.order_by(Food.name.asc())
        foods = query.offset(skip).limit(limit).all()
        return [FoodResponse.model_validate(f) for f in foods]

    @staticmethod
    def get_food_by_id(db: Session, food_id: UUID) -> Optional[FoodResponse]:
        food = db.query(Food).filter(Food.id == food_id).first()
        if not food:
            return None
        return FoodResponse.model_validate(food)

    @staticmethod
    def seed_default_foods(db: Session) -> List[FoodResponse]:
        seeded = []
        for item in FOOD_CATALOG:
            existing = db.query(Food).filter(Food.name == item["name"]).first()
            if not existing:
                f = Food(**item)
                db.add(f)
                db.flush()
                seeded.append(FoodResponse.model_validate(f))
            else:
                seeded.append(FoodResponse.model_validate(existing))
        db.commit()
        return seeded
