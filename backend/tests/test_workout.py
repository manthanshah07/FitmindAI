from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_headers(email: str = "workoutuser@example.com", password: str = "Password123!"):
    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestWorkoutAPI:
    def test_unauthenticated_workout_access(self):
        res_exercises = client.get("/api/v1/exercises")
        assert res_exercises.status_code == 401

        res_plan = client.get("/api/v1/workout/plan")
        assert res_plan.status_code == 401

        res_logs = client.get("/api/v1/workout/logs")
        assert res_logs.status_code == 401

    def test_exercise_seeding_and_retrieval(self):
        headers = get_auth_headers("exuser@example.com")

        # Seed exercises
        res_seed = client.post("/api/v1/exercises/seed", headers=headers)
        assert res_seed.status_code == 201
        exercises = res_seed.json()
        assert len(exercises) >= 8

        # Browse exercises
        res_get = client.get("/api/v1/exercises", headers=headers)
        assert res_get.status_code == 200
        assert len(res_get.json()) >= 8

        # Search exercise
        res_search = client.get("/api/v1/exercises?search=Push-up", headers=headers)
        assert res_search.status_code == 200
        assert res_search.json()[0]["name"] == "Push-up"

    def test_workout_plan_generation_and_retrieval(self):
        headers = get_auth_headers("planuser@example.com")

        # Initial fetch -> null
        res_init = client.get("/api/v1/workout/plan", headers=headers)
        assert res_init.status_code == 200
        assert res_init.json() is None

        # Generate plan
        res_gen = client.post(
            "/api/v1/workout/plan",
            json={"name": "Hypertrophy Plan", "days_per_week": 4},
            headers=headers,
        )
        assert res_gen.status_code == 201
        plan = res_gen.json()
        assert plan["name"] == "Hypertrophy Plan"
        assert plan["is_active"] is True
        assert len(plan["plan_exercises"]) > 0

        # Fetch active plan
        res_active = client.get("/api/v1/workout/plan", headers=headers)
        assert res_active.status_code == 200
        assert res_active.json()["name"] == "Hypertrophy Plan"

    def test_workout_session_logging_and_history(self):
        headers = get_auth_headers("loguser@example.com")

        # Seed & generate plan first
        client.post("/api/v1/exercises/seed", headers=headers)
        res_plan = client.post("/api/v1/workout/plan", json={}, headers=headers)
        plan_id = res_plan.json()["id"]
        exercise_id = res_plan.json()["plan_exercises"][0]["exercise_id"]

        # Log workout session
        now_iso = datetime.now(timezone.utc).isoformat()
        log_payload = {
            "plan_id": plan_id,
            "started_at": now_iso,
            "notes": "Great morning session!",
            "logged_exercises": [
                {
                    "exercise_id": exercise_id,
                    "set_number": 1,
                    "reps_completed": 12,
                    "weight_kg": 60.0,
                    "rpe": 8,
                },
                {
                    "exercise_id": exercise_id,
                    "set_number": 2,
                    "reps_completed": 10,
                    "weight_kg": 65.0,
                    "rpe": 9,
                },
            ],
        }

        res_log = client.post("/api/v1/workout/logs", json=log_payload, headers=headers)
        assert res_log.status_code == 201
        log_data = res_log.json()
        assert log_data["notes"] == "Great morning session!"
        assert len(log_data["logged_exercises"]) == 2
        assert float(log_data["logged_exercises"][0]["weight_kg"]) == 60.0

        # Get logs history
        res_history = client.get("/api/v1/workout/logs", headers=headers)
        assert res_history.status_code == 200
        assert len(res_history.json()) == 1

        # Get log detail by ID
        log_id = log_data["id"]
        res_detail = client.get(f"/api/v1/workout/logs/{log_id}", headers=headers)
        assert res_detail.status_code == 200
        assert res_detail.json()["id"] == log_id
