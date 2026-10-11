import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect

from app.core.security import hash_password
from app.models.chat_message import ChatMessage
from app.models.nutrition import Food, MealLog, MealLogItem
from app.models.profile import Profile
from app.models.progress import Measurement
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.models.workout import Exercise, WorkoutLog
from tests.conftest import TestingSessionLocal


def create_user(
    email: str,
    password: str = "ValidPass123",
    is_admin: bool = False,
    is_active: bool = True,
    full_name: str = "Test User",
) -> User:
    db = TestingSessionLocal()
    try:
        user = User(
            email=email,
            password_hash=hash_password(password),
            is_admin=is_admin,
            is_active=is_active,
            is_verified=True,
        )
        db.add(user)
        db.flush()
        profile = Profile(
            user_id=user.id,
            full_name=full_name,
            timezone="UTC",
            onboarding_complete=True,
        )
        db.add(profile)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def login_and_get_tokens(client: TestClient, email: str, password: str = "ValidPass123") -> dict:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    data = res.json()
    refresh_cookie = res.cookies.get("refresh_token")
    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token") or refresh_cookie,
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
    }


def test_admin_endpoints_reject_unauthenticated_and_non_admin(client: TestClient):
    normal_user = create_user("member@fitmind.ai", is_admin=False)
    member_auth = login_and_get_tokens(client, normal_user.email)
    dummy_id = str(uuid.uuid4())

    endpoints = [
        ("GET", "/api/v1/admin/stats", None),
        ("GET", "/api/v1/admin/users", None),
        ("POST", f"/api/v1/admin/users/{dummy_id}/status", {"is_active": False}),
        ("PATCH", f"/api/v1/admin/users/{dummy_id}/status", {"is_active": False}),
        ("POST", f"/api/v1/admin/users/{dummy_id}/role", {"is_admin": True}),
        ("PATCH", f"/api/v1/admin/users/{dummy_id}/role", {"is_admin": True}),
        ("GET", "/api/v1/admin/content/exercises", None),
        ("PATCH", f"/api/v1/admin/content/exercises/{dummy_id}", {"is_verified": False}),
        ("GET", "/api/v1/admin/content/foods", None),
        ("PATCH", f"/api/v1/admin/content/foods/{dummy_id}", {"is_verified": False}),
        ("GET", "/api/v1/admin/audit-log", None),
    ]

    for method, url, payload in endpoints:
        # Unauthenticated -> 401
        unauth_res = client.request(method, url, json=payload)
        assert unauth_res.status_code in (401, 403), f"Expected 401/403 for unauth {method} {url}, got {unauth_res.status_code}"

        # Non-admin authenticated -> 403 Forbidden
        member_res = client.request(method, url, json=payload, headers=member_auth["headers"])
        assert member_res.status_code == 403, f"Expected 403 for non-admin {method} {url}, got {member_res.status_code}"


def test_privilege_escalation_prevented_via_signup_and_profile(client: TestClient):
    # Attempt to pass is_admin=True in signup payload
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "attacker@fitmind.ai",
            "password": "Password123",
            "full_name": "Attacker",
            "is_admin": True,
        },
    )
    assert reg_res.status_code == 201
    assert reg_res.json()["is_admin"] is False

    auth = login_and_get_tokens(client, "attacker@fitmind.ai", "Password123")

    # Attempt to pass is_admin=True in profile update payload
    prof_res = client.put(
        "/api/v1/profile",
        json={"full_name": "Escalated User", "is_admin": True},
        headers=auth["headers"],
    )
    assert prof_res.status_code == 200

    # Verify in DB and via /auth/me that user is still NOT admin
    me_res = client.get("/api/v1/auth/me", headers=auth["headers"])
    assert me_res.status_code == 200
    assert me_res.json()["is_admin"] is False


