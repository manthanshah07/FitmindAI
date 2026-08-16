from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_auth_headers(email: str = "nutritionuser@example.com", password: str = "Password123!"):
    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestNutritionAPI:
    def test_unauthenticated_nutrition_access(self):
        assert client.get("/api/v1/foods").status_code == 401
        assert client.get("/api/v1/nutrition/today").status_code == 401
        assert client.get("/api/v1/nutrition/logs").status_code == 401

    def test_food_seeding_and_search(self):
        headers = get_auth_headers("fooduser@example.com")

        # Seed catalog
        res_seed = client.post("/api/v1/foods/seed", headers=headers)
        assert res_seed.status_code == 201
        foods = res_seed.json()
        assert len(foods) >= 8

        # Browse foods
        res_get = client.get("/api/v1/foods", headers=headers)
        assert res_get.status_code == 200
        assert len(res_get.json()) >= 8

        # Search food
        res_search = client.get("/api/v1/foods?search=Roti", headers=headers)
        assert res_search.status_code == 200
        assert len(res_search.json()) >= 1
        assert "Roti" in res_search.json()[0]["name"]

    def test_meal_logging_and_today_summary(self):
        headers = get_auth_headers("mealuser@example.com")

        # Seed foods
        client.post("/api/v1/foods/seed", headers=headers)
        foods = client.get("/api/v1/foods?search=Roti", headers=headers).json()
        roti_id = foods[0]["id"]

        # Initial summary
        res_summary = client.get("/api/v1/nutrition/today", headers=headers)
        assert res_summary.status_code == 200
        summary_data = res_summary.json()
        assert summary_data["targets"]["calories"] > 0
        assert summary_data["consumed"]["calories"] == 0.0

        # Log a meal (120g of Roti)
        now_iso = datetime.now(timezone.utc).isoformat()
        log_payload = {
            "meal_type": "lunch",
            "logged_at": now_iso,
            "notes": "Healthy lunch session",
            "items": [
                {
                    "food_id": roti_id,
                    "quantity_grams": 120.0,
                }
            ],
        }

        res_log = client.post("/api/v1/nutrition/log", json=log_payload, headers=headers)
        assert res_log.status_code == 201
        log_data = res_log.json()
        assert log_data["meal_type"] == "lunch"
        assert len(log_data["items"]) == 1
        # 120g of Roti (264 cals/100g) = 316.8 cals
        assert log_data["items"][0]["calculated_calories"] == 316.8

        # Fetch updated summary
        res_updated_summary = client.get("/api/v1/nutrition/today", headers=headers)
        assert res_updated_summary.status_code == 200
        updated_data = res_updated_summary.json()
        assert updated_data["consumed"]["calories"] == 316.8
        assert len(updated_data["meals_by_type"]["lunch"]) == 1

    def test_meal_logging_validation_failures(self):
        headers = get_auth_headers("valuser@example.com")
        client.post("/api/v1/foods/seed", headers=headers)
        foods = client.get("/api/v1/foods", headers=headers).json()
        food_id = foods[0]["id"]

        now_iso = datetime.now(timezone.utc).isoformat()

        # Test invalid meal type
        bad_meal_type = {
            "meal_type": "midnight_snack",
            "logged_at": now_iso,
            "items": [{"food_id": food_id, "quantity_grams": 100.0}],
        }
        res_bad_type = client.post("/api/v1/nutrition/log", json=bad_meal_type, headers=headers)
        assert res_bad_type.status_code == 422

        # Test zero quantity grams
        zero_qty = {
            "meal_type": "breakfast",
            "logged_at": now_iso,
            "items": [{"food_id": food_id, "quantity_grams": 0.0}],
        }
        res_zero = client.post("/api/v1/nutrition/log", json=zero_qty, headers=headers)
        assert res_zero.status_code == 422

    def test_user_isolation_idor_prevention(self):
        # User A logs a meal
        headers_a = get_auth_headers("nutrition_a@example.com")
        client.post("/api/v1/foods/seed", headers=headers_a)
        foods = client.get("/api/v1/foods", headers=headers_a).json()
        food_id = foods[0]["id"]

        now_iso = datetime.now(timezone.utc).isoformat()
        log_payload = {
            "meal_type": "breakfast",
            "logged_at": now_iso,
            "notes": "User A Private Meal",
            "items": [{"food_id": food_id, "quantity_grams": 100.0}],
        }
        res_log_a = client.post("/api/v1/nutrition/log", json=log_payload, headers=headers_a)
        assert res_log_a.status_code == 201
        log_id_a = res_log_a.json()["id"]

        # User B attempts to access User A's meal log by ID
        headers_b = get_auth_headers("nutrition_b@example.com")
        res_idor = client.get(f"/api/v1/nutrition/logs/{log_id_a}", headers=headers_b)
        assert res_idor.status_code == 404
        assert res_idor.json()["detail"] == "Meal log session not found"
