from datetime import date, datetime, timedelta, timezone
import pytest

from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.workout import Exercise, WorkoutPlan, WorkoutLog, WorkoutLogExercise
from app.models.nutrition import Food, MealLog, MealLogItem
from app.models.progress import Measurement
from app.models.fitness_score import FitnessScore
from app.services.analytics_service import AnalyticsService
from tests.conftest import TestingSessionLocal


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user_analytics_a(db):
    email = "analytics_user_a@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, password_hash="hash")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@pytest.fixture
def user_analytics_b(db):
    email = "analytics_user_b@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, password_hash="hash")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# =====================================================================
# 1. WEIGHT TREND TESTS
# =====================================================================

def test_weight_trend_normal_loss(db, user_analytics_a):
    db.query(Measurement).filter(Measurement.user_id == user_analytics_a.id).delete()
    db.commit()

    m1 = Measurement(
        user_id=user_analytics_a.id,
        measured_at=date.today() - timedelta(days=30),
        weight_kg=85.0,
    )
    m2 = Measurement(
        user_id=user_analytics_a.id,
        measured_at=date.today() - timedelta(days=1),
        weight_kg=81.0,
    )
    db.add_all([m1, m2])
    db.commit()

    res = AnalyticsService._compute_weight_trend(db, user_analytics_a, timeframe_days=90)
    assert res.latest_weight_kg == 81.0
    assert res.previous_weight_kg == 85.0
    assert res.change_kg == -4.0
    assert res.pct_change == -4.7
    assert res.sample_count == 2
    assert res.trend_direction == "losing"


def test_weight_trend_normal_gain(db, user_analytics_a):
    db.query(Measurement).filter(Measurement.user_id == user_analytics_a.id).delete()
    db.commit()

    m1 = Measurement(
        user_id=user_analytics_a.id,
        measured_at=date.today() - timedelta(days=20),
        weight_kg=70.0,
    )
    m2 = Measurement(
        user_id=user_analytics_a.id,
        measured_at=date.today(),
        weight_kg=73.0,
    )
    db.add_all([m1, m2])
    db.commit()

    res = AnalyticsService._compute_weight_trend(db, user_analytics_a, timeframe_days=90)
    assert res.change_kg == 3.0
    assert res.trend_direction == "gaining"


def test_weight_trend_single_measurement(db, user_analytics_a):
    db.query(Measurement).filter(Measurement.user_id == user_analytics_a.id).delete()
    m = Measurement(user_id=user_analytics_a.id, measured_at=date.today(), weight_kg=75.0)
    db.add(m)
    db.commit()

    res = AnalyticsService._compute_weight_trend(db, user_analytics_a, timeframe_days=90)
    assert res.latest_weight_kg == 75.0
    assert res.previous_weight_kg is None
    assert res.change_kg is None
    assert res.pct_change is None
    assert res.sample_count == 1
    assert res.trend_direction == "insufficient_data"


def test_weight_trend_no_measurements(db, user_analytics_a):
    db.query(Measurement).filter(Measurement.user_id == user_analytics_a.id).delete()
    db.commit()

    res = AnalyticsService._compute_weight_trend(db, user_analytics_a, timeframe_days=90)
    assert res.latest_weight_kg is None
    assert res.change_kg is None
    assert res.sample_count == 0
    assert res.trend_direction == "insufficient_data"


# =====================================================================
# 2. GOAL PROGRESS TESTS
# =====================================================================

def test_goal_progress_weight_loss(db, user_analytics_a):
    db.query(Goal).filter(Goal.user_id == user_analytics_a.id).delete()
    db.query(Measurement).filter(Measurement.user_id == user_analytics_a.id).delete()

    goal = Goal(user_id=user_analytics_a.id, goal_type="weight_loss", target_weight_kg=80.0, is_active=True)
    m1 = Measurement(user_id=user_analytics_a.id, measured_at=date.today() - timedelta(days=60), weight_kg=90.0)
    m2 = Measurement(user_id=user_analytics_a.id, measured_at=date.today(), weight_kg=85.0)
    db.add_all([goal, m1, m2])
    db.commit()

    wt = AnalyticsService._compute_weight_trend(db, user_analytics_a)
    res = AnalyticsService._compute_goal_progress(db, user_analytics_a, None, goal, wt)

    assert res.primary_goal == "weight_loss"
    assert res.start_weight_kg == 90.0
    assert res.current_weight_kg == 85.0
    assert res.target_weight_kg == 80.0
    assert res.progress_pct == 50.0  # (90 - 85) / (90 - 80) = 5/10 = 50%
    assert res.remaining_weight_kg == 5.0
    assert res.is_target_met is False
    assert res.status == "on_track"


