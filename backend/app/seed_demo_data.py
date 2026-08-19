import os
import sys
from pathlib import Path

# Add backend directory to sys.path if not present so script runs directly or via -m
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from datetime import date, datetime, timedelta, timezone

from typing import Dict, List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

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
        "scenario": "AI Coach testing with persisted AI memory and chat history",
    },
]

DEMO_ACCOUNTS_CONFIG = TEST_SUBJECTS_CONFIG


def seed_exercises(db: Session) -> Dict[str, Exercise]:

    exercises_data = [
        {"name": "Barbell Bench Press", "primary_muscle": "Chest", "equipment_required": ["barbell"]},
        {"name": "Barbell Squat", "primary_muscle": "Quadriceps", "equipment_required": ["barbell"]},
        {"name": "Romanian Deadlift", "primary_muscle": "Hamstrings", "equipment_required": ["barbell"]},
        {"name": "Pull-Up", "primary_muscle": "Lats", "equipment_required": ["bodyweight"]},
        {"name": "Incline Dumbbell Press", "primary_muscle": "Chest", "equipment_required": ["dumbbells"]},
        {"name": "Overhead Press", "primary_muscle": "Shoulders", "equipment_required": ["barbell"]},
        {"name": "Barbell Row", "primary_muscle": "Upper Back", "equipment_required": ["barbell"]},
        {"name": "Dumbbell Bicep Curl", "primary_muscle": "Biceps", "equipment_required": ["dumbbells"]},
        {"name": "Tricep Rope Pushdown", "primary_muscle": "Triceps", "equipment_required": ["cables"]},
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
                category="strength",
            )
            db.add(ex)
            db.flush()
        catalog[item["name"]] = ex
    return catalog


