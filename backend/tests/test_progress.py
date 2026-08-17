from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_headers(email: str = "progressuser@example.com", password: str = "Password123!"):
    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestProgressAPI:
    def test_unauthenticated_progress_access(self):
        assert client.get("/api/v1/progress/summary").status_code == 401
        assert client.get("/api/v1/progress/measurements").status_code == 401
        assert client.post("/api/v1/progress/measurements", json={"weight_kg": 75.0}).status_code == 401

    def test_create_and_get_measurements(self):
        headers = get_auth_headers("measuser@example.com")

        # Initial profile
        client.put(
            "/api/v1/profile",
            json={
                "full_name": "Meas User",
                "weight_kg": 80.0,
                "height_cm": 175.0,
                "gender": "male",
                "activity_level": "moderate",
                "fitness_experience": "intermediate",
            },
            headers=headers,
        )

        # Log new measurement with weight and body metrics
        payload = {
            "measured_at": date.today().isoformat(),
            "weight_kg": 78.5,
            "chest_cm": 102.0,
            "waist_cm": 84.0,
            "hips_cm": 98.0,
            "bicep_cm": 38.0,
            "thigh_cm": 58.0,
            "body_fat_pct": 16.5,
        }

        res = client.post("/api/v1/progress/measurements", json=payload, headers=headers)
        assert res.status_code == 201
        data = res.json()
        assert data["weight_kg"] == 78.5
        assert data["chest_cm"] == 102.0
        assert data["waist_cm"] == 84.0

        # Verify Profile.weight_kg auto-synced to 78.5
        profile_res = client.get("/api/v1/profile", headers=headers)
        assert profile_res.status_code == 200
        assert profile_res.json()["weight_kg"] == 78.5

        # Fetch list of measurements
        list_res = client.get("/api/v1/progress/measurements", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) == 1
        assert list_res.json()[0]["id"] == data["id"]

    def test_progress_summary_and_trend_calculation(self):
        headers = get_auth_headers("trenduser@example.com")

        # Initial empty summary
        res_empty = client.get("/api/v1/progress/summary", headers=headers)
        assert res_empty.status_code == 200
        assert res_empty.json()["trend_direction"] == "no_data"
        assert res_empty.json()["total_entries"] == 0

        # Log initial weight entry 10 days ago (80 kg)
        date_old = (date.today() - timedelta(days=10)).isoformat()
        client.post(
            "/api/v1/progress/measurements",
            json={"measured_at": date_old, "weight_kg": 80.0},
            headers=headers,
        )

        # Log new weight entry today (78.0 kg -> -2.0 kg loss)
        date_today = date.today().isoformat()
        client.post(
            "/api/v1/progress/measurements",
            json={"measured_at": date_today, "weight_kg": 78.0},
            headers=headers,
        )

        res_summary = client.get("/api/v1/progress/summary", headers=headers)
        assert res_summary.status_code == 200
        summary = res_summary.json()
        assert summary["total_entries"] == 2
        assert summary["latest_weight_kg"] == 78.0
        assert summary["weight_change_kg"] == -2.0
        assert summary["trend_direction"] == "losing"

    def test_measurement_validation_boundaries(self):
        headers = get_auth_headers("valmeasuser@example.com")

        # Rejects empty payload with no metrics
        res_empty = client.post("/api/v1/progress/measurements", json={}, headers=headers)
        assert res_empty.status_code == 422

        # Rejects weight out of bounds (<10 kg)
        res_low_w = client.post("/api/v1/progress/measurements", json={"weight_kg": 5.0}, headers=headers)
        assert res_low_w.status_code == 422

        # Rejects weight out of bounds (>500 kg)
        res_high_w = client.post("/api/v1/progress/measurements", json={"weight_kg": 600.0}, headers=headers)
        assert res_high_w.status_code == 422

        # Rejects chest_cm out of bounds (<20 cm)
        res_low_c = client.post("/api/v1/progress/measurements", json={"chest_cm": 10.0}, headers=headers)
        assert res_low_c.status_code == 422

    def test_user_isolation_idor_prevention(self):
        # User A logs a measurement
        headers_a = get_auth_headers("progress_a@example.com")
        res_a = client.post(
            "/api/v1/progress/measurements",
            json={"weight_kg": 75.0, "waist_cm": 80.0},
            headers=headers_a,
        )
        assert res_a.status_code == 201
        id_a = res_a.json()["id"]

        # User B attempts to fetch User A's measurement record by ID
        headers_b = get_auth_headers("progress_b@example.com")
        res_idor = client.get(f"/api/v1/progress/measurements/{id_a}", headers=headers_b)
        assert res_idor.status_code == 404
        assert res_idor.json()["detail"] == "Measurement record not found"