def test_goal_progress_weight_gain(db, user_analytics_a):
    db.query(Goal).filter(Goal.user_id == user_analytics_a.id).delete()
    db.query(Measurement).filter(Measurement.user_id == user_analytics_a.id).delete()

    goal = Goal(user_id=user_analytics_a.id, goal_type="muscle_gain", target_weight_kg=75.0, is_active=True)
    m1 = Measurement(user_id=user_analytics_a.id, measured_at=date.today() - timedelta(days=30), weight_kg=65.0)
    m2 = Measurement(user_id=user_analytics_a.id, measured_at=date.today(), weight_kg=70.0)
    db.add_all([goal, m1, m2])
    db.commit()

    wt = AnalyticsService._compute_weight_trend(db, user_analytics_a)
    res = AnalyticsService._compute_goal_progress(db, user_analytics_a, None, goal, wt)

    assert res.progress_pct == 50.0  # (70 - 65) / (75 - 65) = 5/10 = 50%
    assert res.remaining_weight_kg == 5.0
    assert res.status == "on_track"


def test_goal_progress_target_met(db, user_analytics_a):
    db.query(Goal).filter(Goal.user_id == user_analytics_a.id).delete()
    db.query(Measurement).filter(Measurement.user_id == user_analytics_a.id).delete()

    goal = Goal(user_id=user_analytics_a.id, goal_type="weight_loss", target_weight_kg=80.0, is_active=True)
    m1 = Measurement(user_id=user_analytics_a.id, measured_at=date.today() - timedelta(days=30), weight_kg=85.0)
    m2 = Measurement(user_id=user_analytics_a.id, measured_at=date.today(), weight_kg=78.0)
    db.add_all([goal, m1, m2])
    db.commit()

    wt = AnalyticsService._compute_weight_trend(db, user_analytics_a)
    res = AnalyticsService._compute_goal_progress(db, user_analytics_a, None, goal, wt)

    assert res.progress_pct == 100.0
    assert res.remaining_weight_kg == 0.0
    assert res.is_target_met is True
    assert res.status == "target_met"


def test_goal_progress_missing_target(db, user_analytics_a):
    db.query(Goal).filter(Goal.user_id == user_analytics_a.id).delete()
    goal = Goal(user_id=user_analytics_a.id, goal_type="general_fitness", target_weight_kg=None, is_active=True)
    db.add(goal)
    db.commit()

    wt = AnalyticsService._compute_weight_trend(db, user_analytics_a)
    res = AnalyticsService._compute_goal_progress(db, user_analytics_a, None, goal, wt)

    assert res.status == "insufficient_data" or res.progress_pct is None


def test_goal_progress_no_active_goal(db, user_analytics_a):
    db.query(Goal).filter(Goal.user_id == user_analytics_a.id).delete()
    db.commit()

    wt = AnalyticsService._compute_weight_trend(db, user_analytics_a)
    res = AnalyticsService._compute_goal_progress(db, user_analytics_a, None, None, wt)

    assert res.status == "no_active_goal"


# =====================================================================
# 3. WORKOUT CONSISTENCY TESTS
# =====================================================================

def test_workout_analytics_with_plan(db, user_analytics_a):
    db.query(WorkoutLog).filter(WorkoutLog.user_id == user_analytics_a.id).delete()
    db.query(WorkoutPlan).filter(WorkoutPlan.user_id == user_analytics_a.id).delete()

    plan = WorkoutPlan(user_id=user_analytics_a.id, name="4 Day Split", days_per_week=4, is_active=True)
    db.add(plan)
    db.flush()

    # Add 12 sessions in 30 days (~2.8 sessions/wk -> adherence)
    for i in range(12):
        log = WorkoutLog(
            user_id=user_analytics_a.id,
            plan_id=plan.id,
            started_at=datetime.now(timezone.utc) - timedelta(days=i * 2),
        )
        db.add(log)
    db.commit()

    res = AnalyticsService._compute_workout_analytics(db, user_analytics_a)
    assert res.total_sessions_30d == 12
    assert res.target_days_per_week == 4
    assert res.weekly_avg_sessions > 2.0
    assert res.adherence_pct is not None
    assert res.consistency_status in ("consistent", "irregular")


