from datetime import date, datetime, timezone
from fastapi.testclient import TestClient

from tests.conftest import TestingSessionLocal
from app.core.security import hash_password, create_access_token, create_refresh_token
from app.models.user import User
from app.models.profile import Profile
from app.models.goal import Goal
from app.models.workout import Exercise, WorkoutPlan, WorkoutLog, WorkoutLogExercise
from app.models.nutrition import Food, MealLog, MealLogItem
from app.models.progress import Measurement
from app.models.chat_message import ChatMessage
from app.models.fitness_score import FitnessScore
from app.seed_demo_data import seed_primary_demo_account, DEMO_PASSWORD_PLAIN


def _setup_two_users():
    db = TestingSessionLocal()
    try:
        user_a = User(
            email="isolation.user.a@fitmind.ai",
            password_hash=hash_password("UserAPass@123"),
            is_active=True,
            is_verified=True,
        )
        user_b = User(
            email="isolation.user.b@fitmind.ai",
            password_hash=hash_password("UserBPass@123"),
            is_active=True,
            is_verified=True,
        )
        db.add_all([user_a, user_b])
        db.flush()

        db.add_all([
            Profile(
                user_id=user_a.id,
                full_name="User Alpha",
                gender="male",
                height_cm=180.0,
                weight_kg=82.0,
                activity_level="moderate",
                diet_preference="omnivore",
                equipment=["barbell", "dumbbells"],
                timezone="UTC",
                onboarding_complete=True,
            ),
            Profile(
                user_id=user_b.id,
                full_name="User Bravo",
                gender="female",
                height_cm=165.0,
                weight_kg=62.0,
                activity_level="moderate",
                diet_preference="omnivore",
                equipment=["dumbbells"],
                timezone="UTC",
                onboarding_complete=True,
            ),
            Goal(user_id=user_a.id, goal_type="fat_loss", target_weight_kg=76.0, is_active=True),
            Goal(user_id=user_b.id, goal_type="muscle_gain", target_weight_kg=65.0, is_active=True),
        ])
        db.flush()

        ex = Exercise(
            name="Isolation Test Bench Press",
            category="strength",
            primary_muscle="chest",
            equipment_required=["barbell"],
            difficulty="intermediate",
        )
        food = Food(
            name="Isolation Test Chicken Breast",
            calories_per_100g=165.0,
            protein_per_100g=31.0,
            carbs_per_100g=0.0,
            fat_per_100g=3.6,
            is_verified=True,
        )
        db.add_all([ex, food])
        db.flush()

        plan_a = WorkoutPlan(
            user_id=user_a.id,
            name="User A Secret Plan",
            days_per_week=4,
            is_active=True,
        )
        db.add(plan_a)
        db.flush()

        wlog_a = WorkoutLog(
            user_id=user_a.id,
            plan_id=plan_a.id,
            started_at=datetime.now(timezone.utc),
            ended_at=datetime.now(timezone.utc),
            notes="User A private workout session",
        )
        db.add(wlog_a)
        db.flush()
        db.add(
            WorkoutLogExercise(
                log_id=wlog_a.id,
                exercise_id=ex.id,
                set_number=1,
                reps_completed=8,
                weight_kg=80.0,
                rpe=8,
            )
        )

        mlog_a = MealLog(
            user_id=user_a.id,
            meal_type="lunch",
            logged_at=datetime.now(timezone.utc),
            notes="User A private meal",
        )
        db.add(mlog_a)
        db.flush()
        mitem_a = MealLogItem(
            meal_log_id=mlog_a.id,
            food_id=food.id,
            quantity_grams=200.0,
            calculated_calories=330.0,
            calculated_protein=62.0,
            calculated_carbs=0.0,
            calculated_fat=7.2,
        )
        db.add(mitem_a)

        meas_a = Measurement(
            user_id=user_a.id,
            measured_at=date.today(),
            weight_kg=81.5,
            waist_cm=84.0,
            body_fat_pct=18.5,
        )
        chat_a = ChatMessage(
            user_id=user_a.id,
            role="user",
            content="User A confidential coaching question",
        )
        db.add_all([meas_a, chat_a])
        db.commit()

        token_a = create_access_token({"sub": str(user_a.id)})
        token_b = create_access_token({"sub": str(user_b.id)})
        return {
            "user_a_id": str(user_a.id),
            "user_b_id": str(user_b.id),
            "headers_a": {"Authorization": f"Bearer {token_a}"},
            "headers_b": {"Authorization": f"Bearer {token_b}"},
            "wlog_a_id": str(wlog_a.id),
            "mlog_a_id": str(mlog_a.id),
            "mitem_a_id": str(mitem_a.id),
        }
    finally:
        db.close()


def test_cross_user_workout_isolation(client: TestClient):
    ctx = _setup_two_users()

    # User A can read their own workout log
    res_a = client.get(f"/api/v1/workout/logs/{ctx['wlog_a_id']}", headers=ctx["headers_a"])
    assert res_a.status_code == 200

    # User B cannot read User A's workout log by ID
    res_b = client.get(f"/api/v1/workout/logs/{ctx['wlog_a_id']}", headers=ctx["headers_b"])
    assert res_b.status_code == 404

    # User B's workout log list and active plan never expose User A's records
    logs_b = client.get("/api/v1/workout/logs", headers=ctx["headers_b"])
    assert logs_b.status_code == 200
    assert logs_b.json() == []

    plan_b = client.get("/api/v1/workout/plan", headers=ctx["headers_b"])
    assert plan_b.status_code == 200
    assert plan_b.json() is None


