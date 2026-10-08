"""
What-If Scenario Simulation Service for FitMind AI Intelligence Engine.
Executes hypothetical counterfactual projections using the SAME Phase 2D champion Ridge model.
Guarantees consistent recalculation of dependent features and strictly non-causal reporting.
All scenarios are ephemeral and never written to the database.
"""

from copy import deepcopy
from datetime import date, datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.core.timezone_utils import extract_date
from app.services.intelligence.adapters import FitMindDBAdapter
from app.services.intelligence.contracts import NormalizedSubjectData, FeatureVector
from app.services.intelligence.feature_extractor import FeatureExtractor
from app.services.intelligence.model_service import ModelService
from app.services.intelligence.prediction_service import PredictionService
from app.schemas.intelligence import (
    ScenarioModification,
    ScenarioResult,
    ScenarioSimulationRequest,
    ScenarioSimulationResponse,
    TrajectoryProjectionResponse,
)


class ScenarioService:
    """
    Simulates counterfactual nutrition and activity adjustments.
    Uses the exact same champion Ridge model as standard prediction.
    """

    @classmethod
    def simulate_scenario(
        cls,
        base_features: Dict[str, float],
        baseline_delta: float,
        baseline_weight: float,
        target_calories: Optional[float],
        mod: ScenarioModification,
    ) -> ScenarioResult:
        """
        Creates a consistent scenario feature vector, predicts outcome, and computes deltas.
        """
        # 1. Copy base feature dictionary
        feat_dict: Dict[str, float] = deepcopy(base_features)

        # 2. Modify controllable inputs and recalculate dependent features
        new_cals = mod.daily_calories
        new_prot = mod.daily_protein_g
        new_act = mod.activity_multiplier

        # Activity change updates F16, and downstream metabolic expenditure (F07 TDEE, F11 Balance)
        if new_act is not None:
            feat_dict["F16"] = float(new_act)
            bmr = feat_dict["F06"]
            tdee = round(bmr * float(new_act), 1)
            feat_dict["F07"] = tdee
            # Recompute calorie balance with whatever calories are current
            cals = feat_dict["F08"]
            feat_dict["F11"] = round(cals - tdee, 1)

        # Calorie change updates F08, F09, and downstream balance (F11) and adherence (F12)
        if new_cals is not None:
            feat_dict["F08"] = float(new_cals)
            feat_dict["F09"] = float(new_cals)
            tdee = feat_dict["F07"]
            feat_dict["F11"] = round(float(new_cals) - tdee, 1)

            ref_target = target_calories if target_calories and target_calories > 0 else tdee
            adherence = (float(new_cals) / ref_target) * 100.0 if ref_target > 0 else 100.0
            feat_dict["F12"] = round(adherence, 1)

        # Protein change updates F10
        if new_prot is not None:
            feat_dict["F10"] = float(new_prot)

        # 3. Inference with the SAME champion model
        scenario_delta = ModelService.predict_delta_weight_28d(feat_dict)
        scenario_projected_weight = round(baseline_weight + scenario_delta, 2)
        diff_from_baseline = round(scenario_delta - baseline_delta, 4)

        # 4. Formulate strictly non-causal statement
        mod_descriptions: List[str] = []
        if new_cals is not None:
            mod_descriptions.append(f"intake to {new_cals:.0f} kcal/day")
        if new_prot is not None:
            mod_descriptions.append(f"protein to {new_prot:.0f} g/day")
        if new_act is not None:
            mod_descriptions.append(f"activity factor to {new_act:.2f}")

        mod_str = ", ".join(mod_descriptions) if mod_descriptions else "parameters"
        non_causal_statement = (
            f"Under this model scenario, adjusting {mod_str} is projected to produce "
            f"approximately {diff_from_baseline:+.2f} kg difference in 28-day weight change "
            f"relative to baseline (projected change: {scenario_delta:+.2f} kg vs {baseline_delta:+.2f} kg)."
        )

        input_mods: Dict[str, Any] = {}
        if new_cals is not None:
            input_mods["daily_calories"] = new_cals
        if new_prot is not None:
            input_mods["daily_protein_g"] = new_prot
        if new_act is not None:
            input_mods["activity_multiplier"] = new_act

        return ScenarioResult(
            scenario_name=mod.scenario_name,
            input_modifications=input_mods,
            projected_change_28d_kg=scenario_delta,
            projected_weight_28d_kg=scenario_projected_weight,
            scenario_delta_kg=diff_from_baseline,
            non_causal_statement=non_causal_statement,
        )

    @classmethod
    def simulate_user_scenarios(
        cls,
        db: Session,
        user: User,
        request: ScenarioSimulationRequest,
        reference_date: Optional[date] = None,
    ) -> ScenarioSimulationResponse:
        """
        Executes a batch of What-If scenarios for the authenticated user.
        """
        subject_data = FitMindDBAdapter.extract_subject_data(db, user.id)
        if not subject_data:
            raise ValueError(f"Could not load fitness profile data for user {user.id}")

        if reference_date is None:
            user_tz = subject_data.demographics.timezone_str
            reference_date = extract_date(datetime.now(timezone.utc), user_tz) or date.today()

        # 1. Baseline prediction
        baseline_proj, extraction_res = PredictionService.predict_from_subject_data(
            subject_data=subject_data,
            reference_date=reference_date,
        )

        base_features = extraction_res.features
        baseline_delta = baseline_proj.predicted_change_28d_kg
        baseline_weight = baseline_proj.baseline_weight_kg

        # 2. Simulate each scenario
        results: List[ScenarioResult] = []
        for mod in request.scenarios:
            res = cls.simulate_scenario(
                base_features=base_features,
                baseline_delta=baseline_delta,
                baseline_weight=baseline_weight,
                target_calories=subject_data.target_calories,
                mod=mod,
            )
            results.append(res)

        return ScenarioSimulationResponse(
            baseline_projection=baseline_proj,
            scenario_results=results,
        )