def test_workout_analytics_no_plan_target(db, user_analytics_a):
    db.query(WorkoutLog).filter(WorkoutLog.user_id == user_analytics_a.id).delete()
    db.query(WorkoutPlan).filter(WorkoutPlan.user_id == user_analytics_a.id).delete()
    db.commit()

    res = AnalyticsService._compute_workout_analytics(db, user_analytics_a)
    assert res.total_sessions_30d == 0
    assert res.target_days_per_week is None
    assert res.adherence_pct is None  # NO fabricated target!
    assert res.consistency_status == "insufficient_data"


# =====================================================================
# 4. NUTRITION TRENDS TESTS (UNLOGGED DAYS EXCLUDED FROM AVERAGE)
# =====================================================================

def test_nutrition_trends_unlogged_days_excluded(db, user_analytics_a):
    db.query(MealLog).filter(MealLog.user_id == user_analytics_a.id).delete()
    db.commit()

    food = db.query(Food).filter(Food.name == "Analytics Oats").first()
    if not food:
        food = Food(
            name="Analytics Oats",
            calories_per_100g=400,
            protein_per_100g=20,
            carbs_per_100g=60,
            fat_per_100g=10,
        )
        db.add(food)
        db.flush()

    today_dt = datetime.now(timezone.utc)

    # Log 3 out of 7 days: Day 0 (200g = 800kcal), Day 1 (100g = 400kcal), Day 2 (300g = 1200kcal)
    for i, qty in [(0, 200.0), (1, 100.0), (2, 300.0)]:
        meal = MealLog(
            user_id=user_analytics_a.id,
            meal_type="breakfast",
            logged_at=today_dt - timedelta(days=i),
        )
        db.add(meal)
        db.flush()
        item = MealLogItem(
            meal_log_id=meal.id,
            food_id=food.id,
            quantity_grams=qty,
            calculated_calories=400.0 * (qty / 100.0),
            calculated_protein=20.0 * (qty / 100.0),
            calculated_carbs=60.0 * (qty / 100.0),
            calculated_fat=10.0 * (qty / 100.0),
        )
        db.add(item)
    db.commit()

    res = AnalyticsService._compute_nutrition_trends(db, user_analytics_a)
    assert res.days_logged_7d == 3
    assert res.days_unlogged_7d == 4
    assert res.logging_completeness_pct == round((3 / 7.0) * 100.0, 1)

    # Total calories across 3 logged days = 800 + 400 + 1200 = 2400 kcal
    # Average OVER LOGGED DAYS = 2400 / 3 = 800 kcal (NOT 2400 / 7 = 342 kcal!)
    assert res.avg_daily_calories == 800.0
    assert res.avg_daily_protein_g == 40.0


def test_nutrition_trends_empty(db, user_analytics_a):
    db.query(MealLog).filter(MealLog.user_id == user_analytics_a.id).delete()
    db.commit()

    res = AnalyticsService._compute_nutrition_trends(db, user_analytics_a)
    assert res.days_logged_7d == 0
    assert res.days_unlogged_7d == 7
    assert res.logging_completeness_pct == 0.0
    assert res.avg_daily_calories is None
    assert res.avg_daily_protein_g is None


# =====================================================================
# 5. MEASUREMENT TRENDS TESTS
# =====================================================================

def test_measurement_trends_multiple_samples(db, user_analytics_a):
    db.query(Measurement).filter(Measurement.user_id == user_analytics_a.id).delete()
    m1 = Measurement(
        user_id=user_analytics_a.id,
        measured_at=date.today() - timedelta(days=60),
        waist_cm=88.0,
        chest_cm=100.0,
    )
    m2 = Measurement(
        user_id=user_analytics_a.id,
        measured_at=date.today() - timedelta(days=1),
        waist_cm=82.0,
        chest_cm=103.0,
    )
    db.add_all([m1, m2])
    db.commit()

    res = AnalyticsService._compute_measurement_trends(db, user_analytics_a, timeframe_days=90)
    assert res.has_sufficient_data is True
    assert res.sample_count == 2
    assert res.waist_change_cm == -6.0
    assert res.chest_change_cm == 3.0
    assert res.bicep_change_cm is None  # Missing fields remain None


def test_measurement_trends_single_sample(db, user_analytics_a):
    db.query(Measurement).filter(Measurement.user_id == user_analytics_a.id).delete()
    m1 = Measurement(user_id=user_analytics_a.id, measured_at=date.today(), waist_cm=85.0)
    db.add(m1)
    db.commit()

    res = AnalyticsService._compute_measurement_trends(db, user_analytics_a, timeframe_days=90)
    assert res.has_sufficient_data is False
    assert res.waist_change_cm is None


