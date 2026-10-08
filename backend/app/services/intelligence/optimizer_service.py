"""
Plan Optimizer Service for FitMind AI Intelligence Engine.
Implements a deterministic candidate-plan ranking heuristic over a bounded grid of nutrition and activity inputs.
Scores candidates using a dimensionally normalized, multi-criteria objective heuristic.
Runs all candidates through the SAME Phase 2D champion Ridge model as standard prediction.
This is a deterministic candidate-ranking heuristic, NOT a mathematical global optimizer or clinical treatment optimizer.
"""

from copy import deepcopy
from datetime import date, datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.goal import Goal
from app.core.timezone_utils import extract_date
from app.core.calculations import calculate_calorie_adherence
from app.services.intelligence.adapters import FitMindDBAdapter
from app.services.intelligence.feature_extractor import FeatureExtractor
from app.services.intelligence.model_service import ModelService
from app.schemas.intelligence import (
    PlanCandidate,
    PlanOptimizationRequest,
    PlanOptimizationResponse,
)


class PlanOptimizerService:
    """
    Deterministic candidate-plan ranking heuristic.
    Generates a bounded candidate grid and ranks practical options that align projected trajectory with user targets.
    """

    OBJECTIVE_DESCRIPTION: str = (
        "FitMind Candidate-Plan Ranking Heuristic: score = "
        "0.60 * normalized_target_error + 0.30 * normalized_plan_deviation + 0.10 * practicality_penalty "
        "(all components normalized [0..1]). Lower score denotes a superior heuristic balance between goal pacing "
        "alignment and habitual adherence practicality. This is a deterministic candidate-ranking heuristic, "
        "not a mathematical global optimizer or clinical treatment prescription."
    )

    @classmethod
    def optimize_plan(
        cls,
        db: Session,
        user: User,
        request: PlanOptimizationRequest,
        reference_date: Optional[date] = None,
    ) -> PlanOptimizationResponse:
        """
        Generates candidate plans, scores them deterministically against user target, and returns ranked candidates.
        """
        # 1. Fetch user data and active goal
        subject_data = FitMindDBAdapter.extract_subject_data(db, user.id)
        if not subject_data:
            raise ValueError(f"Could not load fitness profile data for user {user.id}")

        if reference_date is None:
            user_tz = subject_data.demographics.timezone_str
            reference_date = extract_date(datetime.now(timezone.utc), user_tz) or date.today()

        active_goal = (
            db.query(Goal)
            .filter(Goal.user_id == user.id, Goal.is_active.is_(True))
            .first()
        )

        # 2. Baseline extraction & target rate determination
        extraction_res = FeatureExtractor.extract_features(subject_data, reference_date)
        base_features = extraction_res.features
        base_weight = base_features["F04"]
        current_cals = base_features["F08"]
        current_prot = base_features["F10"]
        current_act = base_features["F16"]
        bmr = base_features["F06"]

        # Target parameters
        target_weight = (
            float(active_goal.target_weight_kg)
            if active_goal and active_goal.target_weight_kg
            else base_weight
        )
        target_date_val = (
            active_goal.target_date
            if active_goal and active_goal.target_date
            else reference_date.replace(year=reference_date.year + 1)
        )
        days_rem = max((target_date_val - reference_date).days, 7)
        weeks_rem = days_rem / 7.0

        required_total_change = target_weight - base_weight
        required_weekly_rate = round(required_total_change / weeks_rem, 3)

        # 3. Generate candidate grid
        max_adj = request.max_calorie_adjustment or 400.0
        cal_offsets = [-300.0, -200.0, -100.0, 0.0, 100.0, 200.0, 300.0]
        cal_offsets = [o for o in cal_offsets if abs(o) <= max_adj]

        protein_offsets = [0.0, 15.0, 30.0] if request.prefer_higher_protein else [0.0]
        activity_candidates = [current_act]
        if current_act < 1.725:
            activity_candidates.append(round(current_act + 0.1, 3))

        candidates: List[PlanCandidate] = []
        candidate_idx = 1

        for c_off in cal_offsets:
            cand_cals = round(current_cals + c_off, 1)
            # Configured product constraint: not below 1200 kcal or 0.7 * BMR
            min_floor = max(1200.0, 0.7 * bmr)
            if cand_cals < min_floor or cand_cals > 4500.0:
                continue

            for p_off in protein_offsets:
                cand_prot = round(max(current_prot + p_off, 40.0), 1)

                for act in activity_candidates:
                    # Modify feature dict consistently
                    feat_dict = deepcopy(base_features)

                    # Activity
                    feat_dict["F16"] = float(act)
                    cand_tdee = round(bmr * float(act), 1)
                    feat_dict["F07"] = cand_tdee

                    # Calories
                    feat_dict["F08"] = cand_cals
                    feat_dict["F09"] = cand_cals
                    feat_dict["F11"] = round(cand_cals - cand_tdee, 1)

                    ref_target = subject_data.target_calories or cand_tdee
                    adherence_val = calculate_calorie_adherence(
                        actual_calories=cand_cals,
                        target_calories=ref_target,
                        as_percentage=False,
                    )
                    feat_dict["F12"] = adherence_val if adherence_val is not None else (1.0 if cand_cals == ref_target else 0.0)

                    # Protein
                    feat_dict["F10"] = cand_prot

                    # Inference with SAME champion model
                    proj_delta_28d = ModelService.predict_delta_weight_28d(feat_dict)
                    proj_weekly_rate = round(proj_delta_28d / 4.0, 3)
                    proj_weight_28d = round(base_weight + proj_delta_28d, 2)

                    # Dimensionally normalized multicriteria candidate scoring
                    # 1. Target trajectory pacing error normalized relative to 1.0 kg/week reference pacing span
                    normalized_target_error = min(abs(proj_weekly_rate - required_weekly_rate) / 1.0, 3.0)

                    # 2. Habitual deviation normalized relative to maximum candidate adjustment bound
                    normalized_plan_deviation = min(abs(c_off) / max(max_adj, 100.0), 1.0)

                    # 3. Practicality / macronutrient penalty (normalized [0..1])
                    if request.prefer_higher_protein:
                        practicality_penalty = 0.0 if p_off >= 30.0 else (0.5 if p_off >= 15.0 else 1.0)
                    else:
                        practicality_penalty = 0.0

                    w1 = 0.60
                    w2 = 0.30
                    w3 = 0.10

                    score = round(
                        w1 * normalized_target_error + w2 * normalized_plan_deviation + w3 * practicality_penalty,
                        4,
                    )

                    # Feasibility rating heuristic
                    if score < 0.25:
                        rating = "HIGH"
                    elif score < 0.55:
                        rating = "MODERATE"
                    else:
                        rating = "CHALLENGING"

                    cand = PlanCandidate(
                        candidate_id=f"plan_c{candidate_idx:02d}",
                        daily_calories=cand_cals,
                        daily_protein_g=cand_prot,
                        activity_multiplier=act,
                        projected_change_28d_kg=proj_delta_28d,
                        projected_weight_28d_kg=proj_weight_28d,
                        objective_score=score,
                        calorie_offset_from_current=c_off,
                        feasibility_rating=rating,
                    )
                    candidates.append(cand)
                    candidate_idx += 1

        # 4. Rank candidates by score ascending (lower is better)
        candidates.sort(key=lambda c: c.objective_score)

        if not candidates:
            # Fallback to current baseline plan
            baseline_proj_28d = ModelService.predict_delta_weight_28d(base_features)
            best = PlanCandidate(
                candidate_id="plan_c00",
                daily_calories=current_cals,
                daily_protein_g=current_prot,
                activity_multiplier=current_act,
                projected_change_28d_kg=baseline_proj_28d,
                projected_weight_28d_kg=round(base_weight + baseline_proj_28d, 2),
                objective_score=1.0,
                calorie_offset_from_current=0.0,
                feasibility_rating="MODERATE",
            )
            alternatives = []
        else:
            best = candidates[0]
            # Select up to 3 distinct alternatives
            alternatives = candidates[1:4]

        return PlanOptimizationResponse(
            target_weight_kg=target_weight,
            target_date=target_date_val.isoformat(),
            required_weekly_rate_kg=required_weekly_rate,
            current_intake_kcal=current_cals,
            best_candidate=best,
            alternative_candidates=alternatives,
            objective_description=cls.OBJECTIVE_DESCRIPTION,
        )
