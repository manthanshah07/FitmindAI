import pytest
from app.models.workout import WorkoutPlan
from app.services.workout_service import WorkoutService
from app.schemas.workout import WorkoutPlanCreate
from tests.test_workout import get_auth_headers, client
from tests.conftest import TestingSessionLocal
from app.models.user import User


class TestPlanGeneratorV2:
    def setup_method(self):
        # Seed exercises before tests
        self.headers = get_auth_headers("planv2@example.com")
        client.post("/api/v1/exercises/seed", headers=self.headers)

    def test_plan_splits_days(self):
        """Test split structure across days 2 to 6."""
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "planv2@example.com").first()

        for days in [2, 3, 4, 5, 6]:
            plan = WorkoutService.generate_workout_plan(
                db, user, WorkoutPlanCreate(name=f"{days}-Day Split", days_per_week=days)
            )
            assert plan.days_per_week == days
            assert len(plan.plan_exercises) > 0

            # Verify day labels match expected splits
            day_labels = {e.day_label for e in plan.plan_exercises if e.day_label}
            assert len(day_labels) == days

            # Each day has 4 to 6 exercises
            for day_idx in range(1, days + 1):
                day_exs = [e for e in plan.plan_exercises if e.day_of_week == day_idx]
                assert 4 <= len(day_exs) <= 6, f"Day {day_idx} has {len(day_exs)} exercises"
        db.close()

    def test_plan_compound_prioritization(self):
        """Compound exercises must come before isolation exercises on each day."""
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "planv2@example.com").first()

        plan = WorkoutService.generate_workout_plan(
            db, user, WorkoutPlanCreate(name="Compound Test", days_per_week=4)
        )
        assert len(plan.plan_exercises) > 0

        for day_idx in range(1, 5):
            day_exs = [e for e in plan.plan_exercises if e.day_of_week == day_idx]
            orders = [e.order_index for e in day_exs]
            assert orders == sorted(orders)
            # The first exercise of every training day must be a primary compound movement
            first_ex_name = day_exs[0].exercise.name
            assert any(
                c in first_ex_name
                for c in ["Squat", "Bench", "Deadlift", "Press", "Pull-up", "Row", "Dumbbell", "Push-up", "Dips"]
            )
        db.close()

    def test_plan_generator_determinism(self):
        """Generating a plan with the same parameters must produce the exact same plan."""
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "planv2@example.com").first()

        plan_1 = WorkoutService.generate_workout_plan(
            db, user, WorkoutPlanCreate(name="Deterministic Plan", days_per_week=4)
        )
        plan_2 = WorkoutService.generate_workout_plan(
            db, user, WorkoutPlanCreate(name="Deterministic Plan", days_per_week=4)
        )

        assert plan_1.days_per_week == plan_2.days_per_week
        assert len(plan_1.plan_exercises) == len(plan_2.plan_exercises)

        for e1, e2 in zip(plan_1.plan_exercises, plan_2.plan_exercises):
            assert e1.exercise_id == e2.exercise_id
            assert e1.day_of_week == e2.day_of_week
            assert e1.day_label == e2.day_label
            assert e1.sets == e2.sets
            assert e1.reps == e2.reps
            assert e1.order_index == e2.order_index
        db.close()

    def test_goal_adaptation(self):
        """Goal influences sets and rep ranges."""
        from app.models.goal import Goal

        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "planv2@example.com").first()

        # Muscle gain
        db.query(Goal).filter(Goal.user_id == user.id).delete()
        db.add(Goal(user_id=user.id, goal_type="muscle_gain", is_active=True))
        db.commit()
        plan_hyper = WorkoutService.generate_workout_plan(
            db, user, WorkoutPlanCreate(name="Hypertrophy", days_per_week=3)
        )
        for e in plan_hyper.plan_exercises:
            assert e.sets in [3, 4]
            assert e.reps in ["6-8", "8-10", "10-12"]

        # Fat loss
        db.query(Goal).filter(Goal.user_id == user.id).delete()
        db.add(Goal(user_id=user.id, goal_type="fat_loss", is_active=True))
        db.commit()
        plan_cut = WorkoutService.generate_workout_plan(
            db, user, WorkoutPlanCreate(name="Fat Loss", days_per_week=3)
        )
        for e in plan_cut.plan_exercises:
            assert e.sets == 3
            assert e.reps in ["10-12", "12-15"]
            assert e.rest_seconds in [45, 60]

        # Strength / General fitness
        db.query(Goal).filter(Goal.user_id == user.id).delete()
        db.add(Goal(user_id=user.id, goal_type="strength", is_active=True))
        db.commit()
        plan_str = WorkoutService.generate_workout_plan(
            db, user, WorkoutPlanCreate(name="Strength", days_per_week=3)
        )
        first_ex = [e for e in plan_str.plan_exercises if e.order_index == 1][0]
        assert first_ex.sets >= 4
        assert first_ex.reps in ["5", "6-8"]
        assert first_ex.rest_seconds >= 120
        db.close()
