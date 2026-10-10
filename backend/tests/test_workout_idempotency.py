import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.main import app
from app.core.idempotency import (
    normalize_weight,
    compute_request_fingerprint,
    validate_idempotency_key,
    build_canonical_payload,
)
from app.models.workout import WorkoutLog, Exercise
from app.schemas.workout import WorkoutLogCreate, WorkoutLogExerciseCreate
from app.services.workout_service import WorkoutService


def get_auth_headers(client: TestClient, email: str, password: str = "Password123!"):
    client.post("/api/v1/auth/register", json={"email": email, "password": password})
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_test_exercise(client: TestClient, headers: dict) -> str:
    seed_res = client.post("/api/v1/exercises/seed", headers=headers)
    assert seed_res.status_code == 201
    exercises = client.get("/api/v1/exercises", headers=headers).json()
    return exercises[0]["id"]


class TestWorkoutIdempotencyAPI:
    def test_first_keyed_submission_returns_201_without_replay_header(self, client: TestClient):
        headers = get_auth_headers(client, "key_user1@example.com")
        ex_id = create_test_exercise(client, headers)
        now_start = datetime.now(timezone.utc).isoformat()
        now_end = datetime.now(timezone.utc).isoformat()
        key = str(uuid.uuid4())

        payload = {
            "started_at": now_start,
            "ended_at": now_end,
            "notes": "Session 1",
            "logged_exercises": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "reps_completed": 10,
                    "weight_kg": 80.505,
                }
            ],
        }

        res = client.post(
            "/api/v1/workout/logs",
            json=payload,
            headers={**headers, "Idempotency-Key": key},
        )
        assert res.status_code == 201
        assert "X-Idempotency-Replay" not in res.headers
        data = res.json()
        assert data["notes"] == "Session 1"
        assert float(data["logged_exercises"][0]["weight_kg"]) == 80.51

    def test_identical_retry_returns_200_with_replay_header_and_identical_body(self, client: TestClient):
        headers = get_auth_headers(client, "key_user2@example.com")
        ex_id = create_test_exercise(client, headers)
        now_start = datetime.now(timezone.utc).isoformat()
        now_end = datetime.now(timezone.utc).isoformat()
        key = f"key-retry-{uuid.uuid4()}"

        payload = {
            "started_at": now_start,
            "ended_at": now_end,
            "notes": "Identical Retry Test",
            "logged_exercises": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "reps_completed": 12,
                    "weight_kg": 60.0,
                }
            ],
        }

        # First request -> 201 Created
        res1 = client.post(
            "/api/v1/workout/logs",
            json=payload,
            headers={**headers, "Idempotency-Key": key},
        )
        assert res1.status_code == 201
        assert "X-Idempotency-Replay" not in res1.headers
        log1 = res1.json()

        # Identical retry -> 200 OK + X-Idempotency-Replay: true
        res2 = client.post(
            "/api/v1/workout/logs",
            json=payload,
            headers={**headers, "Idempotency-Key": key},
        )
        assert res2.status_code == 200
        assert res2.headers.get("X-Idempotency-Replay") == "true"
        log2 = res2.json()

        # Response bodies must be identical
        assert log1["id"] == log2["id"]
        assert log1["notes"] == log2["notes"]
        assert log1["started_at"] == log2["started_at"]
        assert log1["ended_at"] == log2["ended_at"]
        assert len(log1["logged_exercises"]) == len(log2["logged_exercises"])

    def test_mismatched_payload_same_key_returns_409_conflict(self, client: TestClient):
        headers = get_auth_headers(client, "key_user3@example.com")
        ex_id = create_test_exercise(client, headers)
        now_start = datetime.now(timezone.utc).isoformat()
        now_end = datetime.now(timezone.utc).isoformat()
        key = f"key-conflict-{uuid.uuid4()}"

        payload1 = {
            "started_at": now_start,
            "ended_at": now_end,
            "notes": "Original session",
            "logged_exercises": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "reps_completed": 10,
                    "weight_kg": 50.0,
                }
            ],
        }

        # 1st request -> 201
        res1 = client.post(
            "/api/v1/workout/logs",
            json=payload1,
            headers={**headers, "Idempotency-Key": key},
        )
        assert res1.status_code == 201

        # 2nd request with changed notes -> 409 Conflict
        payload2 = dict(payload1)
        payload2["notes"] = "Changed session notes"
        res2 = client.post(
            "/api/v1/workout/logs",
            json=payload2,
            headers={**headers, "Idempotency-Key": key},
        )
        assert res2.status_code == 409
        err = res2.json()
        assert err["detail"]["code"] == "idempotency_key_reused"

        # 3rd request with changed reps -> 409 Conflict
        payload3 = dict(payload1)
        payload3["logged_exercises"] = [
            {
                "exercise_id": ex_id,
                "set_number": 1,
                "reps_completed": 15,
                "weight_kg": 50.0,
            }
        ]
        res3 = client.post(
            "/api/v1/workout/logs",
            json=payload3,
            headers={**headers, "Idempotency-Key": key},
        )
        assert res3.status_code == 409
        assert res3.json()["detail"]["code"] == "idempotency_key_reused"

    def test_keyed_submission_missing_ended_at_returns_422(self, client: TestClient):
        headers = get_auth_headers(client, "key_user4@example.com")
        ex_id = create_test_exercise(client, headers)
        key = f"key-missing-end-{uuid.uuid4()}"

        payload = {
            "started_at": datetime.now(timezone.utc).isoformat(),
            # ended_at omitted
            "notes": "Missing ended_at",
            "logged_exercises": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "reps_completed": 8,
                    "weight_kg": 40.0,
                }
            ],
        }

        res = client.post(
            "/api/v1/workout/logs",
            json=payload,
            headers={**headers, "Idempotency-Key": key},
        )
        assert res.status_code == 422
        assert "ended_at is required" in res.json()["detail"]

    def test_invalid_idempotency_key_headers_return_422(self, client: TestClient):
        headers = get_auth_headers(client, "key_user5@example.com")
        ex_id = create_test_exercise(client, headers)
        now_start = datetime.now(timezone.utc).isoformat()
        now_end = datetime.now(timezone.utc).isoformat()

        payload = {
            "started_at": now_start,
            "ended_at": now_end,
            "notes": "Testing invalid keys",
            "logged_exercises": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "reps_completed": 8,
                    "weight_kg": 40.0,
                }
            ],
        }

        # Whitespace-only key
        res_ws = client.post(
            "/api/v1/workout/logs",
            json=payload,
            headers={**headers, "Idempotency-Key": "   "},
        )
        assert res_ws.status_code == 422
        assert "empty or whitespace" in res_ws.json()["detail"]

        # Empty string key
        res_empty = client.post(
            "/api/v1/workout/logs",
            json=payload,
            headers={**headers, "Idempotency-Key": ""},
        )
        assert res_empty.status_code == 422
        assert "empty or whitespace" in res_empty.json()["detail"]

        # Over 128 chars key
        too_long_key = "a" * 129
        res_long = client.post(
            "/api/v1/workout/logs",
            json=payload,
            headers={**headers, "Idempotency-Key": too_long_key},
        )
        assert res_long.status_code == 422
        assert "128 characters" in res_long.json()["detail"]

    def test_legacy_unkeyed_submission_behavior(self, client: TestClient):
        headers = get_auth_headers(client, "key_user6@example.com")
        ex_id = create_test_exercise(client, headers)
        now_start = datetime.now(timezone.utc).isoformat()

        # Unkeyed submit without ended_at -> succeeds with 201 (backend defaults ended_at to now)
        payload_no_end = {
            "started_at": now_start,
            "notes": "Unkeyed ongoing workout",
            "logged_exercises": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "reps_completed": 10,
                    "weight_kg": 45.0,
                }
            ],
        }

        res1 = client.post("/api/v1/workout/logs", json=payload_no_end, headers=headers)
        assert res1.status_code == 201
        assert "X-Idempotency-Replay" not in res1.headers
        log1 = res1.json()
        assert log1["started_at"] is not None

        # Another unkeyed submit with ended_at -> succeeds with 201
        now_end = datetime.now(timezone.utc).isoformat()
        payload_with_end = {
            "started_at": now_start,
            "ended_at": now_end,
            "notes": "Unkeyed completed workout",
            "logged_exercises": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "reps_completed": 10,
                    "weight_kg": 45.0,
                }
            ],
        }

        res2 = client.post("/api/v1/workout/logs", json=payload_with_end, headers=headers)
        assert res2.status_code == 201
        assert "X-Idempotency-Replay" not in res2.headers

    def test_user_isolation_same_idempotency_key(self, client: TestClient):
        headers_a = get_auth_headers(client, "user_iso_a@example.com")
        headers_b = get_auth_headers(client, "user_iso_b@example.com")
        ex_id_a = create_test_exercise(client, headers_a)
        ex_id_b = create_test_exercise(client, headers_b)

        shared_key = f"isolated-shared-key-{uuid.uuid4()}"
        now_start = datetime.now(timezone.utc).isoformat()
        now_end = datetime.now(timezone.utc).isoformat()

        payload_a = {
            "started_at": now_start,
            "ended_at": now_end,
            "notes": "User A session",
            "logged_exercises": [
                {
                    "exercise_id": ex_id_a,
                    "set_number": 1,
                    "reps_completed": 10,
                    "weight_kg": 50.0,
                }
            ],
        }

        payload_b = {
            "started_at": now_start,
            "ended_at": now_end,
            "notes": "User B session",
            "logged_exercises": [
                {
                    "exercise_id": ex_id_b,
                    "set_number": 1,
                    "reps_completed": 12,
                    "weight_kg": 60.0,
                }
            ],
        }

        # User A logs with shared_key -> 201
        res_a = client.post(
            "/api/v1/workout/logs",
            json=payload_a,
            headers={**headers_a, "Idempotency-Key": shared_key},
        )
        assert res_a.status_code == 201

        # User B logs with identical shared_key -> 201 (isolated by user_id!)
        res_b = client.post(
            "/api/v1/workout/logs",
            json=payload_b,
            headers={**headers_b, "Idempotency-Key": shared_key},
        )
        assert res_b.status_code == 201
        assert res_a.json()["id"] != res_b.json()["id"]


