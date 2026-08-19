import os
import sys
import random
from pathlib import Path

# Add backend directory to sys.path if not present so script runs directly or via -m
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
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
        "height_cm": 180.0,
        "weight_kg": 78.5,
        "activity_level": "moderate",
        "diet_preference": "omnivore",
        "equipment": ["dumbbells", "barbell", "cables"],
        "timezone": "America/New_York",
        "goal_type": "muscle_gain",
        "target_weight_kg": 82.0,
        "target_days": 4,
        "history_days": 60,
        "logging_adherence": 0.90,
        "workout_adherence": 0.88,
        "scenario": "Fully populated realistic user with high overall adherence",
    },
    {
        "email": "demo.athlete@fitmind.ai",
        "full_name": "Elena Rostova",
        "gender": "female",
        "height_cm": 168.0,
        "weight_kg": 61.0,
        "activity_level": "very_active",
        "diet_preference": "omnivore",
        "equipment": ["full_gym"],
        "timezone": "America/Los_Angeles",
        "goal_type": "fat_loss",
        "target_weight_kg": 59.0,
        "target_days": 5,
        "history_days": 60,
        "logging_adherence": 0.96,
        "workout_adherence": 0.95,
        "scenario": "Highly consistent active athlete with strong fitness score",
    },
    {
        "email": "demo.beginner@fitmind.ai",
        "full_name": "Jordan Chen",
        "gender": "other",
        "height_cm": 172.0,
        "weight_kg": 70.0,
        "activity_level": "sedentary",
        "diet_preference": "vegetarian",
        "equipment": ["bodyweight"],
        "timezone": "UTC",
        "goal_type": "general_fitness",
        "target_weight_kg": 68.0,
        "target_days": 3,
        "history_days": 18,
        "logging_adherence": 0.58,
        "workout_adherence": 0.60,
        "scenario": "New beginner to test sparse data & insufficient data UI states",
    },
    {
        "email": "demo.bulking@fitmind.ai",
        "full_name": "Liam Gallagher",
        "gender": "male",
        "height_cm": 185.0,
        "weight_kg": 84.0,
        "activity_level": "moderate",
        "diet_preference": "omnivore",
        "equipment": ["barbell", "dumbbells"],
        "timezone": "Europe/London",
        "goal_type": "muscle_gain",
        "target_weight_kg": 90.0,
        "target_days": 4,
        "history_days": 60,
        "logging_adherence": 0.88,
        "workout_adherence": 0.85,
        "scenario": "User focused on muscle gain and caloric surplus",
    },
    {
        "email": "demo.cutting@fitmind.ai",
        "full_name": "Sophia Martinez",
        "gender": "female",
        "height_cm": 165.0,
        "weight_kg": 68.5,
        "activity_level": "moderate",
        "diet_preference": "keto",
        "equipment": ["dumbbells", "cardio_machines"],
        "timezone": "America/Chicago",
        "goal_type": "fat_loss",
        "target_weight_kg": 62.0,
        "target_days": 4,
        "history_days": 60,
        "logging_adherence": 0.92,
        "workout_adherence": 0.90,
        "scenario": "User focused on weight loss and caloric deficit",
    },
    {
        "email": "demo.inconsistent@fitmind.ai",
        "full_name": "David Miller",
        "gender": "male",
        "height_cm": 176.0,
        "weight_kg": 81.0,
        "activity_level": "light",
        "diet_preference": "omnivore",
        "equipment": ["dumbbells"],
        "timezone": "America/New_York",
        "goal_type": "general_fitness",
        "target_weight_kg": 78.0,
        "target_days": 3,
        "history_days": 60,
        "logging_adherence": 0.52,
        "workout_adherence": 0.40,
        "scenario": "Irregular real-world user with partial adherence",
    },
    {
        "email": "demo.progress@fitmind.ai",
        "full_name": "Rachel Kim",
        "gender": "female",
        "height_cm": 170.0,
        "weight_kg": 64.0,
        "activity_level": "moderate",
        "diet_preference": "pescatarian",
        "equipment": ["full_gym"],
        "timezone": "America/Los_Angeles",
        "goal_type": "weight_loss",
        "target_weight_kg": 62.0,
        "target_days": 4,
        "history_days": 60,
        "logging_adherence": 0.90,
        "workout_adherence": 0.90,
        "scenario": "Strong 60-day historical weight and body composition progression",
    },
    {
        "email": "demo.noplan@fitmind.ai",
        "full_name": "Alex Taylor",
        "gender": "prefer_not_to_say",
        "height_cm": 174.0,
        "weight_kg": 72.0,
        "activity_level": "moderate",
        "diet_preference": "omnivore",
        "equipment": ["bodyweight", "dumbbells"],
        "timezone": "UTC",
        "goal_type": "general_fitness",
        "target_weight_kg": 70.0,
        "target_days": 5,
        "history_days": 60,
        "logging_adherence": 0.72,
        "workout_adherence": 0.65,
        "scenario": "User without an active WorkoutPlan to test profile preference fallback",
    },
    {
        "email": "demo.timezone@fitmind.ai",
        "full_name": "Aarav Sharma",
        "gender": "male",
        "height_cm": 178.0,
        "weight_kg": 76.0,
        "activity_level": "moderate",
        "diet_preference": "vegetarian",
        "equipment": ["dumbbells"],
        "timezone": "Asia/Kolkata",
        "goal_type": "muscle_gain",
        "target_weight_kg": 80.0,
        "target_days": 4,
        "history_days": 60,
        "logging_adherence": 0.88,
        "workout_adherence": 0.85,
        "scenario": "Asia/Kolkata timezone testing near local midnight boundaries",
    },
    {
        "email": "demo.ai@fitmind.ai",
        "full_name": "Maya Patel",
        "gender": "female",
        "height_cm": 166.0,
        "weight_kg": 58.0,
        "activity_level": "very_active",
        "diet_preference": "vegan",
        "equipment": ["full_gym"],
        "timezone": "America/New_York",
        "goal_type": "muscle_gain",
        "target_weight_kg": 61.0,
        "target_days": 4,
        "history_days": 60,
        "logging_adherence": 0.92,
        "workout_adherence": 0.90,
        "scenario": "AI Coach testing with persisted AI memory and chat history",
    },
]