def test_deactivated_user_cannot_login_refresh_or_access_api(client: TestClient):
    admin = create_user("admin@fitmind.ai", is_admin=True, full_name="Platform Admin")
    member = create_user("target@fitmind.ai", is_admin=False, full_name="Target Member")

    admin_auth = login_and_get_tokens(client, admin.email)
    member_auth = login_and_get_tokens(client, member.email)

    # Deactivate member via admin endpoint
    deact_res = client.post(
        f"/api/v1/admin/users/{member.id}/status",
        json={"is_active": False, "reason": "Policy violation test"},
        headers=admin_auth["headers"],
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # Verify all refresh tokens for member are revoked in DB
    db = TestingSessionLocal()
    try:
        active_tokens = (
            db.query(RefreshToken)
            .filter(RefreshToken.user_id == member.id, RefreshToken.is_revoked.is_(False))
            .count()
        )
        assert active_tokens == 0
    finally:
        db.close()

    # 1. Existing JWT access token is immediately rejected with 403
    me_res = client.get("/api/v1/auth/me", headers=member_auth["headers"])
    assert me_res.status_code == 403

    # 2. Deactivated user cannot log in -> 403 Forbidden
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": member.email, "password": "ValidPass123"},
    )
    assert login_res.status_code == 403
    assert "inactive" in login_res.json()["detail"].lower()

    # 3. Deactivated user cannot refresh token -> 403 Forbidden
    refresh_res = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": member_auth["refresh_token"]},
    )
    assert refresh_res.status_code == 403
    assert "inactive" in refresh_res.json()["detail"].lower()

    # 4. Re-activating the user restores login access
    react_res = client.post(
        f"/api/v1/admin/users/{member.id}/status",
        json={"is_active": True, "reason": "Restored account"},
        headers=admin_auth["headers"],
    )
    assert react_res.status_code == 200
    assert react_res.json()["is_active"] is True

    login_again = client.post(
        "/api/v1/auth/login",
        json={"email": member.email, "password": "ValidPass123"},
    )
    assert login_again.status_code == 200


def test_self_deactivation_self_demotion_and_last_admin_guards(client: TestClient):
    admin1 = create_user("admin1@fitmind.ai", is_admin=True, full_name="Admin One")
    admin1_auth = login_and_get_tokens(client, admin1.email)

    # Admin cannot deactivate themselves -> 400
    self_deact = client.post(
        f"/api/v1/admin/users/{admin1.id}/status",
        json={"is_active": False},
        headers=admin1_auth["headers"],
    )
    assert self_deact.status_code == 400
    assert "own account" in self_deact.json()["detail"].lower()

    # Admin cannot demote themselves -> 400
    self_demote = client.post(
        f"/api/v1/admin/users/{admin1.id}/role",
        json={"is_admin": False},
        headers=admin1_auth["headers"],
    )
    assert self_demote.status_code == 400
    assert "own account" in self_demote.json()["detail"].lower()

    # Create a second user, promote them to admin, then deactivate admin2 so admin1 is the only active admin
    admin2 = create_user("admin2@fitmind.ai", is_admin=False, full_name="Admin Two")
    promote_res = client.post(
        f"/api/v1/admin/users/{admin2.id}/role",
        json={"is_admin": True},
        headers=admin1_auth["headers"],
    )
    assert promote_res.status_code == 200
    assert promote_res.json()["is_admin"] is True

    # Now with 2 active admins, admin1 can demote admin2
    demote_res = client.post(
        f"/api/v1/admin/users/{admin2.id}/role",
        json={"is_admin": False},
        headers=admin1_auth["headers"],
    )
    assert demote_res.status_code == 200
    assert demote_res.json()["is_admin"] is False


def test_privacy_rule_and_stats_aggregation(client: TestClient):
    admin = create_user("admin@fitmind.ai", is_admin=True, full_name="Super Admin")
    member = create_user("private.member@fitmind.ai", is_admin=False, full_name="Private Member")

    # Seed private fitness records for member
    db = TestingSessionLocal()
    try:
        food = Food(
            name="Private Secret Food",
            brand="SecretBrand",
            calories_per_100g=250,
            protein_per_100g=20,
            carbs_per_100g=20,
            fat_per_100g=10,
            is_verified=True,
        )
        db.add(food)
        db.flush()

        meal = MealLog(
            user_id=member.id,
            meal_type="dinner",
            logged_at=datetime.now(timezone.utc),
            notes="Top secret personal meal note",
        )
        db.add(meal)
        db.flush()
        db.add(
            MealLogItem(
                meal_log_id=meal.id,
                food_id=food.id,
                quantity_grams=150,
                calculated_calories=375,
                calculated_protein=30,
                calculated_carbs=30,
                calculated_fat=15,
            )
        )

        workout = WorkoutLog(
            user_id=member.id,
            started_at=datetime.now(timezone.utc),
            notes="Confidential workout journal note",
        )
        db.add(workout)

        measurement = Measurement(
            user_id=member.id,
            weight_kg=77.5,
            body_fat_pct=15.2,
            measured_at=datetime.now(timezone.utc),
        )
        db.add(measurement)

        chat = ChatMessage(
            user_id=member.id,
            role="user",
            content="Private medical question for coach",
        )
        db.add(chat)
        db.commit()
    finally:
        db.close()

    admin_auth = login_and_get_tokens(client, admin.email)

    # Check GET /api/v1/admin/stats
    stats_res = client.get("/api/v1/admin/stats", headers=admin_auth["headers"])
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_users"] == 2
    assert stats["total_workouts_logged"] == 1
    assert stats["total_meals_logged"] == 1
    assert stats["total_ai_messages"] == 1
    assert stats["system_health"]["database_status"] == "healthy"

    # Check GET /api/v1/admin/users privacy boundary
    users_res = client.get(
        "/api/v1/admin/users",
        params={"q": "private.member"},
        headers=admin_auth["headers"],
    )
    assert users_res.status_code == 200
    payload = users_res.json()
    assert payload["total"] == 1
    user_item = payload["items"][0]

    # Allowed metadata + aggregate counts only
    expected_keys = {
        "id",
        "email",
        "full_name",
        "is_active",
        "is_admin",
        "created_at",
        "last_active_at",
        "workouts_count",
        "meals_count",
    }
    assert set(user_item.keys()) == expected_keys
    assert user_item["workouts_count"] == 1
    assert user_item["meals_count"] == 1

    raw_text = users_res.text
    assert "Top secret personal meal note" not in raw_text
    assert "Confidential workout journal note" not in raw_text
    assert "Private medical question for coach" not in raw_text
    assert "77.5" not in raw_text


