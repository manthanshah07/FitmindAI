from datetime import date, datetime, timedelta, timezone
import pytest
from unittest.mock import MagicMock

from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.workout import Exercise, WorkoutPlan, WorkoutLog, WorkoutLogExercise
from app.models.nutrition import Food, MealLog, MealLogItem
from app.models.progress import Measurement
from app.models.fitness_score import FitnessScore
from app.services.context_builder import ContextBuilder
from app.schemas.fitness_context import FitnessContext
from tests.conftest import TestingSessionLocal


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user_a(db):
    email = "context_user_a@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, password_hash="hash")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@pytest.fixture
def user_b(db):
    email = "context_user_b@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, password_hash="hash")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# 1. Profile Context Included
def test_profile_context_included(db, user_a):
    profile = db.query(Profile).filter(Profile.user_id == user_a.id).first()
    if not profile:
        profile = Profile(
            user_id=user_a.id,
            full_name="User A Context",
            height_cm=175.5,
            weight_kg=70.0,
            activity_level="moderate",
            diet_preference="high_protein",
            equipment=["dumbbells"],
            medical_notes="SECRET_MEDICAL_NOTE_SHOULD_NOT_LEAK",
        )
        db.add(profile)
        db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a)
    assert context.profile is not None
    assert context.profile.full_name == "User A Context"
    assert context.profile.height_cm == 175.5
    assert context.profile.weight_kg == 70.0
    assert context.profile.activity_level == "moderate"
    assert context.profile.equipment == ["dumbbells"]


# 2. Active Goal Included
def test_active_goal_included(db, user_a):
    db.query(Goal).filter(Goal.user_id == user_a.id).delete()
    goal = Goal(
        user_id=user_a.id,
        goal_type="muscle_gain",
        target_weight_kg=78.0,
        target_date=date.today() + timedelta(days=90),
        is_active=True,
    )
    db.add(goal)
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a)
    assert context.active_goal is not None
    assert context.active_goal.primary_goal == "muscle_gain"
    assert context.active_goal.target_weight_kg == 78.0


# 3. Missing Profile Does Not Crash
def test_missing_profile_does_not_crash(db, user_a):
    db.query(Profile).filter(Profile.user_id == user_a.id).delete()
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a)
    assert context.profile is None


# 4. Missing Goal Does Not Crash
def test_missing_goal_does_not_crash(db, user_a):
    db.query(Goal).filter(Goal.user_id == user_a.id).delete()
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a)
    assert context.active_goal is None


# 5. Recent Workouts Included
def test_recent_workouts_included(db, user_a):
    ex = db.query(Exercise).filter(Exercise.name == "Context Pushup").first()
    if not ex:
        ex = Exercise(name="Context Pushup", primary_muscle="chest")
        db.add(ex)
        db.flush()

    log = WorkoutLog(
        user_id=user_a.id,
        started_at=datetime.now(timezone.utc) - timedelta(days=2),
        notes="Solid session",
    )
    db.add(log)
    db.flush()

    log_ex = WorkoutLogExercise(
        log_id=log.id,
        exercise_id=ex.id,
        set_number=1,
        reps_completed=15,
        weight_kg=0.0,
    )
    db.add(log_ex)
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a, workout_days=30)
    assert len(context.recent_workouts) >= 1
    recent_ex_names = [e.exercise_name for w in context.recent_workouts for e in w.exercises]
    assert "Context Pushup" in recent_ex_names


# 6. Workouts Outside Window Excluded
def test_workouts_outside_window_excluded(db, user_a):
    ex = db.query(Exercise).filter(Exercise.name == "Ancient Exercise").first()
    if not ex:
        ex = Exercise(name="Ancient Exercise", primary_muscle="legs")
        db.add(ex)
        db.flush()

    old_log = WorkoutLog(
        user_id=user_a.id,
        started_at=datetime.now(timezone.utc) - timedelta(days=45),
        notes="Ancient session",
    )
    db.add(old_log)
    db.flush()

    old_log_ex = WorkoutLogExercise(
        log_id=old_log.id,
        exercise_id=ex.id,
        set_number=1,
        reps_completed=10,
    )
    db.add(old_log_ex)
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a, workout_days=30)
    for w in context.recent_workouts:
        for e in w.exercises:
            assert e.exercise_name != "Ancient Exercise"