DEMO_ACCOUNTS_CONFIG = TEST_SUBJECTS_CONFIG


def seed_exercises(db: Session) -> Dict[str, Exercise]:
    exercises_data = [
        {"name": "Barbell Bench Press", "primary_muscle": "Chest", "equipment_required": ["barbell"]},
        {"name": "Incline Dumbbell Press", "primary_muscle": "Chest", "equipment_required": ["dumbbells"]},
        {"name": "Dumbbell Flyes", "primary_muscle": "Chest", "equipment_required": ["dumbbells"]},
        {"name": "Barbell Squat", "primary_muscle": "Quadriceps", "equipment_required": ["barbell"]},
        {"name": "Leg Press", "primary_muscle": "Quadriceps", "equipment_required": ["full_gym"]},
        {"name": "Romanian Deadlift", "primary_muscle": "Hamstrings", "equipment_required": ["barbell"]},
        {"name": "Leg Curl", "primary_muscle": "Hamstrings", "equipment_required": ["full_gym"]},
        {"name": "Pull-Up", "primary_muscle": "Lats", "equipment_required": ["bodyweight"]},
        {"name": "Barbell Row", "primary_muscle": "Upper Back", "equipment_required": ["barbell"]},
        {"name": "Lat Pulldown", "primary_muscle": "Lats", "equipment_required": ["cables", "full_gym"]},
        {"name": "Overhead Press", "primary_muscle": "Shoulders", "equipment_required": ["barbell"]},
        {"name": "Dumbbell Lateral Raise", "primary_muscle": "Shoulders", "equipment_required": ["dumbbells"]},
        {"name": "Dumbbell Bicep Curl", "primary_muscle": "Biceps", "equipment_required": ["dumbbells"]},
        {"name": "Tricep Rope Pushdown", "primary_muscle": "Triceps", "equipment_required": ["cables"]},
        {"name": "Treadmill Running", "primary_muscle": "Cardio", "equipment_required": ["cardio_machines"]},
        {"name": "Stationary Cycling", "primary_muscle": "Cardio", "equipment_required": ["cardio_machines"]},
        {"name": "Elliptical Trainer", "primary_muscle": "Cardio", "equipment_required": ["cardio_machines"]},
    ]
    catalog = {}
    for item in exercises_data:
        ex = db.query(Exercise).filter(Exercise.name == item["name"]).first()
        if not ex:
            category = "cardio" if "Cardio" in item["primary_muscle"] else "strength"
            ex = Exercise(
                name=item["name"],
                primary_muscle=item["primary_muscle"],
                equipment_required=item["equipment_required"],
                difficulty="intermediate",
                category=category,
            )
            db.add(ex)
            db.flush()
        catalog[item["name"]] = ex
    return catalog