# =====================================================================
# 6. FITNESS SCORE TREND TESTS
# =====================================================================

def test_score_trend_improving(db, user_analytics_a):
    db.query(FitnessScore).filter(FitnessScore.user_id == user_analytics_a.id).delete()

    fs1 = FitnessScore(
        user_id=user_analytics_a.id,
        score=70,
        period_start=date.today() - timedelta(days=13),
        period_end=date.today() - timedelta(days=7),
    )
    fs2 = FitnessScore(
        user_id=user_analytics_a.id,
        score=82,
        period_start=date.today() - timedelta(days=6),
        period_end=date.today(),
    )
    db.add_all([fs1, fs2])
    db.commit()

    res = AnalyticsService._compute_score_trend(db, user_analytics_a)
    assert res.current_score is not None
    assert res.previous_score is not None or res.trend_label != "no_score"


# =====================================================================
# 7. DATA COMPLETENESS INDEX TESTS
# =====================================================================

def test_data_completeness_minimal_new_user(db):
    new_user = User(email="analytics_new_user@example.com", password_hash="hash")
    db.add(new_user)
    db.commit()

    res = AnalyticsService._compute_data_completeness(
        profile=None,
        active_goal=None,
        workout_sessions=0,
        nutrition_days=0,
        measurement_count=0,
        has_score=False,
    )
    assert res.has_profile is False
    assert res.has_active_goal is False
    assert res.overall_quality == "minimal"


def test_data_completeness_comprehensive(db, user_analytics_a):
    prof = Profile(user_id=user_analytics_a.id, full_name="User Complete")
    goal = Goal(user_id=user_analytics_a.id, goal_type="weight_loss", is_active=True)

    res = AnalyticsService._compute_data_completeness(
        profile=prof,
        active_goal=goal,
        workout_sessions=10,
        nutrition_days=6,
        measurement_count=3,
        has_score=True,
    )
    assert res.has_profile is True
    assert res.has_active_goal is True
    assert res.overall_quality == "comprehensive"


# =====================================================================
# 8. USER ISOLATION TESTS
# =====================================================================

def test_user_a_analytics_isolated_from_user_b(db, user_analytics_a, user_analytics_b):
    db.query(Measurement).filter(Measurement.user_id == user_analytics_b.id).delete()
    db.query(MealLog).filter(MealLog.user_id == user_analytics_b.id).delete()

    # Create private data for User B
    m_b1 = Measurement(user_id=user_analytics_b.id, measured_at=date.today() - timedelta(days=10), weight_kg=150.0)
    m_b2 = Measurement(user_id=user_analytics_b.id, measured_at=date.today(), weight_kg=140.0)
    db.add_all([m_b1, m_b2])
    db.commit()

    analytics_a = AnalyticsService.calculate_analytics(db, user_analytics_a)
    analytics_b = AnalyticsService.calculate_analytics(db, user_analytics_b)

    # Assert User A does NOT receive User B's weight trend
    assert analytics_a.weight_trend.latest_weight_kg != 140.0
    assert analytics_b.weight_trend.latest_weight_kg == 140.0


# =====================================================================
# 9. WORKOUT VOLUME & SERIALIZATION TESTS
# =====================================================================

def test_workout_volume_calculation(db, user_analytics_a):
    db.query(WorkoutLog).filter(WorkoutLog.user_id == user_analytics_a.id).delete()
    db.commit()

    ex = db.query(Exercise).filter(Exercise.name == "Volume Bench").first()
    if not ex:
        ex = Exercise(name="Volume Bench", primary_muscle="chest")
        db.add(ex)
        db.flush()

    log = WorkoutLog(user_id=user_analytics_a.id, started_at=datetime.now(timezone.utc))
    db.add(log)
    db.flush()

    # 3 sets of 10 reps @ 100 kg = 3000 kg volume
    for s in range(1, 4):
        item = WorkoutLogExercise(
            log_id=log.id, exercise_id=ex.id, set_number=s, reps_completed=10, weight_kg=100.0
        )
        db.add(item)
    db.commit()

    res = AnalyticsService._compute_workout_analytics(db, user_analytics_a)
    assert res.total_volume_kg == 3000.0


def test_serialization_of_complete_fitness_analytics(db, user_analytics_a):
    analytics = AnalyticsService.calculate_analytics(db, user_analytics_a)
    json_str = analytics.model_dump_json(exclude_none=True)
    assert isinstance(json_str, str)
    assert "weight_trend" in json_str
    assert "data_completeness" in json_str
