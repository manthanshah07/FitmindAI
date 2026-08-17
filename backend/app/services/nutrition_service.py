from datetime import datetime, date, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.nutrition import Food, MealLog, MealLogItem
from app.schemas.nutrition import (
    MealLogCreate,
    MealLogResponse,
    DailyNutritionSummaryResponse,
    MacroNutrients,
)
from app.services.food_service import FoodService
from app.core.calculations import calculate_tdee, calculate_age_from_dob


class NutritionService:
    @staticmethod
    def calculate_user_targets(db: Session, user: User) -> MacroNutrients:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        active_goal = db.query(Goal).filter(Goal.user_id == user.id, Goal.is_active == True).first()

        weight_kg = float(profile.weight_kg) if profile and profile.weight_kg else 70.0
        height_cm = float(profile.height_cm) if profile and profile.height_cm else 170.0
        gender = profile.gender if profile and profile.gender else "male"
        activity = profile.activity_level if profile and profile.activity_level else "moderate"

        res = calculate_tdee(
            weight_kg=weight_kg,
            height_cm=height_cm,
            date_of_birth=profile.date_of_birth if profile else None,
            gender=gender,
            activity_level=activity,
        )

        tdee = float(res["tdee"])
        goal_type = active_goal.goal_type if active_goal else "maintain"

        # Goal calorie adjustment
        if goal_type == "weight_loss":
            cal_target = max(1200.0 if gender.lower() == "female" else 1500.0, tdee - 500.0)
            protein_g = round(weight_kg * 2.2, 1)
        elif goal_type == "muscle_gain":
            cal_target = tdee + 300.0
            protein_g = round(weight_kg * 2.0, 1)
        elif goal_type == "endurance":
            cal_target = tdee + 150.0
            protein_g = round(weight_kg * 1.6, 1)
        else:  # maintain or general_fitness
            cal_target = tdee
            protein_g = round(weight_kg * 1.6, 1)

        fat_g = round((cal_target * 0.25) / 9.0, 1)
        used_cals = (protein_g * 4.0) + (fat_g * 9.0)
        carbs_g = round(max(0.0, (cal_target - used_cals) / 4.0), 1)

        return MacroNutrients(
            calories=round(cal_target, 1),
            protein_g=protein_g,
            carbs_g=carbs_g,
            fat_g=fat_g,
        )

    @staticmethod
    def log_meal(db: Session, user: User, data: MealLogCreate) -> MealLogResponse:
        # Ensure foods database is seeded
        FoodService.seed_default_foods(db)

        if not data.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Meal log must contain at least one food item",
            )

        # Validate all foods exist beforehand
        requested_food_ids = [item.food_id for item in data.items]
        unique_food_ids = set(requested_food_ids)
        existing_foods = db.query(Food).filter(Food.id.in_(unique_food_ids)).all()
        food_map = {f.id: f for f in existing_foods}

        if len(food_map) < len(unique_food_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more food items do not exist",
            )

        meal_log = MealLog(
            user_id=user.id,
            meal_type=data.meal_type.lower(),
            logged_at=data.logged_at,
            notes=data.notes,
        )
        db.add(meal_log)
        db.flush()

        for item in data.items:
            food = food_map[item.food_id]
            q = float(item.quantity_grams)
            cals = round(float(food.calories_per_100g) * q / 100.0, 2)
            prot = round(float(food.protein_per_100g) * q / 100.0, 2)
            carbs = round(float(food.carbs_per_100g) * q / 100.0, 2)
            fat = round(float(food.fat_per_100g) * q / 100.0, 2)

            log_item = MealLogItem(
                meal_log_id=meal_log.id,
                food_id=food.id,
                quantity_grams=q,
                calculated_calories=cals,
                calculated_protein=prot,
                calculated_carbs=carbs,
                calculated_fat=fat,
            )
            db.add(log_item)

        db.commit()

        created_log = (
            db.query(MealLog)
            .options(joinedload(MealLog.items).joinedload(MealLogItem.food))
            .filter(MealLog.id == meal_log.id)
            .first()
        )
        return MealLogResponse.model_validate(created_log)

    @staticmethod
    def get_today_summary(db: Session, user: User, target_date: Optional[date] = None) -> DailyNutritionSummaryResponse:
        if not target_date:
            target_date = date.today()

        targets = NutritionService.calculate_user_targets(db, user)

        # Database-side filtering with start/end boundaries for target_date
        start_dt = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=timezone.utc)

        today_logs = (
            db.query(MealLog)
            .options(joinedload(MealLog.items).joinedload(MealLogItem.food))
            .filter(
                MealLog.user_id == user.id,
                MealLog.logged_at >= start_dt,
                MealLog.logged_at <= end_dt,
            )
            .all()
        )

        consumed_cals = 0.0
        consumed_protein = 0.0
        consumed_carbs = 0.0
        consumed_fat = 0.0

        meals_by_type: dict[str, List[MealLogResponse]] = {
            "breakfast": [],
            "lunch": [],
            "dinner": [],
            "snack": [],
        }

        for log in today_logs:
            resp = MealLogResponse.model_validate(log)
            m_type = log.meal_type.lower()
            if m_type in meals_by_type:
                meals_by_type[m_type].append(resp)
            else:
                meals_by_type["snack"].append(resp)

            for item in log.items:
                consumed_cals += float(item.calculated_calories)
                consumed_protein += float(item.calculated_protein)
                consumed_carbs += float(item.calculated_carbs)
                consumed_fat += float(item.calculated_fat)

        consumed = MacroNutrients(
            calories=round(consumed_cals, 1),
            protein_g=round(consumed_protein, 1),
            carbs_g=round(consumed_carbs, 1),
            fat_g=round(consumed_fat, 1),
        )

        remaining = MacroNutrients(
            calories=round(max(0.0, targets.calories - consumed.calories), 1),
            protein_g=round(max(0.0, targets.protein_g - consumed.protein_g), 1),
            carbs_g=round(max(0.0, targets.carbs_g - consumed.carbs_g), 1),
            fat_g=round(max(0.0, targets.fat_g - consumed.fat_g), 1),
        )

        return DailyNutritionSummaryResponse(
            date=target_date.isoformat(),
            targets=targets,
            consumed=consumed,
            remaining=remaining,
            meals_by_type=meals_by_type,
        )

    @staticmethod
    def get_meal_logs(db: Session, user: User, limit: int = 20, skip: int = 0) -> List[MealLogResponse]:
        logs = (
            db.query(MealLog)
            .options(joinedload(MealLog.items).joinedload(MealLogItem.food))
            .filter(MealLog.user_id == user.id)
            .order_by(MealLog.logged_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [MealLogResponse.model_validate(l) for l in logs]

    @staticmethod
    def get_meal_log_by_id(db: Session, user: User, log_id: UUID) -> Optional[MealLogResponse]:
        log = (
            db.query(MealLog)
            .options(joinedload(MealLog.items).joinedload(MealLogItem.food))
            .filter(MealLog.user_id == user.id, MealLog.id == log_id)
            .first()
        )
        if not log:
            return None
        return MealLogResponse.model_validate(log)
