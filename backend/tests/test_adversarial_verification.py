from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_headers(email: str, password: str = "Password123!"):
    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestAdversarialUserIsolation:
    """Comprehensive multi-domain cross-user isolation and authorization testing."""

    def test_profile_user_isolation(self):
        headers_a = get_auth_headers("iso_profile_a@example.com")
        headers_b = get_auth_headers("iso_profile_b@example.com")

        # User A updates profile
        res_a_put = client.put(
            "/api/v1/profile",
            json={"full_name": "User A Unique Name", "medical_notes": "User A Secret"},
            headers=headers_a,
        )
        assert res_a_put.status_code == 200

        # User B gets their own profile -> must NOT see User A's data
        res_b_get = client.get("/api/v1/profile", headers=headers_b)
        assert res_b_get.status_code == 200
        b_data = res_b_get.json()
        assert b_data["full_name"] != "User A Unique Name"
        assert b_data["medical_notes"] != "User A Secret"

    def test_goals_user_isolation(self):
        headers_a = get_auth_headers("iso_goals_a@example.com")
        headers_b = get_auth_headers("iso_goals_b@example.com")

        # User A sets goal
        res_a_goal = client.post(
            "/api/v1/goals",
            json={"goal_type": "weight_loss", "target_weight_kg": 65.0, "weekly_goal_kg": 0.5},
            headers=headers_a,
        )
        assert res_a_goal.status_code == 201

        # User B gets active goal -> must be None / separate
        res_b_goal = client.get("/api/v1/goals", headers=headers_b)
        assert res_b_goal.status_code == 200
        assert res_b_goal.json() is None

    def test_workout_plans_user_isolation(self):
        headers_a = get_auth_headers("iso_plan_a@example.com")
        headers_b = get_auth_headers("iso_plan_b@example.com")

        client.post("/api/v1/exercises/seed", headers=headers_a)
        res_a_plan = client.post(
            "/api/v1/workout/plan",
            json={"name": "User A Plan"},
            headers=headers_a,
        )
        assert res_a_plan.status_code == 201
        plan_id_a = res_a_plan.json()["id"]

        # User B gets active plan -> must be None / separate
        res_b_plan = client.get("/api/v1/workout/plan", headers=headers_b)
        assert res_b_plan.status_code == 200
        assert res_b_plan.json() is None

        # User B attempts to log workout using User A's plan_id -> REJECTED (404)
        client.post("/api/v1/exercises/seed", headers=headers_b)
        ex_b = client.get("/api/v1/exercises", headers=headers_b).json()[0]["id"]

        res_cross_log = client.post(
            "/api/v1/workout/logs",
            json={
                "plan_id": plan_id_a,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "logged_exercises": [{"exercise_id": ex_b, "set_number": 1, "reps_completed": 10}],
            },
            headers=headers_b,
        )
        assert res_cross_log.status_code == 404

    def test_nutrition_user_isolation(self):
        headers_a = get_auth_headers("iso_nut_a@example.com")
        headers_b = get_auth_headers("iso_nut_b@example.com")

        client.post("/api/v1/foods/seed", headers=headers_a)
        food_a = client.get("/api/v1/foods", headers=headers_a).json()[0]["id"]

        now_iso = datetime.now(timezone.utc).isoformat()
        res_a_meal = client.post(
            "/api/v1/nutrition/log",
            json={
                "meal_type": "lunch",
                "logged_at": now_iso,
                "items": [{"food_id": food_a, "quantity_grams": 200.0}],
            },
            headers=headers_a,
        )
        assert res_a_meal.status_code == 201
        meal_id_a = res_a_meal.json()["id"]

        # User B attempts to get User A's meal log by ID -> REJECTED (404)
        res_b_get_meal = client.get(f"/api/v1/nutrition/logs/{meal_id_a}", headers=headers_b)
        assert res_b_get_meal.status_code == 404

        # User B today summary -> 0 cals consumed
        res_b_summary = client.get("/api/v1/nutrition/today", headers=headers_b)
        assert res_b_summary.status_code == 200
        assert res_b_summary.json()["consumed"]["calories"] == 0.0

    def test_measurements_user_isolation(self):
        headers_a = get_auth_headers("iso_meas_a@example.com")
        headers_b = get_auth_headers("iso_meas_b@example.com")

        res_a_meas = client.post(
            "/api/v1/progress/measurements",
            json={"measured_at": "2026-08-17", "weight_kg": 85.0},
            headers=headers_a,
        )
        assert res_a_meas.status_code == 201

        # User B progress summary -> 0 entries
        res_b_summary = client.get("/api/v1/progress/summary", headers=headers_b)
        assert res_b_summary.status_code == 200
        assert res_b_summary.json()["total_entries"] == 0


