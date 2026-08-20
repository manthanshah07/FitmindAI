import os
import sys
import random
from pathlib import Path

# Add backend directory to sys.path if not present so script runs directly or via -m
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password

from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.workout import Exercise, WorkoutPlan, WorkoutPlanExercise, WorkoutLog, WorkoutLogExercise
from app.models.nutrition import Food, MealLog, MealLogItem
from app.models.progress import Measurement
from app.models.ai_memory import AIMemory
from app.models.chat_message import ChatMessage
from app.models.fitness_score import FitnessScore
from app.models.refresh_token import RefreshToken
from app.services.fitness_score_service import FitnessScoreService
from app.core.config import settings

TEST_SUBJECT_PASSWORD = "FitMindDemo@2026"
DEMO_PASSWORD_PLAIN = TEST_SUBJECT_PASSWORD


TEST_SUBJECTS_CONFIG = [
    {
        "email": "demo.full@fitmind.ai",
        "full_name": "Marcus Vance",
        "gender": "male",
        "height_cm": 178.0,
        "weight_kg": 81.0,
        "start_weight_kg": 82.6,
        "activity_level": "moderate",
        "diet_preference": "omnivore",
        "equipment": ["dumbbells", "barbell", "cables"],
        "timezone": "America/New_York",
        "goal_type": "muscle_gain",
        "target_weight_kg": 78.5,
        "target_days": 4,
        "history_days": 30,
        "tdee": 2720,
        "target_cals": 2560,
        "target_protein": 142,
        "logging_adherence": 0.77,
        "workout_adherence": 0.75,
        "recent_workout_days": [0, 2, 4, 6],


        "recent_nutrition_days": [1, 2, 3, 4, 5],


        "scenario": "Fully populated realistic user with high overall adherence",
    },
    {
        "email": "demo.athlete@fitmind.ai",
        "full_name": "Elena Rostova",
        "gender": "female",
        "height_cm": 168.0,
        "weight_kg": 61.5,
        "start_weight_kg": 61.4,
        "activity_level": "very_active",
        "diet_preference": "omnivore",
        "equipment": ["full_gym"],
        "timezone": "America/Los_Angeles",
        "goal_type": "fat_loss",
        "target_weight_kg": 59.0,
        "target_days": 5,
        "history_days": 30,
        "tdee": 2900,
        "target_cals": 2700,
        "target_protein": 122,
        "logging_adherence": 0.97,
        "workout_adherence": 0.93,
        "recent_workout_days": [0, 1, 2, 4, 5],
        "recent_nutrition_days": [0, 1, 2, 3, 4, 5, 6],
        "scenario": "Highly consistent active athlete with strong performance",
    },
    {
        "email": "demo.beginner@fitmind.ai",
        "full_name": "Jordan Chen",
        "gender": "other",
        "height_cm": 175.0,
        "weight_kg": 87.6,
        "start_weight_kg": 87.8,
        "activity_level": "sedentary",
        "diet_preference": "vegetarian",
        "equipment": ["bodyweight"],
        "timezone": "UTC",
        "goal_type": "general_fitness",
        "target_weight_kg": 68.0,
        "target_days": 3,
        "history_days": 18,
        "tdee": 2620,
        "target_cals": 2280,
        "target_protein": 116,
        "logging_adherence": 0.50,
        "workout_adherence": 0.33,
        "recent_workout_days": [2],
        "recent_nutrition_days": [],
        "scenario": "New beginner to test sparse data & insufficient data UI states",
    },
    {
        "email": "demo.bulking@fitmind.ai",
        "full_name": "Liam Gallagher",
        "gender": "male",
        "height_cm": 183.0,
        "weight_kg": 72.0,
        "start_weight_kg": 70.5,
        "activity_level": "moderate",
        "diet_preference": "omnivore",
        "equipment": ["barbell", "dumbbells"],
        "timezone": "Europe/London",
        "goal_type": "muscle_gain",
        "target_weight_kg": 90.0,
        "target_days": 4,
        "history_days": 30,
        "tdee": 2650,
        "target_cals": 2880,
        "target_protein": 131,
        "logging_adherence": 0.87,
        "workout_adherence": 0.73,
        "recent_workout_days": [0, 2, 4, 6],
        "recent_nutrition_days": [0, 1, 2, 3, 4, 5],
        "scenario": "User focused on muscle gain and caloric surplus",
    },
    {
        "email": "demo.cutting@fitmind.ai",
        "full_name": "Sophia Martinez",
        "gender": "female",
        "height_cm": 165.0,
        "weight_kg": 65.8,
        "start_weight_kg": 68.6,
        "activity_level": "moderate",
        "diet_preference": "omnivore",
        "equipment": ["dumbbells", "cardio_machines"],
        "timezone": "America/Chicago",
        "goal_type": "fat_loss",
        "target_weight_kg": 62.0,
        "target_days": 4,
        "history_days": 30,
        "tdee": 2080,
        "target_cals": 1780,
        "target_protein": 135,
        "logging_adherence": 0.90,
        "workout_adherence": 0.83,
        "recent_workout_days": [0, 2, 4, 5],
        "recent_nutrition_days": [0, 1, 2, 3, 4, 5],
        "scenario": "User focused on weight loss and caloric deficit",
    },
    {
        "email": "demo.inconsistent@fitmind.ai",
        "full_name": "David Miller",
        "gender": "male",
        "height_cm": 180.0,
        "weight_kg": 94.5,
        "start_weight_kg": 94.9,
        "activity_level": "light",
        "diet_preference": "omnivore",
        "equipment": ["dumbbells"],
        "timezone": "America/New_York",
        "goal_type": "general_fitness",
        "target_weight_kg": 78.0,
        "target_days": 3,
        "history_days": 30,
        "tdee": 2780,
        "target_cals": 2400,
        "target_protein": 114,
        "logging_adherence": 0.43,
        "workout_adherence": 0.30,
        "recent_workout_days": [2],
        "recent_nutrition_days": [1],

        "scenario": "Irregular real-world user with partial adherence",
    },
    {
        "email": "demo.progress@fitmind.ai",
        "full_name": "Rachel Kim",
        "gender": "female",
        "height_cm": 170.0,
        "weight_kg": 71.4,
        "start_weight_kg": 74.7,
        "activity_level": "moderate",
        "diet_preference": "pescatarian",
        "equipment": ["full_gym"],
        "timezone": "America/Los_Angeles",
        "goal_type": "weight_loss",
        "target_weight_kg": 62.0,
        "target_days": 4,
        "history_days": 60,
        "tdee": 2180,
        "target_cals": 1970,
        "target_protein": 117,
        "logging_adherence": 0.80,
        "workout_adherence": 0.62,
        "recent_workout_days": [0, 2, 4, 6],
        "recent_nutrition_days": [0, 1, 2, 3, 4, 5],
        "scenario": "Strong 60-day historical weight and body composition progression",
    },
    {
        "email": "demo.noplan@fitmind.ai",
        "full_name": "Alex Taylor",
        "gender": "other",
        "height_cm": 163.0,
        "weight_kg": 63.1,
        "start_weight_kg": 63.4,
        "activity_level": "moderate",
        "diet_preference": "omnivore",
        "equipment": ["bodyweight", "dumbbells"],
        "timezone": "UTC",
        "goal_type": "general_fitness",
        "target_weight_kg": 70.0,
        "target_days": 5,
        "history_days": 24,
        "tdee": 1970,
        "target_cals": 1900,
        "target_protein": 76,
        "logging_adherence": 0.58,
        "workout_adherence": 0.21,
        "recent_workout_days": [2],
        "recent_nutrition_days": [1, 3, 5],
        "scenario": "User without an active WorkoutPlan to test profile preference fallback",
    },
    {
        "email": "demo.timezone@fitmind.ai",
        "full_name": "Aarav Sharma",
        "gender": "male",
        "height_cm": 172.0,
        "weight_kg": 74.8,
        "start_weight_kg": 75.8,
        "activity_level": "moderate",
        "diet_preference": "vegetarian",
        "equipment": ["dumbbells"],
        "timezone": "Asia/Kolkata",
        "goal_type": "muscle_gain",
        "target_weight_kg": 80.0,
        "target_days": 4,
        "history_days": 30,
        "tdee": 2460,
        "target_cals": 2320,
        "target_protein": 128,
        "logging_adherence": 0.87,
        "workout_adherence": 0.67,
        "recent_workout_days": [0, 2, 4, 6],
        "recent_nutrition_days": [0, 1, 2, 3, 4, 5],
        "scenario": "Asia/Kolkata timezone testing near local midnight boundaries",
    },
    {
        "email": "demo.ai@fitmind.ai",
        "full_name": "Maya Patel",
        "gender": "female",
        "height_cm": 160.0,
        "weight_kg": 65.0,
        "start_weight_kg": 66.2,
        "activity_level": "moderate",
        "diet_preference": "vegetarian",
        "equipment": ["dumbbells", "bodyweight"],
        "timezone": "America/New_York",
        "goal_type": "muscle_gain",
        "target_weight_kg": 61.0,
        "target_days": 4,
        "history_days": 30,
        "tdee": 1980,
        "target_cals": 1870,
        "target_protein": 95,
        "logging_adherence": 0.83,
        "workout_adherence": 0.57,
        "recent_workout_days": [1, 3, 5],
        "recent_nutrition_days": [0, 1, 2, 3, 4, 5],
        "scenario": "AI Coach testing with persisted AI memory and chat history",
    },
]