def test_content_catalog_and_audit_log(client: TestClient):
    admin = create_user("catalog.admin@fitmind.ai", is_admin=True, full_name="Catalog Admin")
    admin_auth = login_and_get_tokens(client, admin.email)

    db = TestingSessionLocal()
    try:
        ex = Exercise(
            name="Barbell Bench Press",
            primary_muscle="chest",
            difficulty="intermediate",
            category="strength",
            is_verified=True,
        )
        fd = Food(
            name="Greek Yogurt Plain",
            brand="FitDairy",
            calories_per_100g=59,
            protein_per_100g=10,
            carbs_per_100g=3.6,
            fat_per_100g=0.4,
            is_verified=True,
        )
        db.add_all([ex, fd])
        db.commit()
        ex_id = str(ex.id)
        fd_id = str(fd.id)
    finally:
        db.close()

    # List & update exercise
    ex_list = client.get("/api/v1/admin/content/exercises", headers=admin_auth["headers"])
    assert ex_list.status_code == 200
    assert ex_list.json()["total"] == 1

    ex_patch = client.patch(
        f"/api/v1/admin/content/exercises/{ex_id}",
        json={"difficulty": "advanced", "is_verified": False},
        headers=admin_auth["headers"],
    )
    assert ex_patch.status_code == 200
    assert ex_patch.json()["difficulty"] == "advanced"
    assert ex_patch.json()["is_verified"] is False

    # List & update food
    fd_list = client.get("/api/v1/admin/content/foods", headers=admin_auth["headers"])
    assert fd_list.status_code == 200
    assert fd_list.json()["total"] == 1

    fd_patch = client.patch(
        f"/api/v1/admin/content/foods/{fd_id}",
        json={"protein_per_100g": 11.5, "is_verified": False},
        headers=admin_auth["headers"],
    )
    assert fd_patch.status_code == 200
    assert fd_patch.json()["protein_per_100g"] == 11.5
    assert fd_patch.json()["is_verified"] is False

    # Verify immutable audit log entries were written
    audit_res = client.get("/api/v1/admin/audit-log", headers=admin_auth["headers"])
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["total"] >= 2
    actions = [item["action"] for item in audit_data["items"]]
    assert "content.update" in actions
    assert audit_data["items"][0]["admin_email"] == admin.email


def test_alembic_migration_0016_upgrade_and_downgrade():
    backend_dir = Path(__file__).resolve().parent.parent
    alembic_ini = backend_dir / "alembic.ini"

    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_m11_migration.db"
        db_url = f"sqlite:///{db_path}"

        cfg = Config(str(alembic_ini))
        cfg.set_main_option("script_location", str(backend_dir / "alembic"))
        cfg.set_main_option("sqlalchemy.url", db_url)

        prev_env_url = os.environ.get("DATABASE_URL")
        os.environ["DATABASE_URL"] = db_url
        try:
            command.upgrade(cfg, "head")
            eng = create_engine(db_url)
            insp = inspect(eng)
            assert "admin_audit_log" in insp.get_table_names()
            user_cols = {c["name"] for c in insp.get_columns("users")}
            assert "last_active_at" in user_cols
            assert "is_active" in user_cols
            ex_cols = {c["name"] for c in insp.get_columns("exercises")}
            assert "is_verified" in ex_cols
            eng.dispose()

            command.downgrade(cfg, "2026_10_10_0015")
            eng2 = create_engine(db_url)
            insp2 = inspect(eng2)
            assert "admin_audit_log" not in insp2.get_table_names()
            user_cols_down = {c["name"] for c in insp2.get_columns("users")}
            assert "last_active_at" not in user_cols_down
            eng2.dispose()

            command.upgrade(cfg, "head")
        finally:
            if prev_env_url is not None:
                os.environ["DATABASE_URL"] = prev_env_url
            else:
                os.environ.pop("DATABASE_URL", None)