class TestAdversarialTransactionAtomicity:
    """Rigorous verification of partial-write prevention and atomic rollback."""

    def test_workout_logging_partial_write_atomicity(self):
        headers = get_auth_headers("trx_workout@example.com")
        client.post("/api/v1/exercises/seed", headers=headers)
        valid_ex_id = client.get("/api/v1/exercises", headers=headers).json()[0]["id"]
        invalid_ex_id = "00000000-0000-0000-0000-000000000000"

        # Record initial log count
        initial_logs_count = len(client.get("/api/v1/workout/logs", headers=headers).json())

        # Attempt submitting mixed valid + invalid exercise IDs
        now_iso = datetime.now(timezone.utc).isoformat()
        res = client.post(
            "/api/v1/workout/logs",
            json={
                "started_at": now_iso,
                "notes": "Atomic Test Workout",
                "logged_exercises": [
                    {"exercise_id": valid_ex_id, "set_number": 1, "reps_completed": 10},
                    {"exercise_id": invalid_ex_id, "set_number": 2, "reps_completed": 10},
                ],
            },
            headers=headers,
        )
        assert res.status_code == 400

        # Verify zero partial rows were created in DB
        after_logs_count = len(client.get("/api/v1/workout/logs", headers=headers).json())
        assert after_logs_count == initial_logs_count

    def test_nutrition_logging_partial_write_atomicity(self):
        headers = get_auth_headers("trx_nutrition@example.com")
        client.post("/api/v1/foods/seed", headers=headers)
        valid_food_id = client.get("/api/v1/foods", headers=headers).json()[0]["id"]
        invalid_food_id = "00000000-0000-0000-0000-000000000000"

        # Record initial log count
        initial_logs_count = len(client.get("/api/v1/nutrition/logs", headers=headers).json())

        # Attempt submitting mixed valid + invalid food IDs
        now_iso = datetime.now(timezone.utc).isoformat()
        res = client.post(
            "/api/v1/nutrition/log",
            json={
                "meal_type": "dinner",
                "logged_at": now_iso,
                "notes": "Atomic Test Meal",
                "items": [
                    {"food_id": valid_food_id, "quantity_grams": 100.0},
                    {"food_id": invalid_food_id, "quantity_grams": 100.0},
                ],
            },
            headers=headers,
        )
        assert res.status_code == 400

        # Verify zero partial rows were created in DB
        after_logs_count = len(client.get("/api/v1/nutrition/logs", headers=headers).json())
        assert after_logs_count == initial_logs_count


class TestAdversarialCustomWorkoutExercises:
    """Rigorous verification of custom workout plan exercises API contract."""

    def test_custom_exercises_list_contract(self):
        headers = get_auth_headers("custom_plan_user@example.com")
        client.post("/api/v1/exercises/seed", headers=headers)
        all_exs = client.get("/api/v1/exercises", headers=headers).json()
        ex1_id = all_exs[0]["id"]
        ex2_id = all_exs[1]["id"]

        # Create plan with 2 custom exercises
        custom_payload = {
            "name": "Custom 2-Exercise Routine",
            "days_per_week": 3,
            "exercises": [
                {
                    "exercise_id": ex1_id,
                    "day_of_week": 1,
                    "sets": 4,
                    "reps": "6-8",
                    "rest_seconds": 90,
                    "notes": "Heavy set",
                },
                {
                    "exercise_id": ex2_id,
                    "day_of_week": 2,
                    "sets": 3,
                    "reps": "12-15",
                    "rest_seconds": 60,
                    "notes": "Volume set",
                },
            ],
        }

        res = client.post("/api/v1/workout/plan", json=custom_payload, headers=headers)
        assert res.status_code == 201
        plan = res.json()
        assert plan["name"] == "Custom 2-Exercise Routine"
        assert len(plan["plan_exercises"]) == 2
        assert plan["plan_exercises"][0]["exercise_id"] == ex1_id
        assert plan["plan_exercises"][0]["sets"] == 4
        assert plan["plan_exercises"][0]["reps"] == "6-8"
        assert plan["plan_exercises"][1]["exercise_id"] == ex2_id
        assert plan["plan_exercises"][1]["sets"] == 3

    def test_custom_exercises_invalid_uuid_rejected(self):
        headers = get_auth_headers("custom_bad_uuid@example.com")
        client.post("/api/v1/exercises/seed", headers=headers)
        fake_id = "00000000-0000-0000-0000-000000000000"

        res = client.post(
            "/api/v1/workout/plan",
            json={
                "name": "Bad Plan",
                "exercises": [{"exercise_id": fake_id, "sets": 3}],
            },
            headers=headers,
        )
        assert res.status_code == 400