DEMO_ACCOUNTS_CONFIG = TEST_SUBJECTS_CONFIG


def seed_exercises(db: Session) -> Dict[str, Exercise]:
    exercises_data = [
        {"name": "Barbell Bench Press", "primary_muscle": "Chest", "equipment_required": ["barbell"]},
        {"name": "Incline Dumbbell Press", "primary_muscle": "Chest", "equipment_required": ["dumbbells"]},
        {"name": "Barbell Squat", "primary_muscle": "Quadriceps", "equipment_required": ["barbell"]},
        {"name": "Leg Press", "primary_muscle": "Quadriceps", "equipment_required": ["full_gym"]},
        {"name": "Romanian Deadlift", "primary_muscle": "Hamstrings", "equipment_required": ["barbell"]},
        {"name": "Pull-Up", "primary_muscle": "Lats", "equipment_required": ["bodyweight"]},
        {"name": "Barbell Row", "primary_muscle": "Upper Back", "equipment_required": ["barbell"]},
        {"name": "Lat Pulldown", "primary_muscle": "Lats", "equipment_required": ["cables", "full_gym"]},
        {"name": "Overhead Press", "primary_muscle": "Shoulders", "equipment_required": ["barbell"]},
        {"name": "Dumbbell Bicep Curl", "primary_muscle": "Biceps", "equipment_required": ["dumbbells"]},
        {"name": "Tricep Rope Pushdown", "primary_muscle": "Triceps", "equipment_required": ["cables"]},
        {"name": "Bodyweight Squat", "primary_muscle": "Quadriceps", "equipment_required": ["bodyweight"]},
        {"name": "Knee Push-Up", "primary_muscle": "Chest", "equipment_required": ["bodyweight"]},
        {"name": "Plank Hold", "primary_muscle": "Core", "equipment_required": ["bodyweight"]},
        {"name": "Stationary Cycling", "primary_muscle": "Cardio", "equipment_required": ["cardio_machines"]},
    ]
    catalog = {}
    for item in exercises_data:
        ex = db.query(Exercise).filter(Exercise.name == item["name"]).first()
        if not ex:
            ex = Exercise(
                name=item["name"],
                primary_muscle=item["primary_muscle"],
                equipment_required=item["equipment_required"],
                difficulty="intermediate",
                category="cardio" if item["primary_muscle"] == "Cardio" else "strength",
            )
            db.add(ex)
            db.flush()
        catalog[item["name"]] = ex
    return catalog


