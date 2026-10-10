import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_headers(email: str = "goaluser@example.com", password: str = "Password123!"):
    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestGoalsAPI:
    def test_unauthenticated_goal_access(self):
        res = client.get("/api/v1/goals")
        assert res.status_code == 401

        res_post = client.post("/api/v1/goals", json={"goal_type": "weight_loss"})
        assert res_post.status_code == 401

    def test_create_and_fetch_active_goal(self):
        headers = get_auth_headers("goaltest@example.com")

        # Initial fetch -> null
        res_get = client.get("/api/v1/goals", headers=headers)
        assert res_get.status_code == 200
        assert res_get.json() is None

        # User currently has baseline weight (e.g. 80.0 kg from profile)
        client.put("/api/v1/profile", json={"weight_kg": 80.0}, headers=headers)

        # Create muscle_gain goal with target >= current weight
        payload = {
            "goal_type": "muscle_gain",
            "target_weight_kg": 85.0,
            "target_date": "2026-12-31",
        }
        res_post = client.post("/api/v1/goals", json=payload, headers=headers)
        assert res_post.status_code == 201
        data = res_post.json()
        assert data["goal_type"] == "muscle_gain"
        assert float(data["target_weight_kg"]) == 85.0
        assert data["is_active"] is True
        assert data["has_goal_conflict"] is False

        # Fetch active goal
        res_get_active = client.get("/api/v1/goals", headers=headers)
        assert res_get_active.status_code == 200
        assert res_get_active.json()["goal_type"] == "muscle_gain"
        assert res_get_active.json()["has_goal_conflict"] is False

    def test_invalid_goal_type_validation(self):
        headers = get_auth_headers("invalidgoal@example.com")
        res = client.post("/api/v1/goals", json={"goal_type": "super_shred"}, headers=headers)
        assert res.status_code == 422

    def test_fat_loss_requires_target_below_current_weight(self):
        # Fixes D1: Fat loss with target >= current weight must return 422
        headers = get_auth_headers("fatloss_conflict@example.com")
        client.put("/api/v1/profile", json={"weight_kg": 80.0}, headers=headers)

        # Conflict 1: target > current weight
        res = client.post("/api/v1/goals", json={"goal_type": "fat_loss", "target_weight_kg": 85.0}, headers=headers)
        assert res.status_code == 422
        assert "less than current weight" in res.json()["detail"].lower()

        # Conflict 2: target == current weight
        res_eq = client.post("/api/v1/goals", json={"goal_type": "weight_loss", "target_weight_kg": 80.0}, headers=headers)
        assert res_eq.status_code == 422

        # Valid: target < current weight
        res_valid = client.post("/api/v1/goals", json={"goal_type": "fat_loss", "target_weight_kg": 75.0}, headers=headers)
        assert res_valid.status_code == 201
        assert res_valid.json()["has_goal_conflict"] is False

    def test_muscle_gain_requires_target_at_or_above_current_weight(self):
        # Fixes D1: Muscle gain with target < current weight must return 422
        headers = get_auth_headers("musclegain_conflict@example.com")
        client.put("/api/v1/profile", json={"weight_kg": 80.0}, headers=headers)

        res = client.post("/api/v1/goals", json={"goal_type": "muscle_gain", "target_weight_kg": 75.0}, headers=headers)
        assert res.status_code == 422
        assert "greater than or equal to current weight" in res.json()["detail"].lower()

        # Valid: target >= current weight
        res_valid = client.post("/api/v1/goals", json={"goal_type": "muscle_gain", "target_weight_kg": 82.0}, headers=headers)
        assert res_valid.status_code == 201
        assert res_valid.json()["has_goal_conflict"] is False

    def test_maintenance_target_weight_tolerance(self):
        # Maintenance target weight must be within 1.5 kg of current weight
        headers = get_auth_headers("maintain_tolerance@example.com")
        client.put("/api/v1/profile", json={"weight_kg": 75.0}, headers=headers)

        # > 1.5 kg away -> 422
        res_far = client.post("/api/v1/goals", json={"goal_type": "maintenance", "target_weight_kg": 78.0}, headers=headers)
        assert res_far.status_code == 422
        assert "within 1.5 kg" in res_far.json()["detail"].lower()

        # <= 1.5 kg away -> 201
        res_ok = client.post("/api/v1/goals", json={"goal_type": "maintenance", "target_weight_kg": 75.5}, headers=headers)
        assert res_ok.status_code == 201

    def test_non_blocking_has_goal_conflict_flag_for_legacy_data(self):
        # Pre-existing goal in DB that contradicts current weight reports has_goal_conflict: true without blocking read
        headers = get_auth_headers("legacy_conflict_flag@example.com")
        from tests.conftest import TestingSessionLocal
        from app.models.user import User
        from app.models.goal import Goal
        from app.models.profile import Profile

        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == "legacy_conflict_flag@example.com").first()
            profile = db.query(Profile).filter(Profile.user_id == user.id).first()
            profile.weight_kg = 80.9
            # Insert direct contradictory goal (muscle gain at 78.5 kg from finding D1)
            direct_goal = Goal(
                user_id=user.id,
                goal_type="muscle_gain",
                target_weight_kg=78.5,
                is_active=True,
            )
            db.add(direct_goal)
            db.commit()
        finally:
            db.close()

        res = client.get("/api/v1/goals", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["has_goal_conflict"] is True
        assert data["conflict_reason"] is not None
        assert "greater than or equal to current weight" in data["conflict_reason"].lower()
