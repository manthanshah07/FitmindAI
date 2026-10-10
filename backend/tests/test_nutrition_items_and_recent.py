import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.nutrition import Food, MealLog, MealLogItem
from app.services.food_service import FoodService
from tests.conftest import TestingSessionLocal

client = TestClient(app)


def get_auth_headers(email: str, password: str = "Password123!"):
    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestNutritionItemsAndRecent:
    def test_seed_and_catalog_size(self):
        """Verify that FoodService seeds 150+ realistic food items."""
        db = TestingSessionLocal()
        try:
            seeded = FoodService.seed_default_foods(db)
            count = db.query(Food).count()
            assert count >= 150
            assert any("Roti" in f.name for f in seeded)
            assert any("Paneer" in f.name for f in seeded)
            assert any("Chicken" in f.name for f in seeded)
        finally:
            db.close()

    def test_delete_meal_item_and_empty_log_cleanup(self):
        """Deleting a meal item deletes it and removes the parent meal log if it was the only item."""
        headers = get_auth_headers("del_item_user@example.com")
        client.post("/api/v1/foods/seed", headers=headers)
        foods = client.get("/api/v1/foods", headers=headers).json()
        food_id = foods[0]["id"]

        # Log a meal with 1 item
        log_resp = client.post(
            "/api/v1/nutrition/log",
            headers=headers,
            json={
                "meal_type": "lunch",
                "logged_at": datetime.now(timezone.utc).isoformat(),
                "items": [{"food_id": food_id, "quantity_grams": 150.0}],
            },
        )
        assert log_resp.status_code == 201
        log_data = log_resp.json()
        item_id = log_data["items"][0]["id"]
        log_id = log_data["id"]

        # Delete the single item
        del_resp = client.delete(f"/api/v1/nutrition/items/{item_id}", headers=headers)
        assert del_resp.status_code == 204

        # Item should be gone
        db = TestingSessionLocal()
        try:
            assert db.query(MealLogItem).filter(MealLogItem.id == uuid.UUID(item_id)).first() is None
            # Empty parent meal log should also be cleaned up
            assert db.query(MealLog).filter(MealLog.id == uuid.UUID(log_id)).first() is None
        finally:
            db.close()

    def test_delete_meal_item_keeps_log_if_other_items_remain(self):
        """Deleting one item from a multi-item meal log keeps the meal log and other items intact."""
        headers = get_auth_headers("del_multi_user@example.com")
        client.post("/api/v1/foods/seed", headers=headers)
        foods = client.get("/api/v1/foods", headers=headers).json()
        food1_id = foods[0]["id"]
        food2_id = foods[1]["id"]

        log_resp = client.post(
            "/api/v1/nutrition/log",
            headers=headers,
            json={
                "meal_type": "dinner",
                "logged_at": datetime.now(timezone.utc).isoformat(),
                "items": [
                    {"food_id": food1_id, "quantity_grams": 100.0},
                    {"food_id": food2_id, "quantity_grams": 200.0},
                ],
            },
        )
        assert log_resp.status_code == 201
        log_data = log_resp.json()
        assert len(log_data["items"]) == 2
        item1_id = log_data["items"][0]["id"]
        item2_id = log_data["items"][1]["id"]
        log_id = log_data["id"]

        # Delete first item
        del_resp = client.delete(f"/api/v1/nutrition/items/{item1_id}", headers=headers)
        assert del_resp.status_code == 204

        # Item 1 is deleted, item 2 and parent log remain
        db = TestingSessionLocal()
        try:
            assert db.query(MealLogItem).filter(MealLogItem.id == uuid.UUID(item1_id)).first() is None
            assert db.query(MealLogItem).filter(MealLogItem.id == uuid.UUID(item2_id)).first() is not None
            assert db.query(MealLog).filter(MealLog.id == uuid.UUID(log_id)).first() is not None
        finally:
            db.close()

    def test_update_meal_item_quantity(self):
        """PATCH /nutrition/items/{id} updates serving quantity and recalculates macros."""
        headers = get_auth_headers("update_item_user@example.com")
        client.post("/api/v1/foods/seed", headers=headers)
        foods = client.get("/api/v1/foods", headers=headers).json()
        food = foods[0]
        food_id = food["id"]

        log_resp = client.post(
            "/api/v1/nutrition/log",
            headers=headers,
            json={
                "meal_type": "breakfast",
                "logged_at": datetime.now(timezone.utc).isoformat(),
                "items": [{"food_id": food_id, "quantity_grams": 100.0}],
            },
        )
        assert log_resp.status_code == 201
        item_id = log_resp.json()["items"][0]["id"]

        # Update to 200g
        patch_resp = client.patch(
            f"/api/v1/nutrition/items/{item_id}",
            headers=headers,
            json={"quantity_grams": 200.0},
        )
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert updated["quantity_grams"] == 200.0

        expected_cals = round(float(food["calories_per_100g"]) * 2.0, 2)
        expected_prot = round(float(food["protein_per_100g"]) * 2.0, 2)
        assert updated["calculated_calories"] == pytest.approx(expected_cals, 0.1)
        assert updated["calculated_protein"] == pytest.approx(expected_prot, 0.1)

    def test_user_isolation_on_edit_and_delete(self):
        """User A cannot edit or delete User B's meal items or logs (404 Not Found)."""
        user_a_headers = get_auth_headers("user_a_isolation@example.com")
        user_b_headers = get_auth_headers("user_b_isolation@example.com")

        client.post("/api/v1/foods/seed", headers=user_a_headers)
        foods = client.get("/api/v1/foods", headers=user_a_headers).json()
        food_id = foods[0]["id"]

        # User A logs meal
        log_resp = client.post(
            "/api/v1/nutrition/log",
            headers=user_a_headers,
            json={
                "meal_type": "lunch",
                "logged_at": datetime.now(timezone.utc).isoformat(),
                "items": [{"food_id": food_id, "quantity_grams": 100.0}],
            },
        )
        assert log_resp.status_code == 201
        item_id = log_resp.json()["items"][0]["id"]
        log_id = log_resp.json()["id"]

        # User B attempts to delete User A's item -> 404
        del_item_b = client.delete(f"/api/v1/nutrition/items/{item_id}", headers=user_b_headers)
        assert del_item_b.status_code == 404

        # User B attempts to update User A's item -> 404
        patch_b = client.patch(
            f"/api/v1/nutrition/items/{item_id}",
            headers=user_b_headers,
            json={"quantity_grams": 300.0},
        )
        assert patch_b.status_code == 404

        # User B attempts to delete User A's log -> 404
        del_log_b = client.delete(f"/api/v1/nutrition/logs/{log_id}", headers=user_b_headers)
        assert del_log_b.status_code == 404

        # User A's item and log remain untouched
        db = TestingSessionLocal()
        try:
            assert db.query(MealLogItem).filter(MealLogItem.id == uuid.UUID(item_id)).first() is not None
            assert db.query(MealLog).filter(MealLog.id == uuid.UUID(log_id)).first() is not None
        finally:
            db.close()

    def test_recent_foods_ordering_and_isolation(self):
        """GET /nutrition/recent returns deduplicated foods ordered by recency and isolated per user."""
        user_a_headers = get_auth_headers("recent_user_a@example.com")
        user_b_headers = get_auth_headers("recent_user_b@example.com")

        client.post("/api/v1/foods/seed", headers=user_a_headers)
        foods = client.get("/api/v1/foods", headers=user_a_headers).json()
        food0_id = foods[0]["id"]
        food1_id = foods[1]["id"]
        food2_id = foods[2]["id"]

        now = datetime.now(timezone.utc)

        # User A logs food0 2 hours ago, then food1 1 hour ago
        client.post(
            "/api/v1/nutrition/log",
            headers=user_a_headers,
            json={
                "meal_type": "breakfast",
                "logged_at": (now - timedelta(hours=2)).isoformat(),
                "items": [{"food_id": food0_id, "quantity_grams": 100.0}],
            },
        )
        client.post(
            "/api/v1/nutrition/log",
            headers=user_a_headers,
            json={
                "meal_type": "lunch",
                "logged_at": (now - timedelta(hours=1)).isoformat(),
                "items": [{"food_id": food1_id, "quantity_grams": 100.0}],
            },
        )

        # User B logs food2
        client.post(
            "/api/v1/nutrition/log",
            headers=user_b_headers,
            json={
                "meal_type": "snack",
                "logged_at": now.isoformat(),
                "items": [{"food_id": food2_id, "quantity_grams": 50.0}],
            },
        )

        # User A's recent foods: food1 (1 hour ago) must be before food0 (2 hours ago)
        recent_a_resp = client.get("/api/v1/nutrition/recent", headers=user_a_headers)
        assert recent_a_resp.status_code == 200
        recent_a = recent_a_resp.json()
        assert len(recent_a) == 2
        assert recent_a[0]["id"] == food1_id
        assert recent_a[1]["id"] == food0_id
        # User B's food2 must NOT appear in User A's recents
        assert not any(f["id"] == food2_id for f in recent_a)

        # User B's recents: only food2
        recent_b_resp = client.get("/api/v1/nutrition/recent", headers=user_b_headers)
        assert recent_b_resp.status_code == 200
        recent_b = recent_b_resp.json()
        assert len(recent_b) == 1
        assert recent_b[0]["id"] == food2_id

    def test_quick_add_meal(self):
        """POST /nutrition/quick-add creates custom meal item with manual calories and macros."""
        headers = get_auth_headers("quickadd_user@example.com")

        qa_resp = client.post(
            "/api/v1/nutrition/quick-add",
            headers=headers,
            json={
                "meal_type": "snack",
                "calories": 420.0,
                "protein_g": 35.0,
                "carbs_g": 40.0,
                "fat_g": 12.0,
                "name": "Custom Protein Smoothie",
            },
        )
        assert qa_resp.status_code == 201
        data = qa_resp.json()
        assert data["meal_type"] == "snack"
        assert len(data["items"]) == 1
        item = data["items"][0]
        assert item["calculated_calories"] == 420.0
        assert item["calculated_protein"] == 35.0
        assert item["calculated_carbs"] == 40.0
        assert item["calculated_fat"] == 12.0
        assert "Custom Protein Smoothie" in item["food"]["name"]

    def test_today_and_dashboard_consistency(self):
        """Verify that /nutrition/today and /dashboard/summary return identical nutrition numbers (fixes D5)."""
        headers = get_auth_headers("consistency_user@example.com")
        client.post("/api/v1/foods/seed", headers=headers)
        foods = client.get("/api/v1/foods", headers=headers).json()
        food_id = foods[0]["id"]

        client.post(
            "/api/v1/nutrition/log",
            headers=headers,
            json={
                "meal_type": "lunch",
                "logged_at": datetime.now(timezone.utc).isoformat(),
                "items": [{"food_id": food_id, "quantity_grams": 100.0}],
            },
        )

        today_resp = client.get("/api/v1/nutrition/today", headers=headers)
        assert today_resp.status_code == 200
        today_data = today_resp.json()

        dash_resp = client.get("/api/v1/dashboard/summary", headers=headers)
        assert dash_resp.status_code == 200
        dash_data = dash_resp.json()

        # Parity check
        dash_nutr = dash_data["today_nutrition"]
        assert dash_nutr["consumed_calories"] == today_data["consumed"]["calories"]
        assert dash_nutr["target_calories"] == today_data["targets"]["calories"]
        assert dash_nutr["remaining_calories"] == today_data["remaining"]["calories"]
        assert dash_nutr["consumed_protein_g"] == today_data["consumed"]["protein_g"]
        assert dash_nutr["target_protein_g"] == today_data["targets"]["protein_g"]
        assert dash_nutr["remaining_protein_g"] == today_data["remaining"]["protein_g"]
        assert dash_nutr["consumed_carbs_g"] == today_data["consumed"]["carbs_g"]
        assert dash_nutr["target_carbs_g"] == today_data["targets"]["carbs_g"]
        assert dash_nutr["remaining_carbs_g"] == today_data["remaining"]["carbs_g"]
        assert dash_nutr["consumed_fat_g"] == today_data["consumed"]["fat_g"]
        assert dash_nutr["target_fat_g"] == today_data["targets"]["fat_g"]
        assert dash_nutr["remaining_fat_g"] == today_data["remaining"]["fat_g"]
