from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.nutrition import Food
from app.schemas.nutrition import FoodResponse

DEFAULT_FOODS = [
    {
        "name": "Whole Wheat Roti (Chapati)",
        "brand": "Standard",
        "calories_per_100g": 264.0,
        "protein_per_100g": 9.2,
        "carbs_per_100g": 52.0,
        "fat_per_100g": 2.5,
        "fiber_per_100g": 9.0,
    },
    {
        "name": "Cooked Basmati Rice",
        "brand": "Standard",
        "calories_per_100g": 130.0,
        "protein_per_100g": 2.7,
        "carbs_per_100g": 28.0,
        "fat_per_100g": 0.3,
        "fiber_per_100g": 0.4,
    },
    {
        "name": "Grilled Chicken Breast",
        "brand": "Standard",
        "calories_per_100g": 165.0,
        "protein_per_100g": 31.0,
        "carbs_per_100g": 0.0,
        "fat_per_100g": 3.6,
        "fiber_per_100g": 0.0,
    },
    {
        "name": "Paneer (Cottage Cheese)",
        "brand": "Fresh Dairy",
        "calories_per_100g": 265.0,
        "protein_per_100g": 18.0,
        "carbs_per_100g": 3.0,
        "fat_per_100g": 20.0,
        "fiber_per_100g": 0.0,
    },
    {
        "name": "Yellow Moong Dal (Cooked)",
        "brand": "Standard",
        "calories_per_100g": 118.0,
        "protein_per_100g": 7.0,
        "carbs_per_100g": 20.0,
        "fat_per_100g": 1.2,
        "fiber_per_100g": 4.5,
    },
    {
        "name": "Whole Boiled Egg",
        "brand": "Standard",
        "calories_per_100g": 155.0,
        "protein_per_100g": 13.0,
        "carbs_per_100g": 1.1,
        "fat_per_100g": 11.0,
        "fiber_per_100g": 0.0,
    },
    {
        "name": "Rolled Oats (Cooked)",
        "brand": "Standard",
        "calories_per_100g": 71.0,
        "protein_per_100g": 2.5,
        "carbs_per_100g": 12.0,
        "fat_per_100g": 1.5,
        "fiber_per_100g": 1.7,
    },
    {
        "name": "Whey Protein Isolate (Powder)",
        "brand": "Standard",
        "calories_per_100g": 370.0,
        "protein_per_100g": 80.0,
        "carbs_per_100g": 3.0,
        "fat_per_100g": 2.0,
        "fiber_per_100g": 0.0,
    },
    {
        "name": "Whole Milk (Cow)",
        "brand": "Fresh Dairy",
        "calories_per_100g": 62.0,
        "protein_per_100g": 3.2,
        "carbs_per_100g": 4.8,
        "fat_per_100g": 3.5,
        "fiber_per_100g": 0.0,
    },
    {
        "name": "Fresh Banana",
        "brand": "Produce",
        "calories_per_100g": 89.0,
        "protein_per_100g": 1.1,
        "carbs_per_100g": 22.8,
        "fat_per_100g": 0.3,
        "fiber_per_100g": 2.6,
    },
    {
        "name": "Raw Almonds",
        "brand": "Produce",
        "calories_per_100g": 579.0,
        "protein_per_100g": 21.0,
        "carbs_per_100g": 21.6,
        "fat_per_100g": 49.9,
        "fiber_per_100g": 12.5,
    },
    {
        "name": "Greek Yogurt (Curd)",
        "brand": "Fresh Dairy",
        "calories_per_100g": 59.0,
        "protein_per_100g": 10.0,
        "carbs_per_100g": 3.6,
        "fat_per_100g": 0.4,
        "fiber_per_100g": 0.0,
    },
]


class FoodService:
    @staticmethod
    def get_foods(
        db: Session,
        search: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[FoodResponse]:
        query = db.query(Food)
        if search:
            query = query.filter(Food.name.ilike(f"%{search}%"))
        foods = query.order_by(Food.name).offset(skip).limit(limit).all()
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
        for item in DEFAULT_FOODS:
            existing = db.query(Food).filter(Food.name == item["name"]).first()
            if not existing:
                f = Food(**item)
                db.add(f)
                db.commit()
                db.refresh(f)
                seeded.append(FoodResponse.model_validate(f))
            else:
                seeded.append(FoodResponse.model_validate(existing))
        return seeded
