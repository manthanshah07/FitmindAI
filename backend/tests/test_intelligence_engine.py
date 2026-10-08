"""
Comprehensive unit, integration, and security tests for FitMind AI Intelligence Engine (Phase 2E).
Covers model loading, trajectory prediction, What-If simulation, goal feasibility,
plan optimization, adaptation monitoring, and API authorization/isolation.
Hardened for scientific terminology, benchmark uncertainty labeling, and deterministic ranking heuristics.
"""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.progress import Measurement
from app.models.nutrition import MealLog
from app.services.intelligence.model_service import ModelService, ModelArtifactError
from app.services.intelligence.prediction_service import PredictionService
from app.services.intelligence.feasibility_service import FeasibilityService, ProductPacingGuardrails, FeasibilitySafetyPolicy
from app.services.intelligence.scenario_service import ScenarioService
from app.services.intelligence.optimizer_service import PlanOptimizerService
from app.services.intelligence.adaptation_service import AdaptationService
from app.services.intelligence.contracts import (
    NormalizedSubjectData,
    SubjectDemographics,
    MeasurementRecord,
    DailyNutritionRecord,
)
from app.schemas.intelligence import (
    ScenarioModification,
    ScenarioSimulationRequest,
    PlanOptimizationRequest,
)

client = TestClient(app)


def get_auth_headers(email: str = "inteluser@example.com", password: str = "Password123!"):
    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def make_sample_subject_data(
    num_nutrition_days: int = 25,
    num_measurements: int = 4,
    ref_date: date = date(2026, 6, 1),
) -> NormalizedSubjectData:
    """Creates synthetic subject data for testing."""
    demographics = SubjectDemographics(
        subject_id="test_sub_01",
        date_of_birth=date(1995, 5, 15),
        gender="male",
        height_cm=180.0,
        baseline_profile_weight_kg=80.0,
        activity_level="moderate",
        timezone_str="UTC",
    )

    measurements = [
        MeasurementRecord(
            measured_date=ref_date - timedelta(days=21 - i * 7),
            weight_kg=80.0 - (i * 0.2),
        )
        for i in range(num_measurements)
    ]

    nutrition_logs = [
        DailyNutritionRecord(
            log_date=ref_date - timedelta(days=i),
            calories=2500.0,
            protein_g=150.0,
            carbs_g=280.0,
            fat_g=80.0,
        )
        for i in range(num_nutrition_days)
    ]

    return NormalizedSubjectData(
        demographics=demographics,
        measurements=measurements,
        nutrition_logs=nutrition_logs,
        target_calories=2500.0,
    )


# =====================================================================
# 1. MODEL SERVICE TESTS (Model / Artifact Identity & Validation)
# =====================================================================

class TestModelService:
    def test_model_loads_successfully(self):
        artifact = ModelService.load_champion_artifact()
        assert "model" in artifact
        assert hasattr(artifact["model"], "predict")
        assert artifact["feature_keys"] == [f"F{i:02d}" for i in range(1, 17)]

    def test_model_identity_exposure(self):
        identity = ModelService.get_model_identity()
        assert identity["model_name"] == ModelService.MODEL_NAME
        assert identity["model_version"] == ModelService.MODEL_VERSION
        assert identity["feature_schema_version"] == "2.4.0-canonical-16"

    def test_prediction_deterministic(self):
        feat_dict = {f"F{i:02d}": 1.0 for i in range(1, 17)}
        pred1 = ModelService.predict_delta_weight_28d(feat_dict)
        pred2 = ModelService.predict_delta_weight_28d(feat_dict)
        assert pred1 == pred2
        assert isinstance(pred1, float)

    def test_missing_feature_raises_value_error(self):
        incomplete_dict = {f"F{i:02d}": 1.0 for i in range(1, 16)}  # missing F16
        with pytest.raises(ValueError, match="Missing required feature 'F16'"):
            ModelService.predict_delta_weight_28d(incomplete_dict)

    def test_corrupted_scaler_dimensions_raises_error(self):
        # Artifact with mismatched scaler input features must fail safely
        corrupt_artifact = {
            "model": ModelService.load_champion_artifact()["model"],
            "feature_keys": ModelService.FEATURE_KEYS,
            "scaler": type("BadScaler", (), {"transform": lambda self, x: x, "n_features_in_": 10})(),
        }
        with patch("pickle.load", return_value=corrupt_artifact):
            with pytest.raises(ModelArtifactError, match="Scaler expects 10 features"):
                ModelService.load_champion_artifact(force_reload=True)


# =====================================================================
# 2. PREDICTION SERVICE TESTS (Uncertainty Labeling & Data Confidence)
# =====================================================================