# 7. Nutrition Daily Totals Included
def test_nutrition_daily_totals_included(db, user_a):
    food = db.query(Food).filter(Food.name == "Context Oats").first()
    if not food:
        food = Food(
            name="Context Oats",
            calories_per_100g=389,
            protein_per_100g=16.9,
            carbs_per_100g=66.3,
            fat_per_100g=6.9,
        )
        db.add(food)
        db.flush()

    today_dt = datetime.now(timezone.utc)
    meal = MealLog(user_id=user_a.id, meal_type="breakfast", logged_at=today_dt)
    db.add(meal)
    db.flush()

    item = MealLogItem(
        meal_log_id=meal.id,
        food_id=food.id,
        quantity_grams=100.0,
        calculated_calories=389.0,
        calculated_protein=16.9,
        calculated_carbs=66.3,
        calculated_fat=6.9,
    )
    db.add(item)
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a, nutrition_days=7)
    assert len(context.recent_nutrition) >= 1
    today_str = date.today().isoformat()
    today_nut = [n for n in context.recent_nutrition if n.date == today_str]
    assert len(today_nut) == 1
    assert today_nut[0].calories_kcal >= 389.0


# 8. Nutrition Outside Window Excluded
def test_nutrition_outside_window_excluded(db, user_a):
    old_dt = datetime.now(timezone.utc) - timedelta(days=15)
    old_meal = MealLog(user_id=user_a.id, meal_type="lunch", logged_at=old_dt)
    db.add(old_meal)
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a, nutrition_days=7)
    old_date_str = (date.today() - timedelta(days=15)).isoformat()
    for n in context.recent_nutrition:
        assert n.date != old_date_str


# 9. Recent Measurements Included
def test_recent_measurements_included(db, user_a):
    m = Measurement(
        user_id=user_a.id,
        measured_at=date.today() - timedelta(days=5),
        weight_kg=71.2,
        waist_cm=80.0,
    )
    db.add(m)
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a, measurement_days=90)
    assert len(context.recent_measurements) >= 1
    assert any(m_item.weight_kg == 71.2 for m_item in context.recent_measurements)


# 10. Old Measurements Excluded
def test_old_measurements_excluded(db, user_a):
    old_m = Measurement(
        user_id=user_a.id,
        measured_at=date.today() - timedelta(days=120),
        weight_kg=99.9,
    )
    db.add(old_m)
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a, measurement_days=90)
    for m_item in context.recent_measurements:
        assert m_item.weight_kg != 99.9


# 11. Fitness Score Included
def test_fitness_score_included(db, user_a):
    fs = FitnessScore(
        user_id=user_a.id,
        score=82,
        workout_adherence_pct=85.0,
        nutrition_score=80.0,
        protein_score=75.0,
        period_start=date.today() - timedelta(days=6),
        period_end=date.today(),
    )
    db.add(fs)
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a)
    assert context.fitness_score is not None
    assert context.fitness_score.score >= 0


# 12. Missing Fitness Score Does Not Crash
def test_missing_fitness_score_does_not_crash(db, user_a):
    db.query(FitnessScore).filter(FitnessScore.user_id == user_a.id).delete()
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a)
    # Should calculate or return None without raising error
    assert context is not None


# 13. User A Cannot Receive User B Workouts
def test_user_a_cannot_receive_user_b_workouts(db, user_a, user_b):
    ex = db.query(Exercise).filter(Exercise.name == "User B Bench").first()
    if not ex:
        ex = Exercise(name="User B Bench", primary_muscle="chest")
        db.add(ex)
        db.flush()

    log_b = WorkoutLog(
        user_id=user_b.id,
        started_at=datetime.now(timezone.utc) - timedelta(days=1),
        notes="User B Exclusive Workout",
    )
    db.add(log_b)
    db.flush()

    log_ex_b = WorkoutLogExercise(
        log_id=log_b.id, exercise_id=ex.id, set_number=1, reps_completed=10, weight_kg=100.0
    )
    db.add(log_ex_b)
    db.commit()

    context_a = ContextBuilder.build_fitness_context(db, user_a)
    for w in context_a.recent_workouts:
        for e in w.exercises:
            assert e.exercise_name != "User B Bench"


