"""
Comprehensive test suite for unified metrics service (fixes D4, D5).
"""
import pytest
from app.services.metrics_service import (
    calculate_calorie_adherence,
    calculate_protein_adherence,
    calculate_workout_session_credit,
    calculate_weekly_workout_adherence,
    calculate_logging_consistency,
)


class TestMetricsEngine:
    def test_calorie_adherence_exact_match(self):
        # 100% adherence when intake matches target
        score = calculate_calorie_adherence(2000.0, 2000.0)
        assert score == 100.0

    def test_calorie_adherence_deviation(self):
        # 10% deviation (2200 vs 2000) -> 90%
        score = calculate_calorie_adherence(2200.0, 2000.0)
        assert score == 90.0

        # Under target by 20% (1600 vs 2000) -> 80%
        score = calculate_calorie_adherence(1600.0, 2000.0)
        assert score == 80.0

    def test_calorie_adherence_boundary_zero_target(self):
        assert calculate_calorie_adherence(1500.0, 0.0) == 0.0

    def test_protein_adherence_scaling_and_capping(self):
        # 50% target
        assert calculate_protein_adherence(75.0, 150.0) == 50.0
        # 100% target
        assert calculate_protein_adherence(150.0, 150.0) == 100.0
        # Surplus capped at 100%
        assert calculate_protein_adherence(200.0, 150.0) == 100.0
        # Zero target boundary
        assert calculate_protein_adherence(100.0, 0.0) == 0.0

    def test_workout_session_credit_under_3_sets_earns_zero(self):
        # Fixes D4: Anti-cheating rule — sessions with <3 completed sets earn 0.0 credit
        assert calculate_workout_session_credit(sets_completed=0, sets_planned=12) == 0.0
        assert calculate_workout_session_credit(sets_completed=1, sets_planned=12) == 0.0
        assert calculate_workout_session_credit(sets_completed=2, sets_planned=12) == 0.0

    def test_workout_session_credit_proportional_and_capped(self):
        # 6 of 12 sets = 0.5 credit
        assert calculate_workout_session_credit(sets_completed=6, sets_planned=12) == 0.5
        # 12 of 12 sets = 1.0 credit
        assert calculate_workout_session_credit(sets_completed=12, sets_planned=12) == 1.0
        # 16 of 12 sets = capped at 1.0 credit
        assert calculate_workout_session_credit(sets_completed=16, sets_planned=12) == 1.0

    def test_weekly_workout_adherence_calculation(self):
        # Target 4 days/week
        # Session 1: 12 of 12 sets (1.0 credit)
        # Session 2: 6 of 12 sets (0.5 credit)
        # Session 3: 2 of 12 sets (0.0 credit because < 3 sets)
        # Total credit: 1.5. Target days: 4. (1.5 / 4) * 100 = 37.5%
        sessions = [(12, 12), (6, 12), (2, 12)]
        adherence, done, planned = calculate_weekly_workout_adherence(sessions, target_days_per_week=4)
        assert adherence == 37.5
        assert done == 20
        assert planned == 36

    def test_weekly_workout_adherence_capped_at_100(self):
        # 5 sessions with full credit against a 4-day plan -> capped at 100.0%
        sessions = [(12, 12)] * 5
        adherence, done, planned = calculate_weekly_workout_adherence(sessions, target_days_per_week=4)
        assert adherence == 100.0
        assert done == 60
        assert planned == 60

    def test_logging_consistency_bounds(self):
        assert calculate_logging_consistency(0, 7) == 0.0
        assert calculate_logging_consistency(7, 7) == 100.0
        assert calculate_logging_consistency(3, 7) == 42.86
        assert calculate_logging_consistency(8, 7) == 100.0