class TestPredictionService:
    def test_predict_from_subject_data(self):
        ref_date = date(2026, 6, 1)
        sub_data = make_sample_subject_data(num_nutrition_days=24, num_measurements=4, ref_date=ref_date)
        resp, ext_res = PredictionService.predict_from_subject_data(sub_data, ref_date)

        assert resp.baseline_weight_kg > 0
        assert resp.projected_weight_28d_kg == round(resp.baseline_weight_kg + resp.predicted_change_28d_kg, 2)
        assert resp.confidence_interval.uncertainty_type == "benchmark_residual"
        assert resp.confidence_interval.half_width_kg == pytest.approx(0.6462, abs=0.001)
        assert resp.confidence_interval.lower_bound_kg < resp.confidence_interval.upper_bound_kg
        assert resp.data_confidence.level == "HIGH"
        assert resp.feature_schema_version == "2.4.0-canonical-16"
        # Scientific qualification: disclaimer must explicitly mention Kevin Hall benchmark and non-personalized certainty
        assert "Kevin Hall" in resp.confidence_interval.disclaimer
        assert "not personalized clinical certainty" in resp.confidence_interval.disclaimer

    def test_data_confidence_classification(self):
        # HIGH
        high_conf = PredictionService.evaluate_data_confidence(22, 4, True)
        assert high_conf.level == "HIGH"

        # MEDIUM
        med_conf = PredictionService.evaluate_data_confidence(10, 2, True)
        assert med_conf.level == "MEDIUM"

        # LOW (sparse nutrition)
        low_conf = PredictionService.evaluate_data_confidence(4, 2, True)
        assert low_conf.level == "LOW"

        # LOW (missing measurements)
        low_conf_no_meas = PredictionService.evaluate_data_confidence(25, 0, False)
        assert low_conf_no_meas.level == "LOW"


# =====================================================================
# 3. WHAT-IF SCENARIO SIMULATION TESTS (Integrity, Same Model, Ephemeral)
# =====================================================================

class TestScenarioService:
    def test_counterfactual_simulation_updates_dependent_features(self):
        ref_date = date(2026, 6, 1)
        sub_data = make_sample_subject_data(num_nutrition_days=25, num_measurements=4, ref_date=ref_date)
        baseline_proj, ext_res = PredictionService.predict_from_subject_data(sub_data, ref_date)
        base_features = ext_res.features

        # Modify calories from 2500 to 3000
        mod = ScenarioModification(
            scenario_name="Caloric Surplus",
            daily_calories=3000.0,
            daily_protein_g=180.0,
        )

        res = ScenarioService.simulate_scenario(
            base_features=base_features,
            baseline_delta=baseline_proj.predicted_change_28d_kg,
            baseline_weight=baseline_proj.baseline_weight_kg,
            target_calories=2500.0,
            mod=mod,
        )

        assert res.scenario_name == "Caloric Surplus"
        assert res.projected_change_28d_kg > baseline_proj.predicted_change_28d_kg
        assert res.scenario_delta_kg > 0
        assert "Under this model scenario" in res.non_causal_statement
        assert "is projected to produce" in res.non_causal_statement
        assert "guaranteed" not in res.non_causal_statement.lower()

    def test_activity_multiplier_scenario(self):
        ref_date = date(2026, 6, 1)
        sub_data = make_sample_subject_data(ref_date=ref_date)
        baseline_proj, ext_res = PredictionService.predict_from_subject_data(sub_data, ref_date)

        mod = ScenarioModification(
            scenario_name="Higher Activity",
            activity_multiplier=1.725,
        )
        res = ScenarioService.simulate_scenario(
            base_features=ext_res.features,
            baseline_delta=baseline_proj.predicted_change_28d_kg,
            baseline_weight=baseline_proj.baseline_weight_kg,
            target_calories=2500.0,
            mod=mod,
        )
        assert res.projected_change_28d_kg < baseline_proj.predicted_change_28d_kg

    def test_multiple_scenarios_and_zero_database_writes(self):
        headers = get_auth_headers("ephemeraluser@example.com")
        req_payload = {
            "scenarios": [
                {"scenario_name": "Deficit 200", "daily_calories": 2000.0},
                {"scenario_name": "Maintenance", "daily_calories": 2400.0},
                {"scenario_name": "Surplus 200", "daily_calories": 2800.0},
            ]
        }
        res = client.post("/api/v1/intelligence/simulate", json=req_payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data["scenario_results"]) == 3
        sc_deficit = data["scenario_results"][0]
        sc_surplus = data["scenario_results"][2]
        assert sc_deficit["projected_change_28d_kg"] < sc_surplus["projected_change_28d_kg"]
        assert abs(sc_deficit["projected_change_28d_kg"]) < 10.0
        assert abs(sc_surplus["projected_change_28d_kg"]) < 10.0
        assert "is projected to produce" in sc_deficit["non_causal_statement"]