# 14. User A Cannot Receive User B Nutrition
def test_user_a_cannot_receive_user_b_nutrition(db, user_a, user_b):
    food_a = db.query(Food).filter(Food.name == "User A Unique Food").first()
    if not food_a:
        food_a = Food(
            name="User A Unique Food",
            calories_per_100g=500,
            protein_per_100g=50,
            carbs_per_100g=10,
            fat_per_100g=10,
        )
        db.add(food_a)
        db.flush()

    food_b = db.query(Food).filter(Food.name == "User B Unique Food").first()
    if not food_b:
        food_b = Food(
            name="User B Unique Food",
            calories_per_100g=800,
            protein_per_100g=20,
            carbs_per_100g=100,
            fat_per_100g=30,
        )
        db.add(food_b)
        db.flush()

    today_dt = datetime.now(timezone.utc)
    meal_a = MealLog(user_id=user_a.id, meal_type="breakfast", logged_at=today_dt)
    db.add(meal_a)
    db.flush()
    item_a = MealLogItem(
        meal_log_id=meal_a.id,
        food_id=food_a.id,
        quantity_grams=100.0,
        calculated_calories=500.0,
        calculated_protein=50.0,
        calculated_carbs=10.0,
        calculated_fat=10.0,
    )
    db.add(item_a)

    meal_b = MealLog(user_id=user_b.id, meal_type="lunch", logged_at=today_dt)
    db.add(meal_b)
    db.flush()
    item_b = MealLogItem(
        meal_log_id=meal_b.id,
        food_id=food_b.id,
        quantity_grams=100.0,
        calculated_calories=800.0,
        calculated_protein=20.0,
        calculated_carbs=100.0,
        calculated_fat=30.0,
    )
    db.add(item_b)
    db.commit()

    context_a = ContextBuilder.build_fitness_context(db, user_a)
    context_b = ContextBuilder.build_fitness_context(db, user_b)

    today_str = date.today().isoformat()

    nut_a = next((n for n in context_a.recent_nutrition if n.date == today_str), None)
    nut_b = next((n for n in context_b.recent_nutrition if n.date == today_str), None)

    assert nut_a is not None
    assert nut_b is not None

    # User A context contains User A's data (>=500 cals)
    assert nut_a.calories_kcal >= 500.0
    assert nut_a.protein_g >= 50.0

    # User B context contains User B's data (>=800 cals)
    assert nut_b.calories_kcal >= 800.0
    assert nut_b.protein_g >= 20.0

    # User A context does NOT equal User B context
    assert nut_a.calories_kcal != nut_b.calories_kcal
    assert nut_a.protein_g != nut_b.protein_g


# 15. User A Cannot Receive User B Measurements
def test_user_a_cannot_receive_user_b_measurements(db, user_a, user_b):
    m_b = Measurement(
        user_id=user_b.id,
        measured_at=date.today(),
        weight_kg=144.4,
    )
    db.add(m_b)
    db.commit()

    context_a = ContextBuilder.build_fitness_context(db, user_a)
    for m in context_a.recent_measurements:
        assert m.weight_kg != 144.4


# 16. User A Cannot Receive User B Fitness Score
def test_user_a_cannot_receive_user_b_fitness_score(db, user_a, user_b):
    fs_b = FitnessScore(
        user_id=user_b.id,
        score=99,
        period_start=date.today() - timedelta(days=6),
        period_end=date.today(),
    )
    db.add(fs_b)
    db.commit()

    context_a = ContextBuilder.build_fitness_context(db, user_a)
    if context_a.fitness_score:
        assert context_a.fitness_score.score != 99


# 17. Medical Notes Excluded From Context
def test_medical_notes_excluded_from_context(db, user_a):
    profile = db.query(Profile).filter(Profile.user_id == user_a.id).first()
    if profile:
        profile.medical_notes = "CONFIDENTIAL_ASTHMA_DIAGNOSIS"
        db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a)
    context_json = context.model_dump_json()
    assert "CONFIDENTIAL_ASTHMA_DIAGNOSIS" not in context_json
    assert "medical_notes" not in context_json


# 18. Workout Notes Excluded From Context
def test_workout_notes_excluded_from_context(db, user_a):
    log = WorkoutLog(
        user_id=user_a.id,
        started_at=datetime.now(timezone.utc),
        notes="CONFIDENTIAL_SHOULDER_INJURY_NOTE",
    )
    db.add(log)
    db.commit()

    context = ContextBuilder.build_fitness_context(db, user_a)
    context_json = context.model_dump_json()
    assert "CONFIDENTIAL_SHOULDER_INJURY_NOTE" not in context_json
    assert '"notes"' not in context_json


# 18. Canonical Units Preserved
def test_canonical_units_preserved(db, user_a):
    context = ContextBuilder.build_fitness_context(db, user_a)
    if context.profile and context.profile.height_cm:
        # Height is stored in CM
        assert context.profile.height_cm > 50  # CM range, not meters/inches


# 19. Empty New User Produces Valid Empty Context
def test_empty_new_user_produces_valid_empty_context(db):
    new_user = User(email="brand_new_context_user@example.com", password_hash="hash")
    db.add(new_user)
    db.commit()

    context = ContextBuilder.build_fitness_context(db, new_user)
    assert isinstance(context, FitnessContext)
    assert context.profile is None
    assert context.active_goal is None
    assert context.recent_workouts == []
    assert context.recent_nutrition == []
    assert context.recent_measurements == []


# 20. Context JSON Serialization
def test_context_json_serialization(db, user_a):
    context = ContextBuilder.build_fitness_context(db, user_a)
    json_output = context.model_dump_json(exclude_none=True)
    assert isinstance(json_output, str)
    assert "{" in json_output
    assert "analytics" in json_output


# 21. Context Builder Includes Analytics
def test_context_builder_includes_analytics(db, user_a):
    context = ContextBuilder.build_fitness_context(db, user_a)
    assert context.analytics is not None
    assert context.analytics.data_completeness is not None
