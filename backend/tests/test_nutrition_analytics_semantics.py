from datetime import date, datetime, timedelta, timezone
import pytest
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.nutrition import Food, MealLog, MealLogItem
from app.services.analytics_service import AnalyticsService
from app.services.context_builder import ContextBuilder
from app.services.coach_service import SYSTEM_PROMPT
from tests.conftest import TestingSessionLocal


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_user(db: Session):
    email = "nutrition_semantics@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash="hashed_password_abc",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        profile = Profile(
            user_id=user.id,
            full_name="Nutrition Test User",
            height_cm=180.0,
            weight_kg=80.0,
            activity_level="moderate",
            diet_preference="flexible",
        )
        db.add(profile)
        db.commit()

    goal = db.query(Goal).filter(Goal.user_id == user.id, Goal.is_active == True).first()
    if not goal:
        goal = Goal(
            user_id=user.id,
            goal_type="muscle_gain",
            target_weight_kg=85.0,
            is_active=True,
        )
        db.add(goal)
        db.commit()
    db.query(MealLog).filter(MealLog.user_id == user.id).delete()
    db.commit()
    return user


def create_meal_log(db: Session, user_id: str, days_ago: int, cals: float, protein: float):
    dt = datetime.combine(
        date.today() - timedelta(days=days_ago), datetime.min.time()
    ).replace(tzinfo=timezone.utc)

    food = db.query(Food).filter(Food.name == "Test Food").first()
    if not food:
        food = Food(
            name="Test Food",
            calories_per_100g=100.0,
            protein_per_100g=10.0,
            carbs_per_100g=10.0,
            fat_per_100g=2.0,
        )
        db.add(food)
        db.commit()
        db.refresh(food)

    meal = MealLog(
        user_id=user_id,
        meal_type="lunch",
        logged_at=dt,
    )
    db.add(meal)
    db.commit()

    item = MealLogItem(
        meal_log_id=meal.id,
        food_id=food.id,
        quantity_grams=100.0,
        calculated_calories=cals,
        calculated_protein=protein,
        calculated_carbs=30.0,
        calculated_fat=10.0,
    )
    db.add(item)
    db.commit()


# 1. Test 0 Logged Days
def test_nutrition_analytics_0_logged_days(db: Session, test_user: User):
    res = AnalyticsService._compute_nutrition_trends(db, test_user)
    assert res.days_logged_7d == 0
    assert res.days_unlogged_7d == 7
    assert res.logging_completeness_pct == 0.0
    assert res.avg_daily_calories_on_logged_days is None
    assert res.avg_daily_protein_g_on_logged_days is None
    assert res.avg_daily_calories is None
    assert res.avg_daily_protein_g is None


# 2. Test 1 Logged Day (331.0 kcal)
def test_nutrition_analytics_1_logged_day(db: Session, test_user: User):
    create_meal_log(db, test_user.id, days_ago=0, cals=331.0, protein=20.0)

    res = AnalyticsService._compute_nutrition_trends(db, test_user)
    assert res.days_logged_7d == 1
    assert res.days_unlogged_7d == 6
    assert res.logging_completeness_pct == round((1 / 7.0) * 100.0, 1)
    # Must average strictly over the 1 logged day = 331.0 kcal (NOT 331 / 7 = 47.3 kcal!)
    assert res.avg_daily_calories_on_logged_days == 331.0
    assert res.avg_daily_protein_g_on_logged_days == 20.0


# 3. Test 3 Logged Days
def test_nutrition_analytics_3_logged_days(db: Session, test_user: User):
    create_meal_log(db, test_user.id, days_ago=0, cals=2000.0, protein=150.0)
    create_meal_log(db, test_user.id, days_ago=2, cals=2200.0, protein=160.0)
    create_meal_log(db, test_user.id, days_ago=4, cals=1800.0, protein=140.0)

    res = AnalyticsService._compute_nutrition_trends(db, test_user)
    assert res.days_logged_7d == 3
    assert res.days_unlogged_7d == 4
    assert res.logging_completeness_pct == round((3 / 7.0) * 100.0, 1)
    # (2000 + 2200 + 1800) / 3 = 2000.0 kcal
    assert res.avg_daily_calories_on_logged_days == 2000.0
    assert res.avg_daily_protein_g_on_logged_days == 150.0


# 4. Test 7 Logged Days
def test_nutrition_analytics_7_logged_days(db: Session, test_user: User):
    for d in range(7):
        create_meal_log(db, test_user.id, days_ago=d, cals=2500.0, protein=180.0)

    res = AnalyticsService._compute_nutrition_trends(db, test_user)
    assert res.days_logged_7d == 7
    assert res.days_unlogged_7d == 0
    assert res.logging_completeness_pct == 100.0
    assert res.avg_daily_calories_on_logged_days == 2500.0
    assert res.avg_daily_protein_g_on_logged_days == 180.0


# 5. Test Logged Day with Genuinely Low Calories (500 kcal)
def test_nutrition_analytics_genuinely_low_logged_day(db: Session, test_user: User):
    create_meal_log(db, test_user.id, days_ago=1, cals=500.0, protein=35.0)

    res = AnalyticsService._compute_nutrition_trends(db, test_user)
    assert res.days_logged_7d == 1
    assert res.days_unlogged_7d == 6
    assert res.avg_daily_calories_on_logged_days == 500.0
    assert res.avg_daily_protein_g_on_logged_days == 35.0


# 6. Test Unlogged Days Must Never Become Zero-Intake Days
def test_unlogged_days_never_treated_as_zero_intake(db: Session, test_user: User):
    create_meal_log(db, test_user.id, days_ago=0, cals=1200.0, protein=90.0)

    ctx = ContextBuilder.build_fitness_context(db, test_user)
    # Context must only contain the 1 logged day in recent_nutrition, NOT 6 zero-intake dummy days!
    assert len(ctx.recent_nutrition) == 1
    assert ctx.recent_nutrition[0].calories_kcal == 1200.0
    assert ctx.analytics.nutrition_trends.days_unlogged_7d == 6
    assert ctx.analytics.nutrition_trends.avg_daily_calories_on_logged_days == 1200.0


# 7. Test AI System Prompt and Context Field Verification
def test_system_prompt_nutrition_rules_present():
    assert "avg_daily_calories_on_logged_days" in SYSTEM_PROMPT
    assert "STRICTLY to logged days" in SYSTEM_PROMPT
    assert "An unlogged day is NOT equivalent to zero food intake" in SYSTEM_PROMPT
    assert "represent averages ONLY for the logged days" in SYSTEM_PROMPT