def seed_foods(db: Session) -> Dict[str, Food]:
    foods_data = [
        # Breakfast Items
        {"name": "Oatmeal with Whole Milk", "calories": 180, "protein": 7.0, "carbs": 28.0, "fat": 4.5, "meal_types": ["breakfast"]},
        {"name": "Peanut Butter (Spread)", "calories": 588, "protein": 25.0, "carbs": 20.0, "fat": 50.0, "meal_types": ["breakfast", "snack"]},
        {"name": "Fresh Banana", "calories": 89, "protein": 1.1, "carbs": 23.0, "fat": 0.3, "meal_types": ["breakfast", "snack"]},
        {"name": "Scrambled Eggs (2 Whole)", "calories": 150, "protein": 12.0, "carbs": 1.2, "fat": 11.0, "meal_types": ["breakfast"]},
        {"name": "Whole Wheat Toast (2 Slices)", "calories": 140, "protein": 6.0, "carbs": 26.0, "fat": 2.0, "meal_types": ["breakfast", "snack"]},
        {"name": "Greek Yogurt (Plain 0%)", "calories": 59, "protein": 10.0, "carbs": 3.6, "fat": 0.4, "meal_types": ["breakfast", "snack"]},
        {"name": "Granola with Nuts", "calories": 450, "protein": 10.0, "carbs": 64.0, "fat": 18.0, "meal_types": ["breakfast", "snack"]},
        {"name": "Vegetable Poha", "calories": 160, "protein": 3.5, "carbs": 31.0, "fat": 3.2, "meal_types": ["breakfast", "snack"]},
        {"name": "Semolina Upma", "calories": 180, "protein": 4.5, "carbs": 32.0, "fat": 4.0, "meal_types": ["breakfast", "snack"]},
        {"name": "Idli with Sambar (3 Pcs)", "calories": 210, "protein": 8.0, "carbs": 42.0, "fat": 1.5, "meal_types": ["breakfast"]},
        {"name": "Plain Dosa with Coconut Chutney", "calories": 280, "protein": 6.0, "carbs": 45.0, "fat": 8.5, "meal_types": ["breakfast"]},
        {"name": "Paneer Paratha with Curd", "calories": 360, "protein": 14.0, "carbs": 42.0, "fat": 15.0, "meal_types": ["breakfast"]},

        # Main Meals (Lunch & Dinner)
        {"name": "Grilled Chicken Breast", "calories": 165, "protein": 31.0, "carbs": 0.0, "fat": 3.6, "meal_types": ["lunch", "dinner"]},
        {"name": "Steamed Brown Rice", "calories": 112, "protein": 2.6, "carbs": 24.0, "fat": 0.9, "meal_types": ["lunch", "dinner"]},
        {"name": "Steamed Jasmine Rice", "calories": 130, "protein": 2.4, "carbs": 28.0, "fat": 0.3, "meal_types": ["lunch", "dinner"]},
        {"name": "Steamed Broccoli & Carrots", "calories": 35, "protein": 2.4, "carbs": 7.0, "fat": 0.4, "meal_types": ["lunch", "dinner"]},
        {"name": "Yellow Dal Tadka", "calories": 120, "protein": 7.5, "carbs": 18.0, "fat": 2.5, "meal_types": ["lunch", "dinner"]},
        {"name": "Whole Wheat Roti / Chapati", "calories": 104, "protein": 3.5, "carbs": 20.0, "fat": 1.2, "meal_types": ["lunch", "dinner"]},
        {"name": "Paneer Tikka Masala", "calories": 220, "protein": 11.0, "carbs": 9.0, "fat": 15.5, "meal_types": ["lunch", "dinner"]},
        {"name": "Rajma Curry (Kidney Beans)", "calories": 140, "protein": 8.5, "carbs": 22.0, "fat": 2.8, "meal_types": ["lunch", "dinner"]},
        {"name": "Chole Masala (Chickpeas)", "calories": 160, "protein": 9.0, "carbs": 24.0, "fat": 3.5, "meal_types": ["lunch", "dinner"]},
        {"name": "Dal Khichdi with Ghee", "calories": 175, "protein": 6.5, "carbs": 30.0, "fat": 3.8, "meal_types": ["lunch", "dinner"]},
        {"name": "Atlantic Salmon Fillet", "calories": 206, "protein": 22.0, "carbs": 0.0, "fat": 12.0, "meal_types": ["lunch", "dinner"]},
        {"name": "Baked Sweet Potato", "calories": 90, "protein": 2.0, "carbs": 21.0, "fat": 0.15, "meal_types": ["lunch", "dinner"]},
        {"name": "Mixed Green Salad with Olive Oil", "calories": 85, "protein": 1.5, "carbs": 5.0, "fat": 7.0, "meal_types": ["lunch", "dinner"]},
        {"name": "Cucumber Mint Raita", "calories": 60, "protein": 3.5, "carbs": 4.5, "fat": 2.8, "meal_types": ["lunch", "dinner"]},
        {"name": "Chicken Biryani with Raita", "calories": 195, "protein": 14.0, "carbs": 24.0, "fat": 5.5, "meal_types": ["lunch", "dinner"]},
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


def calculate_tdee_and_target(cfg: dict) -> Tuple[float, float]:
    """Calculates Mifflin-St Jeor BMR, TDEE, and daily target calories."""
    weight = cfg["weight_kg"]
    height = cfg["height_cm"]
    gender = cfg["gender"]
    age = 26  # realistic standard adult age

    if gender == "male":
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
    elif gender == "female":
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161
    else:
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 78

    act = cfg["activity_level"]
    multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "very_active": 1.725,
    }
    tdee = bmr * multipliers.get(act, 1.55)

    goal = cfg["goal_type"]
    if goal == "muscle_gain":
        target = tdee + 350.0
    elif goal in ("fat_loss", "weight_loss"):
        target = tdee - 450.0
    else:
        target = tdee

    return round(tdee, 1), round(target, 1)


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
    diet_pref: str,
    user_tz: ZoneInfo,
    food_catalog: dict,
    rng: random.Random,
    is_weekend: bool = False,
):
    """Generates realistic 3-4 meals for a day with accurate food portions and macros."""
    # Filter foods by diet preference
    avail_foods = []
    for fname, (fd, mtypes) in food_catalog.items():
        if diet_pref == "vegetarian" and any(k in fname.lower() for k in ["chicken", "salmon", "fish"]):
            continue
        if diet_pref == "vegan" and any(k in fname.lower() for k in ["chicken", "salmon", "fish", "eggs", "milk", "curd", "paneer", "whey"]):
            continue
        if diet_pref == "pescatarian" and any(k in fname.lower() for k in ["chicken"]):
            continue
        avail_foods.append((fd, mtypes))

    # Daily target calorie fluctuation (+-6%)
    day_target = target_cals * (1.0 + rng.uniform(-0.06, 0.06))
    if is_weekend and rng.random() < 0.6:
        day_target *= rng.uniform(1.08, 1.18)  # Weekend social meal boost

    # Meal distribution: Breakfast 22%, Lunch 35%, Snack 13%, Dinner 30%
    meal_splits = [
        ("breakfast", 0.22, 8, 15),
        ("lunch", 0.35, 13, 0),
        ("snack", 0.13, 17, 0),
        ("dinner", 0.30, 20, 30),
    ]

    total_cals = 0.0
    total_prot = 0.0

    for mtype, pct, hour, minute in meal_splits:
        # 10% chance to skip snack
        if mtype == "snack" and rng.random() < 0.20:
            continue

        m_target = day_target * pct
        m_local_min = max(0, minute + rng.randint(-15, 15))
        m_local_hour = hour + (m_local_min // 60)
        m_local_min = m_local_min % 60
        m_local = datetime.combine(meal_date, datetime.min.time().replace(hour=m_local_hour, minute=m_local_min), tzinfo=user_tz)
        m_utc = m_local.astimezone(timezone.utc)

        meal_log = MealLog(user_id=user_id, meal_type=mtype, logged_at=m_utc)
        db.add(meal_log)
        db.flush()

        # Pick 2-3 suitable foods for this meal type
        type_foods = [fd for fd, mtypes in avail_foods if mtype in mtypes or "lunch" in mtypes or "snack" in mtypes]
        if not type_foods:
            type_foods = [fd for fd, _ in avail_foods]

        selected = rng.sample(type_foods, min(len(type_foods), rng.randint(2, 3)))
        sub_target = m_target / len(selected)

        for fd in selected:
            cals_100 = float(fd.calories_per_100g)
            if cals_100 <= 0:
                continue
            grams = max(30.0, round((sub_target / cals_100) * 100.0, 0))
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


def run_db_migrations(db: Session = None):
    """Ensures all PostgreSQL and SQLite schema columns exist by executing idempotent DDL statements."""
    if db is not None:
        try:
            dialect = engine.dialect.name
            if dialect == "postgresql":
                db.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';"))
                db.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_workout_duration_minutes INTEGER DEFAULT 45;"))
                db.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_workout_days_per_week INTEGER DEFAULT 4;"))
            else:
                for col_name, col_type, col_def in [
                    ("timezone", "VARCHAR(50)", "'UTC'"),
                    ("preferred_workout_duration_minutes", "INTEGER", "45"),
                    ("target_workout_days_per_week", "INTEGER", "4"),
                ]:
                    try:
                        db.execute(text(f"ALTER TABLE profiles ADD COLUMN {col_name} {col_type} DEFAULT {col_def};"))
                    except Exception:
                        pass
            db.commit()
        except Exception as ddl_err:
            db.rollback()

    try:
        from alembic.config import Config
        from alembic import command
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ini_path = os.path.join(base_dir, "alembic.ini")
        if not os.path.exists(ini_path):
            ini_path = "alembic.ini"
        alembic_cfg = Config(ini_path)
        command.upgrade(alembic_cfg, "head")
    except Exception:
        pass



def seed_test_subjects(db: Session) -> List[str]:
    validate_production_seeding_safety()
    run_db_migrations(db)
    Base.metadata.create_all(bind=engine)

    # Use fixed random seed for 100% reproducible human-like trajectories
    rng = random.Random(42)
    demo_emails = [cfg["email"] for cfg in TEST_SUBJECTS_CONFIG]

    # Idempotent cleanup: remove existing test subject records cleanly
    existing_demo_users = db.query(User).filter(User.email.in_(demo_emails)).all()
    if existing_demo_users:
        demo_user_ids = [u.id for u in existing_demo_users]

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

    # Seed catalogs
    ex_catalog = seed_exercises(db)
    food_catalog = seed_foods(db)
    hashed_pwd = hash_password(DEMO_PASSWORD_PLAIN)
    ref_today = date.today()
    created_user_emails = []

    print("\n" + "=" * 100)
    print("FITMIND AI — REBUILDING TEST SUBJECT HUMAN DATA TRAJECTORIES")
    print("=" * 100)

    summary_records = []

    for cfg in DEMO_ACCOUNTS_CONFIG:
        email = cfg["email"]
        tdee, target_calories = calculate_tdee_and_target(cfg)
        user_tz = ZoneInfo(cfg["timezone"])

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

        # Workout Plan (All except demo.noplan@fitmind.ai)
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

            plan_ex_items = [
                (ex_catalog["Barbell Bench Press"], 1, 4, "8-10"),
                (ex_catalog["Incline Dumbbell Press"], 1, 3, "10-12"),
                (ex_catalog["Barbell Squat"], 2, 4, "6-8"),
                (ex_catalog["Leg Press"], 2, 3, "10-12"),
                (ex_catalog["Romanian Deadlift"], 4, 4, "8-10"),
                (ex_catalog["Pull-Up"], 5, 3, "8-12"),
                (ex_catalog["Lat Pulldown"], 5, 3, "10-12"),
            ]
            for idx, (ex, day_w, sets, reps) in enumerate(plan_ex_items, start=1):
                db.add(WorkoutPlanExercise(
                    plan_id=active_plan.id,
                    exercise_id=ex.id,
                    day_of_week=day_w,
                    sets=sets,
                    reps=reps,
                    order_index=idx
                ))

        # -------------------------------------------------------------------------
        # LONGITUDINAL SIMULATION (Up to 60 Days)
        # -------------------------------------------------------------------------
        history_days = cfg["history_days"]
        logging_adh = cfg["logging_adherence"]
        workout_adh = cfg["workout_adherence"]

        start_date = ref_today - timedelta(days=history_days)
        start_weight = cfg["weight_kg"]
        end_weight = cfg["weight_kg"]

        if cfg["goal_type"] == "muscle_gain":
            start_weight = cfg["weight_kg"] - 2.8
        elif cfg["goal_type"] in ("fat_loss", "weight_loss"):
            start_weight = cfg["weight_kg"] + 3.2

        logged_days_count = 0
        total_seeded_cals = 0.0
        total_seeded_prot = 0.0
        total_workout_logs = 0

        # Simulate day by day
        for d in range(history_days + 1):
            curr_date = start_date + timedelta(days=d)
            is_weekend = curr_date.weekday() in (5, 6)
            progress_ratio = d / float(history_days) if history_days > 0 else 1.0

            # 1. Weight Progression & Measurements (Logged every 5-7 days)
            curr_weight = start_weight + (end_weight - start_weight) * progress_ratio
            curr_weight += rng.uniform(-0.3, 0.3)  # Natural daily noise

            if d % 6 == 0 or d == history_days:
                db.add(Measurement(
                    user_id=user.id,
                    measured_at=curr_date,
                    weight_kg=round(curr_weight, 1),
                    waist_cm=round(84.0 - (progress_ratio * 2.0), 1),
                    body_fat_pct=round(21.0 - (progress_ratio * 1.5), 1),
                ))

            # 2. Nutrition Logging Simulation
            should_log_nutrition = rng.random() < logging_adh
            if email == "demo.inconsistent@fitmind.ai":
                # Inconsistent user: logs in 2-3 day bursts, skips 2 days
                should_log_nutrition = (d % 5 in (0, 1, 2)) and (rng.random() < 0.75)

            if should_log_nutrition:
                day_cals, day_prot = generate_daily_meals_for_user(
                    db=db,
                    user_id=user.id,
                    meal_date=curr_date,
                    target_cals=target_calories,
                    diet_pref=cfg["diet_preference"],
                    user_tz=user_tz,
                    food_catalog=food_catalog,
                    rng=rng,
                    is_weekend=is_weekend,
                )
                logged_days_count += 1
                total_seeded_cals += day_cals
                total_seeded_prot += day_prot

            # 3. Workout Logging Simulation
            # Days: 4 days/week -> Mon(0), Tue(1), Thu(3), Fri(4)
            is_workout_day = (curr_date.weekday() in (0, 1, 3, 4)) if cfg["target_days"] == 4 else (curr_date.weekday() in (0, 1, 2, 4, 5))
            if cfg["target_days"] == 3:
                is_workout_day = curr_date.weekday() in (0, 2, 4)

            should_log_workout = is_workout_day and (rng.random() < workout_adh)
            if email == "demo.inconsistent@fitmind.ai":
                should_log_workout = (d in (5, 12, 19, 28, 38, 48, 55))

            if should_log_workout:
                duration_mins = 45 + rng.randint(-7, 15)
                start_h = 7 if email != "demo.timezone@fitmind.ai" else 19
                if email == "demo.inconsistent@fitmind.ai":
                    start_h = 14

                w_local = datetime.combine(curr_date, datetime.min.time().replace(hour=start_h, minute=rng.randint(0, 30)), tzinfo=user_tz)
                w_utc = w_local.astimezone(timezone.utc)
                end_utc = w_utc + timedelta(minutes=duration_mins)

                log = WorkoutLog(
                    user_id=user.id,
                    plan_id=active_plan.id if active_plan else None,
                    started_at=w_utc,
                    ended_at=end_utc,
                    notes=f"Completed session ({duration_mins} min)",
                )
                db.add(log)
                db.flush()
                total_workout_logs += 1

                # Exercises performed with progressive overload
                bench_weight = 65.0 + (progress_ratio * 10.0) if email != "demo.bulking@fitmind.ai" else 85.0 + (progress_ratio * 15.0)
                squat_weight = 85.0 + (progress_ratio * 12.0) if email != "demo.bulking@fitmind.ai" else 105.0 + (progress_ratio * 20.0)

                db.add_all([
                    WorkoutLogExercise(log_id=log.id, exercise_id=ex_catalog["Barbell Bench Press"].id, set_number=1, reps_completed=8, weight_kg=round(bench_weight, 1), rpe=8),
                    WorkoutLogExercise(log_id=log.id, exercise_id=ex_catalog["Barbell Squat"].id, set_number=1, reps_completed=8, weight_kg=round(squat_weight, 1), rpe=8),
                ])

        db.flush()

        # 4. Seed AI Memories & Chat History for demo.ai and demo.full
        if email == "demo.ai@fitmind.ai":
            memories = [
                AIMemory(user_id=user.id, memory_type="conversational", key="dietary_preference", value="Follows a high-protein vegan diet utilizing soy protein, pea protein, and legumes.", source="conversation", is_active=True),
                AIMemory(user_id=user.id, memory_type="conversational", key="training_preference", value="Prefers hypertrophy rep ranges (8-12 reps) with 90-second rest periods.", source="conversation", is_active=True),
                AIMemory(user_id=user.id, memory_type="conversational", key="schedule_preference", value="Trains in the evening at 6:30 PM after work.", source="conversation", is_active=True),
                AIMemory(user_id=user.id, memory_type="conversational", key="recovery_notes", value="Noticed mild hamstring tightness after heavy Romanian Deadlifts on Thursdays.", source="conversation", is_active=True),
            ]
            db.add_all(memories)

            chats = [
                ChatMessage(user_id=user.id, role="user", content="What is the best way to structure my vegan protein intake for muscle growth?"),
                ChatMessage(user_id=user.id, role="assistant", content="Target 1.8-2.2g of protein per kg of body weight (around 105-125g daily). Combine complementary sources like soy, pea protein, lentils, and tofu across 4 meals."),
                ChatMessage(user_id=user.id, role="user", content="How often should I increase weights on Barbell Squats?"),
                ChatMessage(user_id=user.id, role="assistant", content="Aim for progressive overload every 1-2 weeks. When you complete all prescribed sets with clean form, add 2.5 kg to the bar."),
                ChatMessage(user_id=user.id, role="user", content="My hamstrings feel tight after Thursdays. Should I stretch or take a rest day?"),
                ChatMessage(user_id=user.id, role="assistant", content="Light active recovery and dynamic hamstring stretching work great! Ensure you rest on Friday or focus on upper body training."),
            ]
            db.add_all(chats)

        elif email == "demo.full@fitmind.ai":
            memories = [
                AIMemory(user_id=user.id, memory_type="conversational", key="exercise_preference", value="Prefers Barbell Bench Press and Dumbbell Shoulder Press over machine exercises.", source="conversation", is_active=True),
                AIMemory(user_id=user.id, memory_type="conversational", key="schedule_preference", value="Prefers morning training sessions between 7 AM and 9 AM.", source="conversation", is_active=True),
            ]
            db.add_all(memories)
            db.add(ChatMessage(user_id=user.id, role="user", content="How should I adjust my protein intake for my muscle gain goal?"))
            db.add(ChatMessage(user_id=user.id, role="assistant", content="Based on your profile (78.5 kg, muscle gain goal), aim for approximately 1.6-2.2g of protein per kg of body weight (around 130-170g daily)."))

        # 5. Seed Historical Fitness Scores (Weekly over 60 days)
        base_score = 60 if email != "demo.athlete@fitmind.ai" else 82
        if email == "demo.inconsistent@fitmind.ai":
            base_score = 48
        elif email == "demo.progress@fitmind.ai":
            base_score = 55

        num_weeks = max(1, history_days // 7)
        for w in range(num_weeks):
            p_start = ref_today - timedelta(days=(num_weeks - w) * 7)
            p_end = p_start + timedelta(days=6)

            score_trend = base_score + (w * 3) if email != "demo.inconsistent@fitmind.ai" else base_score + (rng.randint(-4, 4))
            score_val = min(95, max(40, score_trend))

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

        # Compute summary metrics for diagnostics
        avg_cals = round(total_seeded_cals / logged_days_count, 1) if logged_days_count > 0 else 0.0
        avg_prot = round(total_seeded_prot / logged_days_count, 1) if logged_days_count > 0 else 0.0
        wks_float = history_days / 7.0 if history_days > 0 else 1.0
        avg_wks = round(total_workout_logs / wks_float, 1)
        log_pct = round((logged_days_count / float(history_days + 1)) * 100.0, 1)

        summary_records.append({
            "name": cfg["full_name"],
            "goal": cfg["goal_type"],
            "tdee": tdee,
            "target": target_calories,
            "avg_cals": avg_cals,
            "avg_prot": avg_prot,
            "wks_per_wk": avg_wks,
            "log_pct": log_pct,
            "weight_trend": f"{start_weight:.1f}kg -> {cfg['weight_kg']:.1f}kg",
            "score": base_score,
        })

        created_user_emails.append(email)

    db.commit()

    # Print clean summary table
    print("\n" + "-" * 115)
    print(f"{'User Name':<18} | {'Goal':<14} | {'TDEE':<6} | {'Target':<6} | {'Avg Cals':<8} | {'Avg Prot':<8} | {'Wks/Wk':<6} | {'Log %':<6} | {'Weight Trend':<16}")
    print("-" * 115)
    for s in summary_records:
        print(f"{s['name']:<18} | {s['goal']:<14} | {s['tdee']:<6.0f} | {s['target']:<6.0f} | {s['avg_cals']:<8.0f} | {s['avg_prot']:<6.0f}g | {s['wks_per_wk']:<6.1f} | {s['log_pct']:<5.1f}% | {s['weight_trend']:<16}")
    print("-" * 115 + "\n")

    return created_user_emails


seed_demo_data = seed_test_subjects


def main():
    print("Initializing FitMind AI Test Subject Seeding System...")
    db = SessionLocal()
    try:
        emails = seed_test_subjects(db)
        print(f"Successfully seeded {len(emails)} test subject user accounts:")
        for email in emails:
            print(f"  - {email} (Password: {TEST_SUBJECT_PASSWORD})")
    except Exception as e:
        db.rollback()
        print(f"Error seeding test subjects: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