class TestCanonicalisationAndFingerprint:
    def test_weight_normalization_half_up(self):
        assert normalize_weight(80.504) == "80.50"
        assert normalize_weight(80.505) == "80.51"
        assert normalize_weight(80.506) == "80.51"
        assert normalize_weight("80.504") == "80.50"
        assert normalize_weight("80.505") == "80.51"
        assert normalize_weight("80.506") == "80.51"
        assert normalize_weight(None) is None
        assert normalize_weight(70) == "70.00"

    def test_exercise_order_permutation_invariance(self):
        ex1 = uuid.uuid4()
        ex2 = uuid.uuid4()
        now_start = datetime(2026, 10, 10, 10, 0, 0, tzinfo=timezone.utc)
        now_end = datetime(2026, 10, 10, 11, 0, 0, tzinfo=timezone.utc)

        p1 = WorkoutLogCreate(
            started_at=now_start,
            ended_at=now_end,
            notes="Legs",
            logged_exercises=[
                WorkoutLogExerciseCreate(exercise_id=ex1, set_number=1, reps_completed=10, weight_kg=50.0),
                WorkoutLogExerciseCreate(exercise_id=ex2, set_number=1, reps_completed=8, weight_kg=70.0),
            ],
        )

        p2 = WorkoutLogCreate(
            started_at=now_start,
            ended_at=now_end,
            notes="Legs",
            logged_exercises=[
                WorkoutLogExerciseCreate(exercise_id=ex2, set_number=1, reps_completed=8, weight_kg=70.0),
                WorkoutLogExerciseCreate(exercise_id=ex1, set_number=1, reps_completed=10, weight_kg=50.0),
            ],
        )

        fp1, _ = compute_request_fingerprint(p1)
        fp2, _ = compute_request_fingerprint(p2)
        assert fp1 == fp2

    def test_set_order_permutation_invariance(self):
        ex1 = uuid.uuid4()
        now_start = datetime(2026, 10, 10, 10, 0, 0, tzinfo=timezone.utc)
        now_end = datetime(2026, 10, 10, 11, 0, 0, tzinfo=timezone.utc)

        p1 = WorkoutLogCreate(
            started_at=now_start,
            ended_at=now_end,
            notes="Chest",
            logged_exercises=[
                WorkoutLogExerciseCreate(exercise_id=ex1, set_number=1, reps_completed=10, weight_kg=60.0),
                WorkoutLogExerciseCreate(exercise_id=ex1, set_number=2, reps_completed=8, weight_kg=65.0),
            ],
        )

        p2 = WorkoutLogCreate(
            started_at=now_start,
            ended_at=now_end,
            notes="Chest",
            logged_exercises=[
                WorkoutLogExerciseCreate(exercise_id=ex1, set_number=2, reps_completed=8, weight_kg=65.0),
                WorkoutLogExerciseCreate(exercise_id=ex1, set_number=1, reps_completed=10, weight_kg=60.0),
            ],
        )

        fp1, _ = compute_request_fingerprint(p1)
        fp2, _ = compute_request_fingerprint(p2)
        assert fp1 == fp2

    def test_notes_distinction_none_empty_spaces_and_text(self):
        ex1 = uuid.uuid4()
        now_start = datetime(2026, 10, 10, 10, 0, 0, tzinfo=timezone.utc)
        now_end = datetime(2026, 10, 10, 11, 0, 0, tzinfo=timezone.utc)

        variants = [
            None,
            "",
            "   ",
            "Morning Session",
            "morning session",
        ]

        fingerprints = set()
        for note in variants:
            p = WorkoutLogCreate(
                started_at=now_start,
                ended_at=now_end,
                notes=note,
                logged_exercises=[
                    WorkoutLogExerciseCreate(exercise_id=ex1, set_number=1, reps_completed=10, weight_kg=60.0),
                ],
            )
            fp, _ = compute_request_fingerprint(p)
            fingerprints.add(fp)

        # All 5 variants must produce distinct fingerprints (including case sensitivity)
        assert len(fingerprints) == len(variants)

    def test_notes_preserved_verbatim_in_canonical_payload(self):
        now_start = datetime(2026, 10, 10, 10, 0, 0, tzinfo=timezone.utc)
        p = WorkoutLogCreate(
            started_at=now_start,
            ended_at=now_start,
            notes="  Preserve EXACT Casing & Whitespace  ",
            logged_exercises=[],
        )
        canonical = build_canonical_payload(p)
        assert canonical["notes"] == "  Preserve EXACT Casing & Whitespace  "