def seed_foods(db: Session) -> Dict[str, Food]:
    foods_data = [
        # Breakfast Items
        {"name": "Oatmeal with Milk", "calories": 180, "protein": 7.0, "carbs": 28.0, "fat": 4.5, "meal_types": ["breakfast"]},
        {"name": "Peanut Butter (Spread)", "calories": 588, "protein": 25.0, "carbs": 20.0, "fat": 50.0, "meal_types": ["breakfast", "snack"]},
        {"name": "Fresh Banana", "calories": 89, "protein": 1.1, "carbs": 23.0, "fat": 0.3, "meal_types": ["breakfast", "snack"]},
        {"name": "Scrambled Eggs (2 Whole)", "calories": 150, "protein": 12.0, "carbs": 1.2, "fat": 11.0, "meal_types": ["breakfast"]},
        {"name": "Whole Wheat Toast (2 Slices)", "calories": 140, "protein": 6.0, "carbs": 26.0, "fat": 2.0, "meal_types": ["breakfast", "snack"]},
        {"name": "Greek Yogurt (Plain 0%)", "calories": 59, "protein": 10.0, "carbs": 3.6, "fat": 0.4, "meal_types": ["breakfast", "snack"]},
        {"name": "Vegetable Poha", "calories": 160, "protein": 3.5, "carbs": 31.0, "fat": 3.2, "meal_types": ["breakfast", "snack"]},
        {"name": "Semolina Upma", "calories": 180, "protein": 4.5, "carbs": 32.0, "fat": 4.0, "meal_types": ["breakfast", "snack"]},
        {"name": "Idli with Sambar (3 Pcs)", "calories": 210, "protein": 8.0, "carbs": 42.0, "fat": 1.5, "meal_types": ["breakfast"]},

        # Main Meals (Lunch & Dinner)
        {"name": "Grilled Chicken Breast", "calories": 165, "protein": 31.0, "carbs": 0.0, "fat": 3.6, "meal_types": ["lunch", "dinner"]},
        {"name": "Steamed Brown Rice", "calories": 112, "protein": 2.6, "carbs": 24.0, "fat": 0.9, "meal_types": ["lunch", "dinner"]},
        {"name": "Steamed Broccoli & Carrots", "calories": 35, "protein": 2.4, "carbs": 7.0, "fat": 0.4, "meal_types": ["lunch", "dinner"]},
        {"name": "Yellow Dal Tadka", "calories": 120, "protein": 7.5, "carbs": 18.0, "fat": 2.5, "meal_types": ["lunch", "dinner"]},
        {"name": "Whole Wheat Roti / Chapati", "calories": 104, "protein": 3.5, "carbs": 20.0, "fat": 1.2, "meal_types": ["lunch", "dinner"]},
        {"name": "Paneer Tikka Masala", "calories": 220, "protein": 11.0, "carbs": 9.0, "fat": 15.5, "meal_types": ["lunch", "dinner"]},
        {"name": "Rajma Curry (Kidney Beans)", "calories": 140, "protein": 8.5, "carbs": 22.0, "fat": 2.8, "meal_types": ["lunch", "dinner"]},
        {"name": "Atlantic Salmon Fillet", "calories": 206, "protein": 22.0, "carbs": 0.0, "fat": 12.0, "meal_types": ["lunch", "dinner"]},
        {"name": "Baked Sweet Potato", "calories": 90, "protein": 2.0, "carbs": 21.0, "fat": 0.15, "meal_types": ["lunch", "dinner"]},
        {"name": "Whole Wheat Pasta with Marinara", "calories": 150, "protein": 5.5, "carbs": 29.0, "fat": 1.8, "meal_types": ["lunch", "dinner"]},
        {"name": "Tofu Vegetable Stir-Fry", "calories": 125, "protein": 10.0, "carbs": 7.0, "fat": 6.5, "meal_types": ["lunch", "dinner"]},

        # Snacks
        {"name": "Whey Protein Shake (1 Scoop)", "calories": 130, "protein": 25.0, "carbs": 2.5, "fat": 1.8, "meal_types": ["snack"]},
        {"name": "Soy Protein Shake (Vegan)", "calories": 120, "protein": 24.0, "carbs": 2.0, "fat": 1.2, "meal_types": ["snack"]},
        {"name": "Roasted Chana (Chickpeas)", "calories": 360, "protein": 19.0, "carbs": 58.0, "fat": 6.0, "meal_types": ["snack"]},
        {"name": "Crisp Red Apple", "calories": 52, "protein": 0.3, "carbs": 14.0, "fat": 0.2, "meal_types": ["snack"]},
        {"name": "Mixed Almonds & Walnuts", "calories": 600, "protein": 20.0, "carbs": 18.0, "fat": 52.0, "meal_types": ["snack"]},
        {"name": "Raw Cottage Cheese / Paneer", "calories": 265, "protein": 18.0, "carbs": 3.2, "fat": 20.0, "meal_types": ["snack"]},
        {"name": "High Protein Bar", "calories": 210, "protein": 20.0, "carbs": 22.0, "fat": 7.0, "meal_types": ["snack"]},
    ]
    catalog = {}
    for item in foods_data:
        fd = db.query(Food).filter(Food.name == item["name"]).first()
        if not fd:
            fd = Food(
                name=item["name"],
                calories_per_100g=item["calories"],
                protein_per_100g=item["protein"],
                carbs_per_100g=item["carbs"],
                fat_per_100g=item["fat"],
                is_verified=True,
            )
            db.add(fd)
            db.flush()
        catalog[item["name"]] = (fd, item["meal_types"])
    return catalog


