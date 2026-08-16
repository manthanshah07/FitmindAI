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

        # FIX 1: Test notes longer than 2000 characters
        long_notes = {
            "meal_type": "breakfast",
            "logged_at": now_iso,
            "notes": "A" * 2001,
            "items": [{"food_id": food_id, "quantity_grams": 100.0}],
        }
        res_long_notes = client.post("/api/v1/nutrition/log", json=long_notes, headers=headers)
        assert res_long_notes.status_code == 422

        # FIX 3: Test empty items meal rejection
        empty_items = {
            "meal_type": "lunch",
            "logged_at": now_iso,
            "items": [],
        }
        res_empty = client.post("/api/v1/nutrition/log", json=empty_items, headers=headers)
        assert res_empty.status_code == 422

    def test_target_date_parameter_and_timezone(self):
        headers = get_auth_headers("targetdateuser@example.com")
        client.post("/api/v1/foods/seed", headers=headers)
        foods = client.get("/api/v1/foods?search=Roti", headers=headers).json()
        roti_id = foods[0]["id"]

        # Log meal specifically on 2026-08-16
        logged_time = "2026-08-16T12:00:00Z"
        log_payload = {
            "meal_type": "dinner",
            "logged_at": logged_time,
            "notes": "Specific Date Meal",
            "items": [{"food_id": roti_id, "quantity_grams": 100.0}],
        }
        res_log = client.post("/api/v1/nutrition/log", json=log_payload, headers=headers)
        assert res_log.status_code == 201

        # Query explicit date 2026-08-16
        res_specific = client.get("/api/v1/nutrition/today?target_date=2026-08-16", headers=headers)
        assert res_specific.status_code == 200
        data_specific = res_specific.json()
        assert data_specific["date"] == "2026-08-16"
        assert len(data_specific["meals_by_type"]["dinner"]) == 1
        assert data_specific["consumed"]["calories"] == 264.0

        # Query different date 2026-08-10 (should be zero summary)
        res_empty_date = client.get("/api/v1/nutrition/today?target_date=2026-08-10", headers=headers)
        assert res_empty_date.status_code == 200
        data_empty = res_empty_date.json()
        assert data_empty["consumed"]["calories"] == 0.0
        assert len(data_empty["meals_by_type"]["dinner"]) == 0

        # Query invalid date format (returns 422)
        res_invalid_date = client.get("/api/v1/nutrition/today?target_date=invalid-date", headers=headers)
        assert res_invalid_date.status_code == 422

    def test_deterministic_goal_macro_targets(self):
        headers = get_auth_headers("goalspecuser@example.com")

        # Set profile (70kg, 170cm, male, moderate activity -> TDEE ~2409 kcal)
        profile_res = client.put(
            "/api/v1/profile",
            json={
                "full_name": "Goal Spec User",
                "weight_kg": 70.0,
                "height_cm": 170.0,
                "gender": "male",
                "activity_level": "moderate",
                "fitness_experience": "intermediate",
            },
            headers=headers,
        )
        assert profile_res.status_code == 200

        # Test weight_loss goal (-500 kcal, 2.2g/kg protein)
        client.post(
            "/api/v1/goals",
            json={
                "goal_type": "weight_loss",
                "target_weight_kg": 65.0,
                "weekly_goal_kg": 0.5,
            },
            headers=headers,
        )
        wl_summary = client.get("/api/v1/nutrition/today", headers=headers).json()
        # BMR = 10(70) + 6.25(170) - 5(25) + 5 = 1642.5 -> TDEE(1.55) = 2545.0
        # Weight loss calorie target: 2545 - 500 = 2045.0 kcal
        # Protein: 70 * 2.2 = 154.0 g
        assert wl_summary["targets"]["calories"] == 2045.0
        assert wl_summary["targets"]["protein_g"] == 154.0

        # Test muscle_gain goal (+300 kcal, 2.0g/kg protein)
        client.post(
            "/api/v1/goals",
            json={
                "goal_type": "muscle_gain",
                "target_weight_kg": 75.0,
                "weekly_goal_kg": 0.25,
            },
            headers=headers,
        )
        mg_summary = client.get("/api/v1/nutrition/today", headers=headers).json()
        # Muscle gain calorie target: 2545 + 300 = 2845.0 kcal
        # Protein: 70 * 2.0 = 140.0 g
        assert mg_summary["targets"]["calories"] == 2845.0
        assert mg_summary["targets"]["protein_g"] == 140.0

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

        # User B querying target_date=2026-08-16 does not see User A's meal on that date
        res_target_date_b = client.get("/api/v1/nutrition/today?target_date=2026-08-16", headers=headers_b)
        assert res_target_date_b.status_code == 200
        assert res_target_date_b.json()["consumed"]["calories"] == 0.0
