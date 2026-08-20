from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app

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
        assert current["sleep_score"] == 75.0
        assert current["recovery_score"] == 75.0
        assert current["consistency_score"] == 0.0

    def test_perfect_high_adherence_score(self):
        headers = get_auth_headers("perfectuser@example.com")
        today = date.today()

        # Seed profile and active workout plan (target 3 days)
        client.put(
            "/api/v1/profile",
            json={
                "full_name": "Perfect Athlete",
                "weight_kg": 75.0,
                "height_cm": 178.0,
                "gender": "male",
                "activity_level": "moderate",
                "fitness_experience": "intermediate",
            },
            headers=headers,
        )

        plan_res = client.post(
            "/api/v1/workout/plan",
            json={"name": "3-Day Strength", "days_per_week": 3, "exercises": []},
            headers=headers,
        )
        assert plan_res.status_code == 201

        # Log workouts on 3 distinct days in trailing 7 days
        for i in range(3):
            w_date = datetime.combine(today - timedelta(days=i), datetime.min.time(), tzinfo=timezone.utc).isoformat()
            client.post(
                "/api/v1/workout/logs",
                json={"started_at": w_date, "notes": "Solid workout", "logged_exercises": []},
                headers=headers,
            )

        # Recalculate score
        res = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["workout_adherence_pct"] == 100.0
        assert data["sleep_score"] == 75.0
        assert data["recovery_score"] == 75.0
        assert data["score"] >= 50

    def test_same_day_multiple_workouts(self):
        headers = get_auth_headers("samedayuser@example.com")
        today = date.today()
        dt_str = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()

        # Log 2 workouts on the exact same date
        client.post("/api/v1/workout/logs", json={"started_at": dt_str, "logged_exercises": []}, headers=headers)
        client.post("/api/v1/workout/logs", json={"started_at": dt_str, "logged_exercises": []}, headers=headers)

        res = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers)
        assert res.status_code == 200
        # Default target days = 4. 1 completed day / 4 = 25%
        assert res.json()["workout_adherence_pct"] == 25.0

    def test_workout_plan_target_respected(self):
        headers = get_auth_headers("plantargetuser@example.com")
        today = date.today()

        # Custom plan with target = 2 days/week
        client.post(
            "/api/v1/workout/plan",
            json={"name": "2-Day Split", "days_per_week": 2, "exercises": []},
            headers=headers,
        )

        # Log 2 workouts on distinct days
        d1 = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        d2 = datetime.combine(today - timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc).isoformat()
        client.post("/api/v1/workout/logs", json={"started_at": d1, "logged_exercises": []}, headers=headers)
        client.post("/api/v1/workout/logs", json={"started_at": d2, "logged_exercises": []}, headers=headers)

        res = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers)
        assert res.status_code == 200
        assert res.json()["workout_adherence_pct"] == 100.0

    def test_no_workout_plan_default_4_days(self):
        headers = get_auth_headers("noplanuser@example.com")
        today = date.today()

        # Log 2 workouts with no active plan
        d1 = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        d2 = datetime.combine(today - timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc).isoformat()
        client.post("/api/v1/workout/logs", json={"started_at": d1, "logged_exercises": []}, headers=headers)
        client.post("/api/v1/workout/logs", json={"started_at": d2, "logged_exercises": []}, headers=headers)

        res = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers)
        assert res.status_code == 200
        # 2 / 4 = 50.0%
        assert res.json()["workout_adherence_pct"] == 50.0

    def test_no_meal_days_fallback_50(self):
        headers = get_auth_headers("nomealuser@example.com")
        res = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers)
        assert res.status_code == 200
        assert res.json()["nutrition_score"] == 50.0
        assert res.json()["protein_score"] == 50.0

    def test_recovery_and_sleep_always_75(self):
        headers = get_auth_headers("recuser@example.com")
        res = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers)
        assert res.status_code == 200
        assert res.json()["sleep_score"] == 75.0
        assert res.json()["recovery_score"] == 75.0

    def test_score_clamping_boundaries(self):
        headers = get_auth_headers("clampuser@example.com")
        res = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers)
        assert res.status_code == 200
        score = res.json()["score"]
        assert isinstance(score, int)
        assert 0 <= score <= 100

    def test_upsert_same_period(self):
        headers = get_auth_headers("upsertuser@example.com")
        t_date = date.today().isoformat()

        res1 = client.post(f"/api/v1/progress/fitness-score/recalculate?target_date={t_date}", headers=headers)
        assert res1.status_code == 200
        id1 = res1.json()["id"]

        # Recalculate again for same target date
        res2 = client.post(f"/api/v1/progress/fitness-score/recalculate?target_date={t_date}", headers=headers)
        assert res2.status_code == 200
        id2 = res2.json()["id"]

        # Assert same record was updated (UPSERT) instead of creating duplicate
        assert id1 == id2

    def test_user_isolation_idor_prevention(self):
        headers_a = get_auth_headers("user_a@example.com")
        res_a = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers_a)
        assert res_a.status_code == 200
        id_a = res_a.json()["id"]

        headers_b = get_auth_headers("user_b@example.com")
        res_b = client.get("/api/v1/progress/fitness-score", headers=headers_b)
        assert res_b.status_code == 200
        b_current = res_b.json()["current_score"]

        # User B's score ID must NOT match User A's score ID
        assert b_current["id"] != id_a

    def test_explicit_target_date(self):
        headers = get_auth_headers("targetdateuser@example.com")
        t_str = "2026-08-10"
        res = client.get(f"/api/v1/progress/fitness-score?target_date={t_str}", headers=headers)
        assert res.status_code == 200
        current = res.json()["current_score"]
        assert current["period_end"] == t_str
        assert current["period_start"] == "2026-08-04"

    def test_consistency_distinct_active_dates(self):
        headers = get_auth_headers("consistuser@example.com")
        today = date.today()

        # Day 1: Workout
        d1 = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        client.post("/api/v1/workout/logs", json={"started_at": d1, "logged_exercises": []}, headers=headers)

        # Day 2: Measurement
        d2 = (today - timedelta(days=1)).isoformat()
        client.post("/api/v1/progress/measurements", json={"measured_at": d2, "weight_kg": 75.0}, headers=headers)

        res = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers)
        assert res.status_code == 200
        # 2 distinct active logging days out of 7 = 2/7 * 100 = 28.57%
        assert res.json()["consistency_score"] == 28.57

    def test_user_isolation_recalculate_prevention(self):
        headers_a = get_auth_headers("recalc_a@example.com")
        res_a = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers_a)
        assert res_a.status_code == 200
        id_a = res_a.json()["id"]

        headers_b = get_auth_headers("recalc_b@example.com")
        res_b = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers_b)
        assert res_b.status_code == 200
        id_b = res_b.json()["id"]

        # Assert User B's recalculation produces User B's record, not User A's record
        assert id_b != id_a

    def test_zero_protein_target_no_division_by_zero(self):
        headers = get_auth_headers("zerodivuser@example.com")
        res = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers)
        assert res.status_code == 200
        assert res.json()["protein_score"] == 50.0

    def test_nutrition_adherence_logged_days_only(self):
        headers = get_auth_headers("mealdaysuser@example.com")
        # Log a meal today
        dt = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc).isoformat()
        # Seed food
        foods_res = client.get("/api/v1/foods", headers=headers)
        assert foods_res.status_code == 200
        food_id = foods_res.json()[0]["id"]

        log_res = client.post(
            "/api/v1/nutrition/log",
            json={
                "meal_type": "lunch",
                "logged_at": dt,
                "items": [{"food_id": food_id, "quantity_grams": 200.0}],
            },
            headers=headers,
        )
        assert log_res.status_code == 201

        res = client.post("/api/v1/progress/fitness-score/recalculate", headers=headers)
        assert res.status_code == 200
        # Meal logged on 1 day: nutrition and protein scores are evaluated for that day
        assert res.json()["nutrition_score"] is not None
        assert res.json()["protein_score"] is not None

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


    def test_report_generation_does_not_mutate_fitness_score_records(self):
        headers = get_auth_headers("report_sideeffect_user@example.com")
        from tests.conftest import TestingSessionLocal
        from app.models.user import User
        from app.models.fitness_score import FitnessScore

        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == "report_sideeffect_user@example.com").first()
            initial_count = db.query(FitnessScore).filter(FitnessScore.user_id == user.id).count()

            # Request weekly and monthly reports
            res_w = client.get("/api/v1/reports/weekly?date=2026-08-19", headers=headers)
            assert res_w.status_code == 200

            res_m = client.get("/api/v1/reports/monthly?date=2026-08-19", headers=headers)
            assert res_m.status_code == 200

            # Verify score count remained unchanged (0 side-effect commits!)
            final_count = db.query(FitnessScore).filter(FitnessScore.user_id == user.id).count()
            assert final_count == initial_count
        finally:
            db.close()

    def test_sleep_and_recovery_score_fallback_constants(self):
        from app.services.fitness_score_service import (
            FitnessScoreService,
            DEFAULT_SLEEP_SCORE_FALLBACK,
            DEFAULT_RECOVERY_SCORE_FALLBACK,
        )
        from tests.conftest import TestingSessionLocal
        from app.models.user import User

        assert DEFAULT_SLEEP_SCORE_FALLBACK == 75.0
        assert DEFAULT_RECOVERY_SCORE_FALLBACK == 75.0

        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == "zerouser@example.com").first()
            if user:
                item = FitnessScoreService.calculate_fitness_score(db, user)
                assert item.sleep_score == DEFAULT_SLEEP_SCORE_FALLBACK
                assert item.recovery_score == DEFAULT_RECOVERY_SCORE_FALLBACK
        finally:
            db.close()