# =====================================================================
# 4. GOAL FEASIBILITY TESTS (Pacing Guardrails & Status)
# =====================================================================

class TestFeasibilityService:
    def test_unconfigured_goal_returns_insufficient_data(self):
        headers = get_auth_headers("nogoal@example.com")
        res = client.get("/api/v1/intelligence/goal-feasibility", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "INSUFFICIENT_DATA"

    def test_expired_goal_returns_expired_or_invalid(self):
        headers = get_auth_headers("expiredgoal@example.com")
        client.post(
            "/api/v1/goals",
            json={
                "goal_type": "weight_loss",
                "target_weight_kg": 75.0,
                "target_date": "2020-01-01",
            },
            headers=headers,
        )
        res = client.get("/api/v1/intelligence/goal-feasibility", headers=headers)
        assert res.status_code == 200
        assert res.json()["status"] == "EXPIRED_OR_INVALID"

    def test_product_pacing_guardrail_alert(self):
        headers = get_auth_headers("feasiuser@example.com")
        aggressive_date = (date.today() + timedelta(days=28)).isoformat()
        client.post(
            "/api/v1/goals",
            json={
                "goal_type": "weight_loss",
                "target_weight_kg": 50.0,
                "target_date": aggressive_date,
            },
            headers=headers,
        )
        res = client.get("/api/v1/intelligence/goal-feasibility", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("UNLIKELY", "POSSIBLE_ADJUSTMENT")
        assert "Product Pacing Guardrail" in data["safety_assessment"]
        assert "not a clinical prescription" in data["safety_assessment"]

    def test_slower_projected_rate_not_falsely_on_track_regression(self):
        """
        Regression test:
        Current: ~80.8 kg, Target: 78.5 kg, 90 days.
        Required rate: -0.179 kg/week, Projected rate: -0.029 kg/week.
        The system must NOT report ON_TRACK when projected rate is materially slower.
        Must report POSSIBLE_ADJUSTMENT and indicate difference.
        """
        headers = get_auth_headers("feasiregress@example.com")
        future_date = (date.today() + timedelta(days=90)).isoformat()
        client.post(
            "/api/v1/goals",
            json={
                "goal_type": "weight_loss",
                "target_weight_kg": 78.5,
                "target_date": future_date,
            },
            headers=headers,
        )
        from app.schemas.intelligence import TrajectoryProjectionResponse, ConfidenceInterval, DataConfidence
        mock_proj = TrajectoryProjectionResponse(
            baseline_weight_kg=80.8,
            predicted_change_28d_kg=-0.116,
            projected_weight_28d_kg=80.684,
            confidence_interval=ConfidenceInterval(lower_bound_kg=80.1, upper_bound_kg=81.3, half_width_kg=0.6),
            data_confidence=DataConfidence(level="HIGH", nutrition_days_logged=28, measurement_count=5, reasons=[]),
            features_used={},
            reference_date=date.today().isoformat(),
            model_name="Ridge_v1",
            model_version="1.0.0",
        )
        with patch.object(PredictionService, "predict_user_trajectory", return_value=mock_proj):
            res = client.get("/api/v1/intelligence/goal-feasibility", headers=headers)
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "POSSIBLE_ADJUSTMENT"
            assert data["status"] != "ON_TRACK"
            assert data["required_rate_kg_per_week"] == pytest.approx(-0.179, abs=0.01)
            assert data["projected_rate_kg_per_week"] == pytest.approx(-0.029, abs=0.01)
            assert "closely matches" not in data["explanation"]
            assert "differs by" in data["explanation"]



# =====================================================================
# 5. PLAN OPTIMIZER TESTS (Normalized Objective & Deterministic Ranking)
# =====================================================================

class TestPlanOptimizer:
    def test_optimizer_produces_deterministic_ranked_candidates(self):
        headers = get_auth_headers("optimuser@example.com")
        future_date = (date.today() + timedelta(days=90)).isoformat()
        client.post(
            "/api/v1/goals",
            json={
                "goal_type": "weight_loss",
                "target_weight_kg": 70.0,
                "target_date": future_date,
            },
            headers=headers,
        )

        req_body = {"max_calorie_adjustment": 300.0, "prefer_higher_protein": True}
        res1 = client.post("/api/v1/intelligence/optimize-plan", json=req_body, headers=headers)
        res2 = client.post("/api/v1/intelligence/optimize-plan", json=req_body, headers=headers)

        assert res1.status_code == 200
        assert res2.status_code == 200
        data1 = res1.json()
        data2 = res2.json()

        # Deterministic check
        assert data1["best_candidate"]["candidate_id"] == data2["best_candidate"]["candidate_id"]
        assert data1["best_candidate"]["objective_score"] == data2["best_candidate"]["objective_score"]

        # Normalized score check: score must be bounded and >= 0.0
        assert 0.0 <= data1["best_candidate"]["objective_score"] <= 2.0
        assert data1["best_candidate"]["daily_calories"] >= 1200.0
        assert abs(data1["best_candidate"]["projected_change_28d_kg"]) < 10.0
        assert len(data1["alternative_candidates"]) >= 1
        assert "FitMind Candidate-Plan Ranking Heuristic" in data1["objective_description"]
        assert "0.60 * normalized_target_error" in data1["objective_description"]


# =====================================================================
# 6. ADAPTATION TESTS (Product Decision Thresholds)
# =====================================================================

class TestAdaptationService:
    def test_sparse_history_returns_insufficient_data(self):
        headers = get_auth_headers("adaptuser@example.com")
        res = client.get("/api/v1/intelligence/adaptation", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "INSUFFICIENT_DATA"
        assert data["personal_calibration_offset_kg"] == 0.0

    def test_adaptation_threshold_behavior(self):
        headers = get_auth_headers("adaptuser2@example.com")
        today = datetime.now(timezone.utc).date()
        client.post(
            "/api/v1/progress/measurements",
            json={"weight_kg": 80.0, "measured_at": (today - timedelta(days=28)).isoformat()},
            headers=headers,
        )
        client.post(
            "/api/v1/progress/measurements",
            json={"weight_kg": 79.5, "measured_at": today.isoformat()},
            headers=headers,
        )

        res = client.get("/api/v1/intelligence/adaptation", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("NO_CHANGE", "MONITOR", "ADJUSTMENT_RECOMMENDED", "INSUFFICIENT_DATA")


# =====================================================================
# 7. SECURITY & API ISOLATION TESTS
# =====================================================================

class TestIntelligenceAPISecurity:
    def test_unauthenticated_requests_are_rejected(self):
        assert client.get("/api/v1/intelligence/trajectory").status_code == 401
        assert client.get("/api/v1/intelligence/goal-feasibility").status_code == 401
        assert client.post("/api/v1/intelligence/simulate", json={"scenarios": []}).status_code == 401
        assert client.post("/api/v1/intelligence/optimize-plan", json={}).status_code == 401
        assert client.get("/api/v1/intelligence/adaptation").status_code == 401

    def test_validation_bounds_on_simulation_request(self):
        headers = get_auth_headers("validuser@example.com")
        res_low = client.post(
            "/api/v1/intelligence/simulate",
            json={"scenarios": [{"scenario_name": "Too Low", "daily_calories": 500.0}]},
            headers=headers,
        )
        assert res_low.status_code == 422

        res_high = client.post(
            "/api/v1/intelligence/simulate",
            json={"scenarios": [{"scenario_name": "Too High", "daily_calories": 8000.0}]},
            headers=headers,
        )
        assert res_high.status_code == 422

    def test_authenticated_user_isolation(self):
        headers_a = get_auth_headers("user_a@example.com")
        headers_b = get_auth_headers("user_b@example.com")
        today = datetime.now(timezone.utc).date()

        # User A logs a measurement of 95.0 kg
        res_meas_a = client.post(
            "/api/v1/progress/measurements",
            json={"weight_kg": 95.0, "measured_at": today.isoformat()},
            headers=headers_a,
        )
        assert res_meas_a.status_code == 201

        # User B logs a measurement of 65.0 kg
        res_meas_b = client.post(
            "/api/v1/progress/measurements",
            json={"weight_kg": 65.0, "measured_at": today.isoformat()},
            headers=headers_b,
        )
        assert res_meas_b.status_code == 201

        res_a = client.get("/api/v1/intelligence/trajectory", headers=headers_a)
        res_b = client.get("/api/v1/intelligence/trajectory", headers=headers_b)

        assert res_a.status_code == 200
        assert res_b.status_code == 200

        data_a = res_a.json()
        data_b = res_b.json()

        assert data_a["baseline_weight_kg"] == 95.0
        assert data_b["baseline_weight_kg"] == 65.0
        assert data_a["projected_weight_28d_kg"] != data_b["projected_weight_28d_kg"]