def seed_foods(db: Session) -> Dict[str, Food]:
    foods_data = [
        {"name": "Chicken Breast (Cooked)", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6},
        {"name": "Brown Rice (Cooked)", "calories": 112, "protein": 2.6, "carbs": 24, "fat": 0.9},
        {"name": "Oatmeal (Raw)", "calories": 389, "protein": 16.9, "carbs": 66, "fat": 6.9},
        {"name": "Whey Protein Powder", "calories": 400, "protein": 80, "carbs": 6, "fat": 5},
        {"name": "Whole Eggs (Scrambled)", "calories": 149, "protein": 10, "carbs": 1.1, "fat": 11},
        {"name": "Greek Yogurt (0% Fat)", "calories": 59, "protein": 10, "carbs": 3.6, "fat": 0.4},
        {"name": "Atlantic Salmon (Cooked)", "calories": 206, "protein": 22, "carbs": 0, "fat": 12},
        {"name": "Sweet Potato (Baked)", "calories": 90, "protein": 2, "carbs": 21, "fat": 0.15},
        {"name": "Steamed Broccoli", "calories": 35, "protein": 2.4, "carbs": 7, "fat": 0.4},
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
        catalog[item["name"]] = fd
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


def validate_production_seeding_safety():

    """
    Validates safety flags before performing demo seeding against production databases.
    If ENVIRONMENT=production or DATABASE_URL targets a non-local database,
    requires DEMO_SEED_PRODUCTION=true or DEMO_SEED_ALLOW=true or --force-production.
    """
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
    validate_production_seeding_safety()
    Base.metadata.create_all(bind=engine)
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

    for cfg in DEMO_ACCOUNTS_CONFIG:
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

        # Seed Workout Logs according to scenario
        user_tz = ZoneInfo(cfg["timezone"])
        if email == "demo.athlete@fitmind.ai":
            # 5 workouts per week for 4 weeks (20 total sessions)
            weeks = 4
            for w in range(weeks):
                for d_idx in [0, 1, 2, 4, 5]:
                    log_date = ref_today - timedelta(days=(w * 7) + d_idx)
                    start_local = datetime.combine(log_date, datetime.min.time().replace(hour=7, minute=0), tzinfo=user_tz)
                    start_utc = start_local.astimezone(timezone.utc)
                    end_utc = start_utc + timedelta(minutes=60)
                    log = WorkoutLog(
                        user_id=user.id,
                        plan_id=active_plan.id,
                        started_at=start_utc,
                        ended_at=end_utc,
                        notes=f"Athlete session week {w+1} day {d_idx+1}",
                    )
                    db.add(log)
                    db.flush()
                    db.add_all([
                        WorkoutLogExercise(log_id=log.id, exercise_id=ex_catalog["Barbell Squat"].id, set_number=1, reps_completed=8, weight_kg=85.0, rpe=8),
                        WorkoutLogExercise(log_id=log.id, exercise_id=ex_catalog["Barbell Bench Press"].id, set_number=1, reps_completed=10, weight_kg=60.0, rpe=8),
                    ])

        elif email in ("demo.full@fitmind.ai", "demo.bulking@fitmind.ai", "demo.cutting@fitmind.ai", "demo.progress@fitmind.ai", "demo.timezone@fitmind.ai", "demo.ai@fitmind.ai"):
            weeks = 3
            days_per_week = cfg["target_days"]
            for w in range(weeks):
                for d_offset in range(days_per_week):
                    log_date = ref_today - timedelta(days=(w * 7) + (d_offset * 2))
                    if email == "demo.timezone@fitmind.ai":
                        start_local = datetime.combine(log_date, datetime.min.time().replace(hour=23, minute=30), tzinfo=user_tz)
                    else:
                        start_local = datetime.combine(log_date, datetime.min.time().replace(hour=10, minute=0), tzinfo=user_tz)

                    start_utc = start_local.astimezone(timezone.utc)
                    end_utc = start_utc + timedelta(minutes=50)

                    log = WorkoutLog(
                        user_id=user.id,
                        plan_id=active_plan.id if active_plan else None,
                        started_at=start_utc,
                        ended_at=end_utc,
                        notes=f"Demo workout session week {w+1} day {d_offset+1}",
                    )
                    db.add(log)
                    db.flush()
                    db.add_all([
                        WorkoutLogExercise(log_id=log.id, exercise_id=ex_catalog["Barbell Bench Press"].id, set_number=1, reps_completed=10, weight_kg=70.0 if email != "demo.bulking@fitmind.ai" else 95.0, rpe=8),
                        WorkoutLogExercise(log_id=log.id, exercise_id=ex_catalog["Barbell Squat"].id, set_number=1, reps_completed=8, weight_kg=95.0 if email != "demo.bulking@fitmind.ai" else 125.0, rpe=8),
                    ])

        elif email == "demo.inconsistent@fitmind.ai":
            for days_back in [2, 12, 19]:
                log_date = ref_today - timedelta(days=days_back)
                start_utc = datetime.combine(log_date, datetime.min.time().replace(hour=14, minute=0), tzinfo=timezone.utc)
                end_utc = start_utc + timedelta(minutes=40)
                log = WorkoutLog(
                    user_id=user.id,
                    plan_id=active_plan.id if active_plan else None,
                    started_at=start_utc,
                    ended_at=end_utc,
                    notes="Inconsistent session",
                )
                db.add(log)
                db.flush()
                db.add(WorkoutLogExercise(log_id=log.id, exercise_id=ex_catalog["Barbell Bench Press"].id, set_number=1, reps_completed=8, weight_kg=60.0, rpe=7))

        elif email == "demo.beginner@fitmind.ai":
            log_date = ref_today - timedelta(days=2)
            start_utc = datetime.combine(log_date, datetime.min.time().replace(hour=11, minute=0), tzinfo=timezone.utc)
            end_utc = start_utc + timedelta(minutes=30)
            log = WorkoutLog(
                user_id=user.id,
                plan_id=active_plan.id if active_plan else None,
                started_at=start_utc,
                ended_at=end_utc,
                notes="First beginner session",
            )
            db.add(log)
            db.flush()
            db.add(WorkoutLogExercise(log_id=log.id, exercise_id=ex_catalog["Pull-Up"].id, set_number=1, reps_completed=5, weight_kg=0.0, rpe=9))

        # Seed Nutrition Logs according to scenario
        chick = food_catalog["Chicken Breast (Cooked)"]
        rice = food_catalog["Brown Rice (Cooked)"]
        oats = food_catalog["Oatmeal (Raw)"]
        whey = food_catalog["Whey Protein Powder"]
        eggs = food_catalog["Whole Eggs (Scrambled)"]
        yogurt = food_catalog["Greek Yogurt (0% Fat)"]
        salmon = food_catalog["Atlantic Salmon (Cooked)"]
        sweet_pot = food_catalog["Sweet Potato (Baked)"]
        broc = food_catalog["Steamed Broccoli"]

        if email == "demo.athlete@fitmind.ai":
            # 7 days of complete, high-protein athlete nutrition (~2,200 kcal/day)
            for d in range(7):
                meal_date = ref_today - timedelta(days=d)
                logged_at_utc = datetime.combine(meal_date, datetime.min.time().replace(hour=12, minute=30), tzinfo=user_tz).astimezone(timezone.utc)
                meal = MealLog(user_id=user.id, meal_type="lunch", logged_at=logged_at_utc)
                db.add(meal)
                db.flush()
                add_meal_item(db, meal.id, chick, 200.0)
                add_meal_item(db, meal.id, rice, 150.0)
                add_meal_item(db, meal.id, whey, 40.0)
                add_meal_item(db, meal.id, yogurt, 200.0)

        elif email == "demo.bulking@fitmind.ai":
            # Caloric Surplus (~3,200 kcal/day)
            for d in range(6):
                meal_date = ref_today - timedelta(days=d)
                logged_at_utc = datetime.combine(meal_date, datetime.min.time().replace(hour=13, minute=0), tzinfo=user_tz).astimezone(timezone.utc)
                meal = MealLog(user_id=user.id, meal_type="lunch", logged_at=logged_at_utc)
                db.add(meal)
                db.flush()
                add_meal_item(db, meal.id, oats, 150.0)
                add_meal_item(db, meal.id, whey, 50.0)
                add_meal_item(db, meal.id, eggs, 250.0)
                add_meal_item(db, meal.id, chick, 250.0)
                add_meal_item(db, meal.id, rice, 250.0)

        elif email == "demo.cutting@fitmind.ai":
            # Caloric Deficit (~1,650 kcal/day, high protein 145g)
            for d in range(6):
                meal_date = ref_today - timedelta(days=d)
                logged_at_utc = datetime.combine(meal_date, datetime.min.time().replace(hour=12, minute=0), tzinfo=user_tz).astimezone(timezone.utc)
                meal = MealLog(user_id=user.id, meal_type="lunch", logged_at=logged_at_utc)
                db.add(meal)
                db.flush()
                add_meal_item(db, meal.id, chick, 200.0)
                add_meal_item(db, meal.id, yogurt, 200.0)
                add_meal_item(db, meal.id, broc, 200.0)
                add_meal_item(db, meal.id, salmon, 150.0)

        elif email in ("demo.full@fitmind.ai", "demo.progress@fitmind.ai", "demo.timezone@fitmind.ai", "demo.ai@fitmind.ai"):
            logged_days_count = 6
            for d in range(logged_days_count):
                meal_date = ref_today - timedelta(days=d)
                if email == "demo.timezone@fitmind.ai":
                    logged_at_local = datetime.combine(meal_date, datetime.min.time().replace(hour=0, minute=30), tzinfo=user_tz)
                else:
                    logged_at_local = datetime.combine(meal_date, datetime.min.time().replace(hour=12, minute=30), tzinfo=user_tz)

                logged_at_utc = logged_at_local.astimezone(timezone.utc)
                meal = MealLog(user_id=user.id, meal_type="lunch", logged_at=logged_at_utc)
                db.add(meal)
                db.flush()
                add_meal_item(db, meal.id, chick, 200.0)
                add_meal_item(db, meal.id, rice, 150.0)
                add_meal_item(db, meal.id, whey, 35.0)

        elif email == "demo.inconsistent@fitmind.ai":
            for d in [1, 4]:
                meal_date = ref_today - timedelta(days=d)
                logged_at_utc = datetime.combine(meal_date, datetime.min.time().replace(hour=13, minute=0), tzinfo=timezone.utc)
                meal = MealLog(user_id=user.id, meal_type="lunch", logged_at=logged_at_utc)
                db.add(meal)
                db.flush()
                add_meal_item(db, meal.id, chick, 150.0)

        # Seed Measurements
        if email == "demo.progress@fitmind.ai":
            # 6 measurements over 60 days showing steady, realistic weight loss progression
            weights = [68.5, 67.2, 66.0, 65.0, 64.4, 64.0]
            offsets = [60, 45, 30, 15, 7, 0]
            for w, off in zip(weights, offsets):
                m_date = ref_today - timedelta(days=off)
                db.add(Measurement(
                    user_id=user.id,
                    measured_at=m_date,
                    weight_kg=w,
                    waist_cm=82.0 - ((60 - off) * 0.08),
                    body_fat_pct=22.0 - ((60 - off) * 0.06),
                ))
        elif email == "demo.bulking@fitmind.ai":
            weights = [80.0, 81.5, 82.8, 84.0]
            offsets = [60, 40, 20, 0]
            for w, off in zip(weights, offsets):
                db.add(Measurement(user_id=user.id, measured_at=ref_today - timedelta(days=off), weight_kg=w))
        elif email == "demo.cutting@fitmind.ai":
            weights = [72.5, 71.0, 69.8, 68.5]
            offsets = [60, 40, 20, 0]
            for w, off in zip(weights, offsets):
                db.add(Measurement(user_id=user.id, measured_at=ref_today - timedelta(days=off), weight_kg=w))
        elif email != "demo.beginner@fitmind.ai":
            db.add(Measurement(user_id=user.id, measured_at=ref_today, weight_kg=cfg["weight_kg"]))

        # Seed AI Memories and Chat History for demo.full and demo.ai
        if email == "demo.ai@fitmind.ai":
            mem1 = AIMemory(
                user_id=user.id,
                memory_type="conversational",
                key="training_preference",
                value="Prefers hypertrophy rep ranges (8-12 reps) with 90-second rest periods.",
                source="conversation",
                is_active=True,
            )
            mem2 = AIMemory(
                user_id=user.id,
                memory_type="conversational",
                key="schedule_preference",
                value="Trains in the evening at 6:30 PM after work.",
                source="conversation",
                is_active=True,
            )
            mem3 = AIMemory(
                user_id=user.id,
                memory_type="conversational",
                key="dietary_preference",
                value="Follows a high-protein vegan diet utilizing soy protein, pea protein, and legumes.",
                source="conversation",
                is_active=True,
            )
            db.add_all([mem1, mem2, mem3])

            chats = [
                ChatMessage(user_id=user.id, role="user", content="What is the best way to structure my vegan protein intake for muscle growth?"),
                ChatMessage(user_id=user.id, role="assistant", content="Target 1.8-2.2g of protein per kg of body weight (around 105-125g daily). Combine complementary sources like soy, pea protein, and lentils across 3-4 meals."),
                ChatMessage(user_id=user.id, role="user", content="How often should I increase weights on Barbell Squats?"),
                ChatMessage(user_id=user.id, role="assistant", content="Aim for progressive overload every 1-2 weeks. When you complete all prescribed sets with clean form, add 2.5 kg to the bar."),
                ChatMessage(user_id=user.id, role="user", content="Should I do cardio on my lifting days or rest days?"),
                ChatMessage(user_id=user.id, role="assistant", content="Either works well! If doing cardio on lifting days, complete it after weight training or separated by 6+ hours so it doesn't fatigue your primary lifts."),
            ]
            db.add_all(chats)

        elif email == "demo.full@fitmind.ai":
            mem1 = AIMemory(
                user_id=user.id,
                memory_type="conversational",
                key="exercise_preference",
                value="Prefers Barbell Bench Press and Dumbbell Shoulder Press over machine exercises.",
                source="conversation",
                is_active=True,
            )
            mem2 = AIMemory(
                user_id=user.id,
                memory_type="conversational",
                key="workout_schedule_preference",
                value="Prefers morning training sessions between 7 AM and 9 AM.",
                source="conversation",
                is_active=True,
            )
            db.add_all([mem1, mem2])

            chat1 = ChatMessage(user_id=user.id, role="user", content="How should I adjust my protein intake for my muscle gain goal?")
            chat2 = ChatMessage(user_id=user.id, role="assistant", content="Based on your profile (78.5 kg, muscle gain goal), aim for approximately 1.6-2.2g of protein per kg of body weight (around 125-170g daily).")
            db.add_all([chat1, chat2])

        db.flush()

        # Seed historical Fitness Scores for demo.progress to show positive score trend
        if email == "demo.progress@fitmind.ai":
            past_scores = [55, 58, 61, 64]
            for i, sc in enumerate(past_scores):
                p_start = ref_today - timedelta(days=(4 - i) * 7)
                p_end = p_start + timedelta(days=6)
                fs = FitnessScore(
                    user_id=user.id,
                    score=sc,
                    workout_adherence_pct=75.0 + (i * 5.0),
                    nutrition_score=60.0 + (i * 4.0),
                    protein_score=70.0,
                    sleep_score=75.0,
                    recovery_score=75.0,
                    consistency_score=65.0 + (i * 5.0),
                    period_start=p_start,
                    period_end=p_end,
                )
                db.add(fs)

        # Persist current Fitness Score using FitnessScoreService
        FitnessScoreService.calculate_and_save_fitness_score(db, user, ref_today)
        created_user_emails.append(email)

    db.commit()
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
