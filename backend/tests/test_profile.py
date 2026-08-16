import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_headers(email: str = "profileuser@example.com", password: str = "Password123!"):
    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestProfileAuthentication:
    def test_unauthenticated_profile_access(self):
        res = client.get("/api/v1/profile")
        assert res.status_code == 401

        res_onboard = client.post("/api/v1/profile/onboarding", json={"height_cm": 175.0})
        assert res_onboard.status_code == 401

    def test_authenticated_profile_retrieval(self):
        headers = get_auth_headers("user1@example.com")
        res = client.get("/api/v1/profile", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["onboarding_complete"] is False
        assert data["full_name"] == "User1"


class TestOnboardingPersistence:
    def test_complete_onboarding_submission(self):
        headers = get_auth_headers("onboarder@example.com")
        onboarding_payload = {
            "full_name": "Athlete Alex",
            "gender": "male",
            "height_cm": 182.5,
            "weight_kg": 78.5,
            "activity_level": "very_active",
            "diet_preference": "omnivore",
            "equipment": ["dumbbells", "barbell", "pull-up bar"],
            "medical_notes": "None",
        }

        res = client.post("/api/v1/profile/onboarding", json=onboarding_payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["onboarding_complete"] is True
        assert data["full_name"] == "Athlete Alex"
        assert data["gender"] == "male"
        assert float(data["height_cm"]) == 182.5
        assert float(data["weight_kg"]) == 78.5
        assert data["activity_level"] == "very_active"
        assert data["equipment"] == ["dumbbells", "barbell", "pull-up bar"]

    def test_repeated_onboarding_submission_is_idempotent(self):
        headers = get_auth_headers("idempotent@example.com")
        payload1 = {"full_name": "Initial Name", "height_cm": 170.0}
        res1 = client.post("/api/v1/profile/onboarding", json=payload1, headers=headers)
        assert res1.status_code == 200
        assert res1.json()["onboarding_complete"] is True

        payload2 = {"full_name": "Updated Name", "height_cm": 172.0}
        res2 = client.post("/api/v1/profile/onboarding", json=payload2, headers=headers)
        assert res2.status_code == 200
        data = res2.json()
        assert data["onboarding_complete"] is True
        assert data["full_name"] == "Updated Name"
        assert float(data["height_cm"]) == 172.0

    def test_profile_update(self):
        headers = get_auth_headers("updateuser@example.com")
        update_payload = {"diet_preference": "vegan", "activity_level": "moderate"}
        res = client.put("/api/v1/profile", json=update_payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["diet_preference"] == "vegan"
        assert data["activity_level"] == "moderate"


class TestAuthorizationAndValidation:
    def test_users_cannot_access_other_profiles(self):
        headers1 = get_auth_headers("usera@example.com")
        headers2 = get_auth_headers("userb@example.com")

        res1 = client.get("/api/v1/profile", headers=headers1)
        res2 = client.get("/api/v1/profile", headers=headers2)

        assert res1.json()["user_id"] != res2.json()["user_id"]
        assert res1.json()["user_id"] == client.get("/api/v1/profile", headers=headers1).json()["user_id"]

    def test_validation_constraints(self):
        headers = get_auth_headers("valuser@example.com")
        # Invalid height (< 50cm)
        res_low_height = client.post(
            "/api/v1/profile/onboarding", json={"height_cm": 30.0}, headers=headers
        )
        assert res_low_height.status_code == 422

        # Invalid height (> 300cm)
        res_high_height = client.post(
            "/api/v1/profile/onboarding", json={"height_cm": 350.0}, headers=headers
        )
        assert res_high_height.status_code == 422

        # Invalid activity_level enum
        res_invalid_activity = client.post(
            "/api/v1/profile/onboarding", json={"activity_level": "super_active"}, headers=headers
        )
        assert res_invalid_activity.status_code == 422
