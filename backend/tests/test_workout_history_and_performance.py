from datetime import datetime, timezone
import pytest
from app.models.workout import WorkoutLog, WorkoutLogExercise, Exercise
from app.services.exercise_service import ExerciseService
from tests.test_workout import get_auth_headers, client
from tests.conftest import TestingSessionLocal
from app.models.user import User


class TestWorkoutHistoryAndPerformance:
    def setup_method(self):
        self.headers = get_auth_headers("perfuser@example.com")
        client.post("/api/v1/exercises/seed", headers=self.headers)
        ex_res = client.get("/api/v1/exercises?search=Barbell+Bench+Press", headers=self.headers)
        assert ex_res.status_code == 200
        self.bench_id = ex_res.json()[0]["id"]

        squat_res = client.get("/api/v1/exercises?search=Barbell+Squat", headers=self.headers)
        assert squat_res.status_code == 200
        self.squat_id = squat_res.json()[0]["id"]

    def test_computed_log_metrics_and_prs(self):
        """Workout logs must have duration_seconds, total_volume_kg, total_sets_completed, and PR flags computed."""
        # 1. Log first session (sets: 80kg x 8, 80kg x 8 -> 1280kg volume)
        payload_1 = {
            "notes": "Chest Day 1",
            "started_at": "2026-10-10T10:00:00Z",
            "ended_at": "2026-10-10T10:45:00Z",
            "logged_exercises": [
                {
                    "exercise_id": self.bench_id,
                    "set_number": 1,
                    "reps_completed": 8,
                    "weight_kg": 80.0,
                    "rpe": 8,
                },
                {
                    "exercise_id": self.bench_id,
                    "set_number": 2,
                    "reps_completed": 8,
                    "weight_kg": 80.0,
                    "rpe": 8,
                },
            ],
        }
        res_1 = client.post("/api/v1/workout/sessions", json=payload_1, headers=self.headers)
        assert res_1.status_code == 201
        data_1 = res_1.json()

        assert data_1["duration_seconds"] == 2700  # 45 mins
        assert data_1["total_volume_kg"] == 1280.0
        assert data_1["total_sets_completed"] == 2
        # First session sets are all PRs
        assert data_1["logged_exercises"][0]["is_personal_record"] is True

        # 2. Log second session with lower weight (70kg x 8)
        payload_2 = {
            "notes": "Chest Day 2",
            "started_at": "2026-10-11T10:00:00Z",
            "ended_at": "2026-10-11T10:30:00Z",
            "logged_exercises": [
                {
                    "exercise_id": self.bench_id,
                    "set_number": 1,
                    "reps_completed": 8,
                    "weight_kg": 70.0,
                    "rpe": 7,
                },
            ],
        }
        res_2 = client.post("/api/v1/workout/sessions", json=payload_2, headers=self.headers)
        assert res_2.status_code == 201
        data_2 = res_2.json()
        assert data_2["duration_seconds"] == 1800  # 30 mins
        assert data_2["total_volume_kg"] == 560.0
        assert data_2["total_sets_completed"] == 1
        assert data_2["logged_exercises"][0]["is_personal_record"] is False

        # 3. Log third session beating max weight (85kg x 5 -> new PR!)
        payload_3 = {
            "notes": "Chest Day 3",
            "started_at": "2026-10-12T10:00:00Z",
            "ended_at": "2026-10-12T10:30:00Z",
            "logged_exercises": [
                {
                    "exercise_id": self.bench_id,
                    "set_number": 1,
                    "reps_completed": 5,
                    "weight_kg": 85.0,
                    "rpe": 9,
                },
            ],
        }
        res_3 = client.post("/api/v1/workout/sessions", json=payload_3, headers=self.headers)
        assert res_3.status_code == 201
        data_3 = res_3.json()
        assert data_3["logged_exercises"][0]["is_personal_record"] is True

    def test_last_performance_endpoint(self):
        """GET /api/v1/workout/last-performance returns the latest sets per exercise."""
        # Log session with bench and squat
        payload = {
            "notes": "Full Body Baseline",
            "started_at": "2026-10-10T12:00:00Z",
            "ended_at": "2026-10-10T12:50:00Z",
            "logged_exercises": [
                {
                    "exercise_id": self.bench_id,
                    "set_number": 1,
                    "reps_completed": 10,
                    "weight_kg": 75.5,
                    "rpe": 7,
                },
                {
                    "exercise_id": self.bench_id,
                    "set_number": 2,
                    "reps_completed": 8,
                    "weight_kg": 82.5,
                    "rpe": 8,
                },
                {
                    "exercise_id": self.squat_id,
                    "set_number": 1,
                    "reps_completed": 5,
                    "weight_kg": 100.0,
                    "rpe": 8,
                },
            ],
        }
        client.post("/api/v1/workout/sessions", json=payload, headers=self.headers)

        # Query last performance
        res = client.get(
            f"/api/v1/workout/last-performance?exercise_ids={self.bench_id}&exercise_ids={self.squat_id}",
            headers=self.headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert "performances" in data
        assert str(self.bench_id) in data["performances"]
        assert str(self.squat_id) in data["performances"]

        bench_perf = data["performances"][str(self.bench_id)]
        assert bench_perf["exercise_id"] == str(self.bench_id)
        assert len(bench_perf["sets"]) == 2
        assert bench_perf["sets"][0]["weight_kg"] == 75.5
        assert bench_perf["sets"][0]["reps_completed"] == 10
        assert bench_perf["sets"][1]["weight_kg"] == 82.5

        squat_perf = data["performances"][str(self.squat_id)]
        assert len(squat_perf["sets"]) == 1
        assert squat_perf["sets"][0]["weight_kg"] == 100.0

    def test_user_isolation_on_last_performance(self):
        """User B cannot see User A's last performance data."""
        # User A logs bench
        payload = {
            "notes": "User A Bench",
            "started_at": "2026-10-10T12:00:00Z",
            "ended_at": "2026-10-10T12:40:00Z",
            "logged_exercises": [
                {
                    "exercise_id": self.bench_id,
                    "set_number": 1,
                    "reps_completed": 10,
                    "weight_kg": 95.0,
                    "rpe": 9,
                },
            ],
        }
        client.post("/api/v1/workout/sessions", json=payload, headers=self.headers)

        # User B queries last performance for bench
        user_b_headers = get_auth_headers("user_b_perf@example.com")
        res_b = client.get(
            f"/api/v1/workout/last-performance?exercise_ids={self.bench_id}",
            headers=user_b_headers,
        )
        assert res_b.status_code == 200
        data_b = res_b.json()
        assert str(self.bench_id) not in data_b["performances"]
