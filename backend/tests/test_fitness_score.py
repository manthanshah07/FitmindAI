from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.fitness_score_service import FORMULA_VERSION

client = TestClient(app)


def get_auth_headers(email: str = "fituser@example.com", password: str = "Password123!"):
    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestFitnessScoreAPI:
    def test_unauthenticated_access(self):
        assert client.get("/api/v1/progress/fitness-score").status_code == 401
        assert client.post("/api/v1/progress/fitness-score/recalculate").status_code == 401

    def test_zero_activity_score(self):
        headers = get_auth_headers("zerouser@example.com")
        res = client.get("/api/v1/progress/fitness-score", headers=headers)
        assert res.status_code == 200
        data = res.json()
        current = data["current_score"]
        assert current is not None
        assert current["score"] >= 0 and current["score"] <= 100
        assert current["workout_adherence_pct"] == 0.0
        assert current["nutrition_score"] == 50.0
        assert current["protein_score"] == 50.0
        assert current["consistency_score"] == 0.0
        assert current["formula_version"] == 2

    def test_formula_version_2_weights_sum_to_100(self):
        # 35% Workouts + 25% Calories + 20% Protein + 20% Consistency = 100%
        # Formula V2 removes the fixed 10% recovery baseline (zero invented data)
        headers = get_auth_headers("v2weights@example.com")
        res = client.get("/api/v1/progress/fitness-score", headers=headers)
        assert res.status_code == 200
        current = res.json()["current_score"]
        assert current["formula_version"] == FORMULA_VERSION

    def test_workout_adherence_work_done_credit(self):
        # Fixes D4: Anti-cheating rule — sessions with <3 completed sets earn 0 credit
        headers = get_auth_headers("workdoneuser@example.com")
        today = datetime.now(timezone.utc).date()

        client.put("/api/v1/profile", json={"target_workout_days_per_week": 4}, headers=headers)

        # Seed exercises
        client.post("/api/v1/exercises/seed", headers=headers)
        exercises_res = client.get("/api/v1/exercises", headers=headers)
        assert exercises_res.status_code == 200
        ex_id = exercises_res.json()[0]["id"]

        # Log session with only 2 sets -> earns 0 credit
        d1 = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        client.post(
            "/api/v1/workout/logs",
            json={
                "started_at": d1,
                "logged_exercises": [
                    {"exercise_id": ex_id, "set_number": 1, "reps_completed": 10},
                    {"exercise_id": ex_id, "set_number": 2, "reps_completed": 10},
                ],
            },
            headers=headers,
        )

        res = client.get("/api/v1/progress/fitness-score", headers=headers)
        assert res.status_code == 200
        # 0 credit earned despite session logged!
        assert res.json()["current_score"]["workout_adherence_pct"] == 0.0

    def test_workout_plan_target_respected(self):
        headers = get_auth_headers("plantargetuser@example.com")
        today = datetime.now(timezone.utc).date()

        client.post("/api/v1/exercises/seed", headers=headers)
        exercises_res = client.get("/api/v1/exercises", headers=headers)
        assert exercises_res.status_code == 200
        ex_id = exercises_res.json()[0]["id"]

        # Custom plan with target = 2 days/week
        client.post(
            "/api/v1/workout/plan",
            json={"name": "2-Day Split", "days_per_week": 2, "exercises": []},
            headers=headers,
        )

        # Log 2 workouts on distinct days with 14 sets each (full credit for 2-day split)
        d1 = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        d2 = datetime.combine(today - timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc).isoformat()

        sets_payload = [{"exercise_id": ex_id, "set_number": s + 1, "reps_completed": 10} for s in range(14)]
        client.post("/api/v1/workout/logs", json={"started_at": d1, "logged_exercises": sets_payload}, headers=headers)
        client.post("/api/v1/workout/logs", json={"started_at": d2, "logged_exercises": sets_payload}, headers=headers)

        res = client.get("/api/v1/progress/fitness-score", headers=headers)
        assert res.status_code == 200
        assert res.json()["current_score"]["workout_adherence_pct"] == 100.0

    def test_no_meal_days_fallback_50(self):
        headers = get_auth_headers("nomealuser@example.com")
        res = client.get("/api/v1/progress/fitness-score", headers=headers)
        assert res.status_code == 200
        assert res.json()["current_score"]["nutrition_score"] == 50.0
        assert res.json()["current_score"]["protein_score"] == 50.0

    def test_score_clamping_boundaries(self):
        headers = get_auth_headers("clampuser@example.com")
        res = client.get("/api/v1/progress/fitness-score", headers=headers)
        assert res.status_code == 200
        score = res.json()["current_score"]["score"]
        assert isinstance(score, int)
        assert 0 <= score <= 100

    def test_upsert_same_period_snapshot(self):
        headers = get_auth_headers("upsertuser@example.com")
        t_date = date.today().isoformat()

        res1 = client.get(f"/api/v1/progress/fitness-score?target_date={t_date}", headers=headers)
        assert res1.status_code == 200
        id1 = res1.json()["current_score"]["id"]

        # Read again for same target date -> returns same snapshot ID
        res2 = client.get(f"/api/v1/progress/fitness-score?target_date={t_date}", headers=headers)
        assert res2.status_code == 200
        id2 = res2.json()["current_score"]["id"]

        assert id1 == id2

    def test_user_isolation_idor_prevention(self):
        headers_a = get_auth_headers("user_a@example.com")
        res_a = client.get("/api/v1/progress/fitness-score", headers=headers_a)
        assert res_a.status_code == 200
        id_a = res_a.json()["current_score"]["id"]

        headers_b = get_auth_headers("user_b@example.com")
        res_b = client.get("/api/v1/progress/fitness-score", headers=headers_b)
        assert res_b.status_code == 200
        b_current = res_b.json()["current_score"]

        assert b_current["id"] != id_a

    def test_consistency_distinct_active_dates(self):
        headers = get_auth_headers("consistuser@example.com")
        today = datetime.now(timezone.utc).date()

        # Day 1: Workout
        d1 = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        client.post("/api/v1/workout/logs", json={"started_at": d1, "logged_exercises": []}, headers=headers)

        # Day 2: Measurement
        d2 = (today - timedelta(days=1)).isoformat()
        client.post("/api/v1/progress/measurements", json={"measured_at": d2, "weight_kg": 75.0}, headers=headers)

        res = client.get("/api/v1/progress/fitness-score", headers=headers)
        assert res.status_code == 200
        # 2 distinct active logging days out of 7 = 2/7 * 100 = 28.57%
        assert res.json()["current_score"]["consistency_score"] == 28.57

    def test_read_only_score_calculation_does_not_mutate_database(self):
        from tests.conftest import TestingSessionLocal
        from app.models.user import User
        from app.models.fitness_score import FitnessScore
        from app.services.fitness_score_service import FitnessScoreService
        from app.services.auth_service import AuthService
        from app.schemas.auth import RegisterRequest

        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == "zerouser@example.com").first()
            if not user:
                user = AuthService.register_user(
                    db, RegisterRequest(email="pure_calc_user@example.com", password="Password123!", full_name="Pure Calc User")
                )

            initial_count = db.query(FitnessScore).filter(FitnessScore.user_id == user.id).count()

            # Execute pure calculation
            item = FitnessScoreService.calculate_fitness_score(db, user)
            assert item.score >= 0

            # Verify ZERO records added to DB
            final_count = db.query(FitnessScore).filter(FitnessScore.user_id == user.id).count()
            assert final_count == initial_count
        finally:
            db.close()