class TestAdversarialFitnessScoreFreshness:
    """Verify fitness score dynamic component calculation and freshness."""

    def test_fitness_score_component_updates_on_new_activity(self):
        headers = get_auth_headers("score_fresh_user@example.com")
        today = date.today()

        # Initial baseline score summary
        res_init = client.get("/api/v1/progress/fitness-score", headers=headers)
        assert res_init.status_code == 200
        init_adherence = res_init.json()["current_score"]["workout_adherence_pct"]
        assert init_adherence == 0.0

        # Log a workout today
        client.post("/api/v1/exercises/seed", headers=headers)
        ex_id = client.get("/api/v1/exercises", headers=headers).json()[0]["id"]
        now_iso = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()

        client.post(
            "/api/v1/workout/logs",
            json={
                "started_at": now_iso,
                "logged_exercises": [{"exercise_id": ex_id, "set_number": 1, "reps_completed": 10}],
            },
            headers=headers,
        )

        # Re-fetch fitness score summary
        res_updated = client.get("/api/v1/progress/fitness-score", headers=headers)
        assert res_updated.status_code == 200
        updated_adherence = res_updated.json()["current_score"]["workout_adherence_pct"]

        # Default plan target = 4 days/week. 1 completed day / 4 = 25.0%
        assert updated_adherence == 25.0


class TestAdversarialDateBoundaries:
    """Verify midnight boundary handling for daily summaries."""

    def test_midnight_date_boundary_attribution(self):
        headers = get_auth_headers("midnight_user@example.com")
        client.post("/api/v1/foods/seed", headers=headers)
        food_id = client.get("/api/v1/foods", headers=headers).json()[0]["id"]

        # Log meal at 23:55:00 UTC on 2026-08-16
        logged_time = "2026-08-16T23:55:00Z"
        res_log = client.post(
            "/api/v1/nutrition/log",
            json={
                "meal_type": "snack",
                "logged_at": logged_time,
                "items": [{"food_id": food_id, "quantity_grams": 100.0}],
            },
            headers=headers,
        )
        assert res_log.status_code == 201

        # Summary for 2026-08-16 must include this meal
        res_16 = client.get("/api/v1/nutrition/today?target_date=2026-08-16", headers=headers)
        assert res_16.status_code == 200
        assert len(res_16.json()["meals_by_type"]["snack"]) == 1

        # Summary for 2026-08-17 must NOT include this meal
        res_17 = client.get("/api/v1/nutrition/today?target_date=2026-08-17", headers=headers)
        assert res_17.status_code == 200
        assert len(res_17.json()["meals_by_type"]["snack"]) == 0

    def test_ist_timezone_boundary_attribution(self):
        headers = get_auth_headers("ist_user@example.com")
        client.post("/api/v1/foods/seed", headers=headers)
        food_id = client.get("/api/v1/foods", headers=headers).json()[0]["id"]

        # Meal 1 logged at 2026-08-18 00:30 IST (+05:30) -> equivalent to 2026-08-17 19:00:00 UTC
        ist_early = "2026-08-18T00:30:00+05:30"
        # Meal 2 logged at 2026-08-18 23:30 IST (+05:30) -> equivalent to 2026-08-18 18:00:00 UTC
        ist_late = "2026-08-18T23:30:00+05:30"

        client.post(
            "/api/v1/nutrition/log",
            json={"meal_type": "breakfast", "logged_at": ist_early, "items": [{"food_id": food_id, "quantity_grams": 100.0}]},
            headers=headers,
        )
        client.post(
            "/api/v1/nutrition/log",
            json={"meal_type": "dinner", "logged_at": ist_late, "items": [{"food_id": food_id, "quantity_grams": 100.0}]},
            headers=headers,
        )

        # Under the system's UTC date indexing convention:
        # Meal 1 (00:30 IST = 19:00 Aug 17 UTC) is assigned to UTC Date 2026-08-17
        res_aug17 = client.get("/api/v1/nutrition/today?target_date=2026-08-17", headers=headers)
        assert res_aug17.status_code == 200
        assert len(res_aug17.json()["meals_by_type"]["breakfast"]) == 1

        # Meal 2 (23:30 IST = 18:00 Aug 18 UTC) is assigned to UTC Date 2026-08-18
        res_aug18 = client.get("/api/v1/nutrition/today?target_date=2026-08-18", headers=headers)
        assert res_aug18.status_code == 200
        assert len(res_aug18.json()["meals_by_type"]["dinner"]) == 1