def add_meal_item(db: Session, meal_id, food: Food, grams: float):
    cals = float(food.calories_per_100g) * (grams / 100.0)
    prot = float(food.protein_per_100g) * (grams / 100.0)
    carbs = float(food.carbs_per_100g) * (grams / 100.0)
    fat = float(food.fat_per_100g) * (grams / 100.0)
    item = MealLogItem(
        meal_log_id=meal_id,
        food_id=food.id,
        quantity_grams=grams,
        calculated_calories=cals,
        calculated_protein=prot,
        calculated_carbs=carbs,
        calculated_fat=fat,
    )
    db.add(item)
    return cals, prot, carbs, fat


def generate_daily_meals_for_user(
    db: Session,
    user_id,
    meal_date: date,
    target_cals: float,
    target_protein: float,
    diet_pref: str,
    user_tz: ZoneInfo,
    food_catalog: dict,
    rng: random.Random,
    is_weekend: bool = False,
):
    """Generates 3-4 realistic meals for a day with accurate portions matching user target calories and protein."""
    avail_foods = []
    for fname, (fd, mtypes) in food_catalog.items():
        if diet_pref in ("vegetarian", "vegan") and any(k in fname.lower() for k in ["chicken", "salmon"]):
            continue
        if diet_pref == "vegan" and any(k in fname.lower() for k in ["eggs", "paneer", "cottage", "yogurt", "whey"]):
            continue
        if diet_pref == "pescatarian" and any(k in fname.lower() for k in ["chicken"]):
            continue
        avail_foods.append((fd, mtypes))

    day_target_cals = target_cals * (1.0 + rng.uniform(-0.05, 0.05))
    if is_weekend and rng.random() < 0.5:
        day_target_cals *= rng.uniform(1.06, 1.15)

    meal_splits = [
        ("breakfast", 0.25, 8, 15),
        ("lunch", 0.35, 13, 0),
        ("snack", 0.12, 16, 30),
        ("dinner", 0.28, 20, 0),
    ]

    total_cals = 0.0
    total_prot = 0.0

    for mtype, pct, hour, minute in meal_splits:
        if mtype == "snack" and rng.random() < 0.25:
            continue

        m_target_cals = day_target_cals * pct
        m_local_min = max(0, minute + rng.randint(-15, 15))
        m_local_hour = min(23, max(0, hour + (m_local_min // 60)))
        m_local_min = m_local_min % 60
        m_local = datetime.combine(meal_date, datetime.min.time().replace(hour=m_local_hour, minute=m_local_min), tzinfo=user_tz)
        m_utc = m_local.astimezone(timezone.utc)

        meal_log = MealLog(user_id=user_id, meal_type=mtype, logged_at=m_utc)
        db.add(meal_log)
        db.flush()

        type_foods = [fd for fd, mtypes in avail_foods if mtype in mtypes or "lunch" in mtypes]
        if not type_foods:
            type_foods = [fd for fd, _ in avail_foods]

        selected = rng.sample(type_foods, min(len(type_foods), rng.randint(2, 3)))
        sub_target = m_target_cals / len(selected)

        for fd in selected:
            cals_100 = float(fd.calories_per_100g)
            prot_100 = float(fd.protein_per_100g)
            if cals_100 <= 0:
                continue

            grams = max(30.0, round((sub_target / cals_100) * 100.0, 0))
            if target_protein < 90 and prot_100 > 15:
                grams = max(25.0, round(grams * 0.45, 0))
            elif target_protein > 130 and prot_100 > 15:
                grams = round(grams * 1.20, 0)

            cals, prot, carbs, fat = add_meal_item(db, meal_log.id, fd, grams)
            total_cals += cals
            total_prot += prot

    return total_cals, total_prot


def validate_production_seeding_safety():
    """Validates safety flags before performing demo seeding against production databases."""
    is_prod_env = getattr(settings, "ENVIRONMENT", "development").lower() == "production"
    db_url = getattr(settings, "DATABASE_URL", "").lower()
    is_remote_db = bool(db_url) and not ("localhost" in db_url or "127.0.0.1" in db_url or "sqlite" in db_url)

    if is_prod_env or is_remote_db:
        allow_flag = (
            os.getenv("SEED_TEST_SUBJECTS_PRODUCTION", "").lower() in ("true", "1", "yes")
            or os.getenv("DEMO_SEED_PRODUCTION", "").lower() in ("true", "1", "yes")
            or os.getenv("DEMO_SEED_ALLOW", "").lower() in ("true", "1", "yes")
            or "--force-production" in sys.argv
        )
        if not allow_flag:
            raise RuntimeError(
                "SAFETY BLOCK: Attempted to run test-subject seeding against a PRODUCTION or REMOTE database without explicit confirmation.\n"
                f"  ENVIRONMENT: {settings.ENVIRONMENT}\n"
                "  To authorize production test-subject seeding, set environment variable:\n"
                "    SEED_TEST_SUBJECTS_PRODUCTION=true\n"
                "  or run with CLI flag:\n"
                "    python -m app.seed_demo_data --force-production\n"
            )


def seed_test_subjects(db: Session) -> List[str]:
    """
    Inserts or updates demo test subject user accounts and longitudinal health data.
    Does NOT perform schema creation or database DDL migrations.
    Schema migrations are managed strictly via Alembic CLI (alembic upgrade head).
    """
    validate_production_seeding_safety()
    demo_emails = [cfg["email"] for cfg in TEST_SUBJECTS_CONFIG]

    # Idempotent cleanup: remove existing demo users cleanly
    existing_demo_users = db.query(User).filter(User.email.in_(demo_emails)).all()
    if existing_demo_users:
        demo_user_ids = [u.id for u in existing_demo_users]

        # Delete child rows first to satisfy PostgreSQL Foreign Key constraints
        meal_logs = db.query(MealLog).filter(MealLog.user_id.in_(demo_user_ids)).all()
        if meal_logs:
            ml_ids = [m.id for m in meal_logs]
            db.query(MealLogItem).filter(MealLogItem.meal_log_id.in_(ml_ids)).delete(synchronize_session=False)

        workout_logs = db.query(WorkoutLog).filter(WorkoutLog.user_id.in_(demo_user_ids)).all()
        if workout_logs:
            wl_ids = [w.id for w in workout_logs]
            db.query(WorkoutLogExercise).filter(WorkoutLogExercise.log_id.in_(wl_ids)).delete(synchronize_session=False)

        workout_plans = db.query(WorkoutPlan).filter(WorkoutPlan.user_id.in_(demo_user_ids)).all()
        if workout_plans:
            wp_ids = [p.id for p in workout_plans]
            db.query(WorkoutPlanExercise).filter(WorkoutPlanExercise.plan_id.in_(wp_ids)).delete(synchronize_session=False)

        db.query(RefreshToken).filter(RefreshToken.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.query(FitnessScore).filter(FitnessScore.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.query(Measurement).filter(Measurement.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.query(MealLog).filter(MealLog.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.query(WorkoutLog).filter(WorkoutLog.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.query(WorkoutPlan).filter(WorkoutPlan.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.query(Goal).filter(Goal.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.query(Profile).filter(Profile.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.query(AIMemory).filter(AIMemory.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.query(ChatMessage).filter(ChatMessage.user_id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(demo_user_ids)).delete(synchronize_session=False)
        db.commit()

    # Base catalogs
    ex_catalog = seed_exercises(db)
    food_catalog = seed_foods(db)
    hashed_pwd = hash_password(DEMO_PASSWORD_PLAIN)
    ref_today = date.today()
    created_user_emails = []

    # Print summary header
    print("\n" + "=" * 115)
    print("FITMIND AI — IMPORTING SYNTHETIC TEST SUBJECT REALISTIC DATASET")
    print("=" * 115)

    summary_records = []

    for cfg_idx, cfg in enumerate(DEMO_ACCOUNTS_CONFIG):
        rng = random.Random(42 + cfg_idx)

        email = cfg["email"]
        user = User(
            email=email,
            password_hash=hashed_pwd,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.flush()

        profile = Profile(
            user_id=user.id,
            full_name=cfg["full_name"],
            gender=cfg["gender"],
            height_cm=cfg["height_cm"],
            weight_kg=cfg["weight_kg"],
            activity_level=cfg["activity_level"],
            diet_preference=cfg["diet_preference"],
            equipment=cfg["equipment"],
            timezone=cfg["timezone"],
            target_workout_days_per_week=cfg["target_days"],
            preferred_workout_duration_minutes=45 if email != "demo.noplan@fitmind.ai" else 60,
            medical_notes=None,
            onboarding_complete=True,
        )
        db.add(profile)

        goal = Goal(
            user_id=user.id,
            goal_type=cfg["goal_type"],
            target_weight_kg=cfg["target_weight_kg"],
            target_date=ref_today + timedelta(days=90),
            is_active=True,
        )
        db.add(goal)
        db.flush()

        # Workout Plan (Except for demo.noplan@fitmind.ai)
        active_plan = None
        if email != "demo.noplan@fitmind.ai":
            plan_name = f"{cfg['full_name']}'s {cfg['target_days']}-Day Training Plan"
            active_plan = WorkoutPlan(
                user_id=user.id,
                name=plan_name,
                days_per_week=cfg["target_days"],
                is_active=True,
                ai_generated=False,
            )
            db.add(active_plan)
            db.flush()

            bench = ex_catalog["Barbell Bench Press"]
            squat = ex_catalog["Barbell Squat"]
            rdl = ex_catalog["Romanian Deadlift"]
            pullup = ex_catalog["Pull-Up"]

            plan_exs = [
                WorkoutPlanExercise(plan_id=active_plan.id, exercise_id=bench.id, day_of_week=1, sets=4, reps="8-10", order_index=1),
                WorkoutPlanExercise(plan_id=active_plan.id, exercise_id=squat.id, day_of_week=2, sets=4, reps="6-8", order_index=2),
                WorkoutPlanExercise(plan_id=active_plan.id, exercise_id=rdl.id, day_of_week=4, sets=3, reps="10-12", order_index=3),
                WorkoutPlanExercise(plan_id=active_plan.id, exercise_id=pullup.id, day_of_week=5, sets=3, reps="8-12", order_index=4),
            ]
            db.add_all(plan_exs)

        # -------------------------------------------------------------------------
        # LONGITUDINAL TRAJECTORY SIMULATION
        # -------------------------------------------------------------------------
        user_tz = ZoneInfo(cfg["timezone"])
        history_days = cfg["history_days"]
        logging_adh = cfg["logging_adherence"]
        workout_adh = cfg["workout_adherence"]

        start_date = ref_today - timedelta(days=history_days)
        start_weight = cfg["start_weight_kg"]
        end_weight = cfg["weight_kg"]

        logged_days_count = 0
        total_seeded_cals = 0.0
        total_seeded_prot = 0.0
        total_workout_logs = 0

        recent_workout_days = set(cfg.get("recent_workout_days", []))
        recent_nutrition_days = set(cfg.get("recent_nutrition_days", []))

        for d in range(history_days + 1):
            curr_date = start_date + timedelta(days=d)
            days_from_today = (ref_today - curr_date).days
            is_weekend = curr_date.weekday() in (5, 6)
            progress_ratio = d / float(history_days) if history_days > 0 else 1.0

            # 1. Weight progression & measurements (Every 5-7 days)
            curr_weight = start_weight + (end_weight - start_weight) * progress_ratio
            curr_weight += rng.uniform(-0.25, 0.25)

            # Plateau block for demo.progress
            if email == "demo.progress@fitmind.ai" and 20 <= d <= 38:
                curr_weight = 72.8 + rng.uniform(-0.3, 0.3)

            if d % 6 == 0 or d == history_days:
                db.add(Measurement(
                    user_id=user.id,
                    measured_at=curr_date,
                    weight_kg=round(curr_weight, 1),
                    waist_cm=round(84.0 - (progress_ratio * 2.0), 1) if cfg["gender"] == "male" else round(74.0 - (progress_ratio * 1.5), 1),
                    body_fat_pct=round(21.0 - (progress_ratio * 1.5), 1) if cfg["gender"] == "male" else round(25.0 - (progress_ratio * 1.8), 1),
                ))

            # 2. Nutrition Logging
            if days_from_today <= 6:
                should_log_nutrition = days_from_today in recent_nutrition_days
            else:
                should_log_nutrition = rng.random() < logging_adh
                if email == "demo.inconsistent@fitmind.ai":
                    should_log_nutrition = (d % 5 in (0, 1, 2)) and (rng.random() < 0.75)

            if should_log_nutrition:
                day_cals, day_prot = generate_daily_meals_for_user(
                    db=db,
                    user_id=user.id,
                    meal_date=curr_date,
                    target_cals=cfg["target_cals"],
                    target_protein=cfg["target_protein"],
                    diet_pref=cfg["diet_preference"],
                    user_tz=user_tz,
                    food_catalog=food_catalog,
                    rng=rng,
                    is_weekend=is_weekend,
                )
                logged_days_count += 1
                total_seeded_cals += day_cals
                total_seeded_prot += day_prot

            # 3. Workout Logging
            if days_from_today <= 6:
                should_log_workout = days_from_today in recent_workout_days
            else:
                is_workout_day = (curr_date.weekday() in (0, 1, 3, 4)) if cfg["target_days"] == 4 else (curr_date.weekday() in (0, 1, 2, 4, 5))
                if cfg["target_days"] == 3:
                    is_workout_day = curr_date.weekday() in (0, 2, 4)
                should_log_workout = is_workout_day and (rng.random() < workout_adh)
                if email == "demo.inconsistent@fitmind.ai":
                    should_log_workout = d in (3, 8, 14, 21, 27)

            if should_log_workout:
                duration_mins = 45 + rng.randint(-5, 15)
                start_h = 7 if email not in ("demo.timezone@fitmind.ai", "demo.inconsistent@fitmind.ai") else (23 if email == "demo.timezone@fitmind.ai" else 14)
                w_local = datetime.combine(curr_date, datetime.min.time().replace(hour=start_h, minute=rng.randint(0, 30)), tzinfo=user_tz)
                w_utc = w_local.astimezone(timezone.utc)
                end_utc = w_utc + timedelta(minutes=duration_mins)

                log = WorkoutLog(
                    user_id=user.id,
                    plan_id=active_plan.id if active_plan else None,
                    started_at=w_utc,
                    ended_at=end_utc,
                    notes=f"Completed training session ({duration_mins} min)",
                )
                db.add(log)
                db.flush()
                total_workout_logs += 1

                bench_w = 65.0 + (progress_ratio * 8.0) if email != "demo.bulking@fitmind.ai" else 85.0 + (progress_ratio * 12.0)
                squat_w = 85.0 + (progress_ratio * 10.0) if email != "demo.bulking@fitmind.ai" else 105.0 + (progress_ratio * 15.0)
                if email == "demo.beginner@fitmind.ai":
                    bench_w = 40.0
                    squat_w = 50.0
                elif email == "demo.noplan@fitmind.ai":
                    bench_w = 25.0
                    squat_w = 30.0

                db.add_all([
                    WorkoutLogExercise(log_id=log.id, exercise_id=ex_catalog["Barbell Bench Press" if email != "demo.noplan@fitmind.ai" else "Bodyweight Squat"].id, set_number=1, reps_completed=8, weight_kg=round(bench_w, 1), rpe=8),
                    WorkoutLogExercise(log_id=log.id, exercise_id=ex_catalog["Barbell Squat" if email != "demo.noplan@fitmind.ai" else "Knee Push-Up"].id, set_number=1, reps_completed=8, weight_kg=round(squat_w, 1), rpe=8),
                ])

        db.flush()

        # Seed AI memories and chat history
        if email == "demo.ai@fitmind.ai":
            memories = [
                AIMemory(user_id=user.id, memory_type="conversational", key="training_preference", value="Prefers hypertrophy rep ranges (8-12 reps) with 90-second rest periods.", source="conversation", is_active=True),
                AIMemory(user_id=user.id, memory_type="conversational", key="schedule_preference", value="Trains in the morning at home using dumbbells and bands.", source="conversation", is_active=True),
                AIMemory(user_id=user.id, memory_type="conversational", key="dietary_preference", value="Follows a vegetarian diet with occasional eggs and fish.", source="conversation", is_active=True),
                AIMemory(user_id=user.id, memory_type="conversational", key="recovery_notes", value="Mild lower-back sensitivity post-pregnancy; focuses on safe core strengthening.", source="conversation", is_active=True),
            ]
            db.add_all(memories)

            chats = [
                ChatMessage(user_id=user.id, role="user", content="What is the best way to structure my protein intake for muscle recovery?"),
                ChatMessage(user_id=user.id, role="assistant", content="Aim for 1.6-2.0g of protein per kg of body weight (around 95-120g daily). Combine complementary sources like eggs, Greek yogurt, lentils, and tofu across 3-4 meals."),
                ChatMessage(user_id=user.id, role="user", content="How should I adjust my squat form to protect my lower back?"),
                ChatMessage(user_id=user.id, role="assistant", content="Focus on maintaining a neutral spine, bracing your core before each rep, and taking a slightly wider stance with bodyweight or goblet squats."),
                ChatMessage(user_id=user.id, role="user", content="Should I do cardio on my lifting days or rest days?"),
                ChatMessage(user_id=user.id, role="assistant", content="Either works well! If doing cardio on lifting days, complete it after weight training so it doesn't fatigue your primary lifts."),
            ]
            db.add_all(chats)


        elif email == "demo.full@fitmind.ai":
            memories = [
                AIMemory(user_id=user.id, memory_type="conversational", key="exercise_preference", value="Prefers Barbell Bench Press and Dumbbell Press over machine exercises.", source="conversation", is_active=True),
                AIMemory(user_id=user.id, memory_type="conversational", key="workout_schedule_preference", value="Prefers morning training sessions between 7 AM and 9 AM.", source="conversation", is_active=True),
            ]
            db.add_all(memories)
            db.add(ChatMessage(user_id=user.id, role="user", content="How should I adjust my protein intake for my muscle gain goal?"))
            db.add(ChatMessage(user_id=user.id, role="assistant", content="Based on your profile (81.0 kg, muscle gain goal), aim for approximately 1.6-2.2g of protein per kg of body weight (around 135-170g daily)."))

        # Historical Fitness Scores
        base_score = 65 if email != "demo.athlete@fitmind.ai" else 88
        if email == "demo.inconsistent@fitmind.ai":
            base_score = 48
        elif email == "demo.beginner@fitmind.ai":
            base_score = 42

        num_weeks = max(1, history_days // 7)
        for w in range(num_weeks):
            p_start = ref_today - timedelta(days=(num_weeks - w) * 7)
            p_end = p_start + timedelta(days=6)

            score_trend = base_score + (w * 2) if email not in ("demo.inconsistent@fitmind.ai", "demo.beginner@fitmind.ai") else base_score + (rng.randint(-3, 3))
            score_val = min(96, max(38, score_trend))

            db.add(FitnessScore(
                user_id=user.id,
                score=score_val,
                workout_adherence_pct=round(workout_adh * 100.0, 1),
                nutrition_score=round(logging_adh * 100.0, 1),
                protein_score=78.0,
                sleep_score=80.0,
                recovery_score=78.0,
                consistency_score=round((workout_adh + logging_adh) / 2.0 * 100.0, 1),
                period_start=p_start,
                period_end=p_end,
            ))

        # Calculate current live FitnessScore
        FitnessScoreService.calculate_and_save_fitness_score(db, user, ref_today)

        # Compute summary metrics for report
        avg_cals = round(total_seeded_cals / logged_days_count, 1) if logged_days_count > 0 else 0.0
        avg_prot = round(total_seeded_prot / logged_days_count, 1) if logged_days_count > 0 else 0.0
        wks_float = history_days / 7.0 if history_days > 0 else 1.0
        avg_wks = round(total_workout_logs / wks_float, 1)
        log_pct = round((logged_days_count / float(history_days + 1)) * 100.0, 1)

        summary_records.append({
            "name": cfg["full_name"],
            "goal": cfg["goal_type"],
            "tdee": cfg["tdee"],
            "target": cfg["target_cals"],
            "avg_cals": avg_cals,
            "avg_prot": avg_prot,
            "wks_per_wk": avg_wks,
            "log_pct": log_pct,
            "weight_trend": f"{start_weight:.1f}kg -> {cfg['weight_kg']:.1f}kg",
            "score": base_score,
        })

        created_user_emails.append(email)

    db.commit()

    # Print summary report table
    print("\n" + "-" * 115)
    print(f"{'User Name':<18} | {'Goal':<14} | {'TDEE':<6} | {'Target':<6} | {'Avg Cals':<8} | {'Avg Prot':<8} | {'Wks/Wk':<6} | {'Log %':<6} | {'Weight Trend':<16}")
    print("-" * 115)
    for s in summary_records:
        print(f"{s['name']:<18} | {s['goal']:<14} | {s['tdee']:<6.0f} | {s['target']:<6.0f} | {s['avg_cals']:<8.0f} | {s['avg_prot']:<6.0f}g | {s['wks_per_wk']:<6.1f} | {s['log_pct']:<5.1f}% | {s['weight_trend']:<16}")
    print("-" * 115 + "\n")

    return created_user_emails


seed_demo_data = seed_test_subjects


def main():
    print("Initializing FitMind AI Synthetic Test Subject Dataset Importer...")
    db = SessionLocal()
    try:
        emails = seed_test_subjects(db)
        print(f"Successfully imported {len(emails)} realistic test subject accounts into database:")
        for email in emails:
            print(f"  - {email} (Password: {TEST_SUBJECT_PASSWORD})")
    except Exception as e:
        db.rollback()
        print(f"Error importing test subjects: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