def test_cross_user_nutrition_isolation(client: TestClient):
    ctx = _setup_two_users()

    # User B cannot read User A's meal log
    get_b = client.get(f"/api/v1/nutrition/logs/{ctx['mlog_a_id']}", headers=ctx["headers_b"])
    assert get_b.status_code == 404

    # User B cannot update User A's meal item
    patch_b = client.patch(
        f"/api/v1/nutrition/items/{ctx['mitem_a_id']}",
        json={"quantity_grams": 500.0},
        headers=ctx["headers_b"],
    )
    assert patch_b.status_code == 404

    # User B cannot delete User A's meal item or meal log
    del_item_b = client.delete(f"/api/v1/nutrition/items/{ctx['mitem_a_id']}", headers=ctx["headers_b"])
    assert del_item_b.status_code == 404

    del_log_b = client.delete(f"/api/v1/nutrition/logs/{ctx['mlog_a_id']}", headers=ctx["headers_b"])
    assert del_log_b.status_code == 404

    # Verify User A's meal log is still intact
    get_a = client.get(f"/api/v1/nutrition/logs/{ctx['mlog_a_id']}", headers=ctx["headers_a"])
    assert get_a.status_code == 200
    assert get_a.json()["items"][0]["quantity_grams"] == 200.0


def test_cross_user_measurements_coach_and_export_isolation(client: TestClient):
    ctx = _setup_two_users()

    # User B measurements list is empty and does not leak User A's 81.5 kg measurement
    meas_b = client.get("/api/v1/progress/measurements", headers=ctx["headers_b"])
    assert meas_b.status_code == 200
    assert meas_b.json() == []

    # User B coach history does not leak User A's chat messages
    hist_b = client.get("/api/v1/coach/history", headers=ctx["headers_b"])
    assert hist_b.status_code == 200
    assert hist_b.json() == []

    # User B clearing coach history does not delete User A's chat messages
    clear_b = client.delete("/api/v1/coach/history", headers=ctx["headers_b"])
    assert clear_b.status_code in (200, 204)

    hist_a = client.get("/api/v1/coach/history", headers=ctx["headers_a"])
    assert hist_a.status_code == 200
    assert len(hist_a.json()) == 1
    assert hist_a.json()[0]["content"] == "User A confidential coaching question"

    # User B export contains strictly User B's account data
    export_b = client.get("/api/v1/user/export", headers=ctx["headers_b"])
    assert export_b.status_code == 200
    export_payload = export_b.json()
    assert export_payload["user"]["email"] == "isolation.user.b@fitmind.ai"
    assert export_payload["workout_logs"] == []
    assert export_payload["meal_logs"] == []
    assert export_payload["measurements"] == []
    assert export_payload["chat_messages"] == []


def test_security_cors_allows_patch_and_rejects_refresh_token_as_access_token(client: TestClient):
    ctx = _setup_two_users()

    # CORS preflight allows PATCH
    preflight = client.options(
        "/api/v1/nutrition/items/00000000-0000-0000-0000-000000000000",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "PATCH",
        },
    )
    assert preflight.status_code == 200
    allow_methods = preflight.headers.get("access-control-allow-methods", "")
    assert "PATCH" in allow_methods

    # Refresh token must be rejected when used as a Bearer access token
    refresh_tok = create_refresh_token({"sub": ctx["user_a_id"]})
    bad_res = client.get(
        "/api/v1/profile",
        headers={"Authorization": f"Bearer {refresh_tok}"},
    )
    assert bad_res.status_code == 401


def test_seed_primary_demo_account_creates_populated_demo_user():
    db = TestingSessionLocal()
    try:
        email = seed_primary_demo_account(db)
        assert email == "demo@fitmind.ai"

        user = db.query(User).filter(User.email == "demo@fitmind.ai").first()
        assert user is not None
        assert user.profile is not None
        assert user.profile.onboarding_complete is True

        active_plan = (
            db.query(WorkoutPlan)
            .filter(WorkoutPlan.user_id == user.id, WorkoutPlan.is_active == True)
            .first()
        )
        assert active_plan is not None
        assert active_plan.days_per_week == 4

        wlogs_count = db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id).count()
        assert wlogs_count >= 8

        mlogs_count = db.query(MealLog).filter(MealLog.user_id == user.id).count()
        assert mlogs_count >= 20

        meas_count = db.query(Measurement).filter(Measurement.user_id == user.id).count()
        assert meas_count >= 5

        latest_score = (
            db.query(FitnessScore)
            .filter(FitnessScore.user_id == user.id)
            .order_by(FitnessScore.calculated_at.desc())
            .first()
        )
        assert latest_score is not None
        assert latest_score.formula_version == 2
        assert 0 <= latest_score.score <= 100
    finally:
        db.close()


def test_cors_origins_parsing_resilience():
    from app.core.config import Settings

    s_plain = Settings(CORS_ORIGINS="https://fitmind-ai-omega.vercel.app")
    assert s_plain.CORS_ORIGINS == ["https://fitmind-ai-omega.vercel.app"]

    s_csv = Settings(CORS_ORIGINS="https://fitmind-ai-omega.vercel.app/ , http://localhost:5173/ , ")
    assert s_csv.CORS_ORIGINS == ["https://fitmind-ai-omega.vercel.app", "http://localhost:5173"]

    s_json = Settings(CORS_ORIGINS='["https://fitmind-ai-omega.vercel.app/"]')
    assert s_json.CORS_ORIGINS == ["https://fitmind-ai-omega.vercel.app"]

    s_list = Settings(CORS_ORIGINS=["https://fitmind-ai-omega.vercel.app/"])
    assert s_list.CORS_ORIGINS == ["https://fitmind-ai-omega.vercel.app"]