class TestRaceConditionRecovery:
    def test_race_condition_concurrent_insert_recovers_winner(self, client: TestClient, monkeypatch):
        from sqlalchemy.orm import Query
        headers = get_auth_headers(client, "race_user@example.com")
        ex_id = create_test_exercise(client, headers)
        key = f"race-key-{uuid.uuid4()}"
        now_start = datetime.now(timezone.utc).isoformat()
        now_end = datetime.now(timezone.utc).isoformat()

        payload = {
            "started_at": now_start,
            "ended_at": now_end,
            "notes": "Simulated Race Workout",
            "logged_exercises": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "reps_completed": 10,
                    "weight_kg": 75.0,
                }
            ],
        }

        # First, submit normally so there is a winner in DB
        res1 = client.post(
            "/api/v1/workout/logs",
            json=payload,
            headers={**headers, "Idempotency-Key": key},
        )
        assert res1.status_code == 201
        winner_id = res1.json()["id"]

        # Now simulate a concurrent race condition where the initial lookup did NOT see the record
        # (e.g. concurrent thread was in flight before winner was committed).
        # During commit, SQLite's unique constraint uq_workout_logs_user_idempotency fires,
        # triggering IntegrityError.
        lookup_done = [False]
        orig_first = Query.first
        rollback_called = []
        orig_rollback = Session.rollback

        def mock_rollback(self):
            rollback_called.append(True)
            return orig_rollback(self)

        def mock_first(self):
            statement_str = str(self.statement.compile()) if hasattr(self, "statement") else ""
            if not lookup_done[0] and "idempotency_key" in statement_str:
                lookup_done[0] = True
                return None  # Initial check sees no existing record
            return orig_first(self)

        monkeypatch.setattr(Query, "first", mock_first)
        monkeypatch.setattr(Session, "rollback", mock_rollback)

        res2 = client.post(
            "/api/v1/workout/logs",
            json=payload,
            headers={**headers, "Idempotency-Key": key},
        )
        assert res2.status_code == 200
        assert res2.headers.get("X-Idempotency-Replay") == "true"
        assert res2.json()["id"] == winner_id
        # Verify db.rollback was executed before the recovery query
        assert len(rollback_called) >= 1

    def test_non_idempotency_integrity_error_reraised(self, client: TestClient, monkeypatch):
        headers = get_auth_headers(client, "fk_err_user@example.com")
        ex_id = create_test_exercise(client, headers)
        key = f"fk-key-{uuid.uuid4()}"
        now_start = datetime.now(timezone.utc).isoformat()
        now_end = datetime.now(timezone.utc).isoformat()

        payload = {
            "started_at": now_start,
            "ended_at": now_end,
            "notes": "FK error test",
            "logged_exercises": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "reps_completed": 10,
                    "weight_kg": 75.0,
                }
            ],
        }

        def failing_commit(self):
            raise IntegrityError(
                statement="INSERT INTO workout_logs ...",
                params={},
                orig=Exception("FOREIGN KEY constraint failed on foreign_table_id"),
            )

        monkeypatch.setattr(Session, "commit", failing_commit)

        # Integrity error unrelated to idempotency key should raise 500 / re-raise IntegrityError
        with pytest.raises(IntegrityError):
            client.post(
                "/api/v1/workout/logs",
                json=payload,
                headers={**headers, "Idempotency-Key": key},
            )


class TestCORSConfiguration:
    def test_cors_preflight_headers_and_exposure(self, client: TestClient):
        # OPTIONS preflight check: browser checks Access-Control-Allow-Headers
        res_opt = client.options(
            "/api/v1/workout/logs",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Idempotency-Key,Content-Type",
            },
        )
        assert res_opt.status_code == 200
        allowed_headers = res_opt.headers.get("Access-Control-Allow-Headers", "")
        assert "Idempotency-Key" in allowed_headers or "idempotency-key" in allowed_headers.lower()

        # Actual request check: browser receives Access-Control-Expose-Headers
        res_post = client.post(
            "/api/v1/workout/logs",
            headers={
                "Origin": "http://localhost:5173",
            },
        )
        exposed_headers = res_post.headers.get("Access-Control-Expose-Headers", "")
        assert "X-Idempotency-Replay" in exposed_headers or "x-idempotency-replay" in exposed_headers.lower()
