import pytest
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

        # Create goal
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

        # Fetch active goal
        res_get_active = client.get("/api/v1/goals", headers=headers)
        assert res_get_active.status_code == 200
        assert res_get_active.json()["goal_type"] == "muscle_gain"

    def test_invalid_goal_type_validation(self):
        headers = get_auth_headers("invalidgoal@example.com")
        res = client.post("/api/v1/goals", json={"goal_type": "super_shred"}, headers=headers)
        assert res.status_code == 422
