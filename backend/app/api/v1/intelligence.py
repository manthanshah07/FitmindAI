"""
Intelligence Engine API endpoints for FitMind AI (Phase 2E).
Exposes trajectory projection, goal feasibility, What-If simulation,
plan optimization, and adaptive monitoring.
Strictly isolated to authenticated users; all calculations are deterministic.
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.intelligence import (
    TrajectoryProjectionResponse,
    GoalFeasibilityResponse,
    ScenarioSimulationRequest,
    ScenarioSimulationResponse,
    PlanOptimizationRequest,
    PlanOptimizationResponse,
    AdaptationStatusResponse,
)
from app.services.intelligence import (
    PredictionService,
    FeasibilityService,
    ScenarioService,
    PlanOptimizerService,
    AdaptationService,
)

router = APIRouter()


@router.get(
    "/trajectory",
    response_model=TrajectoryProjectionResponse,
    summary="Get 28-day body-weight projection",
    description="Returns model-projected 28-day body-weight change, benchmark uncertainty intervals, and data confidence.",
)
def get_user_trajectory(
    reference_date: Optional[date] = Query(None, description="Point-in-time reference date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrajectoryProjectionResponse:
    """Computes deterministic 28-day weight change projection for the authenticated user."""
    return PredictionService.predict_user_trajectory(
        db=db,
        user=current_user,
        reference_date=reference_date,
    )


@router.get(
    "/goal-feasibility",
    response_model=GoalFeasibilityResponse,
    summary="Evaluate active goal feasibility",
    description="Compares required rate of change against projected trajectory and checks product safety heuristics.",
)
def get_goal_feasibility(
    reference_date: Optional[date] = Query(None, description="Point-in-time reference date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalFeasibilityResponse:
    """Evaluates whether active goal rate is feasible compared to 28-day projection."""
    return FeasibilityService.evaluate_goal(
        db=db,
        user=current_user,
        reference_date=reference_date,
    )


@router.post(
    "/simulate",
    response_model=ScenarioSimulationResponse,
    summary="Simulate What-If counterfactual scenarios",
    description="Runs one or more hypothetical parameter modifications through the champion Ridge model.",
)
def simulate_scenarios(
    request: ScenarioSimulationRequest,
    reference_date: Optional[date] = Query(None, description="Point-in-time reference date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScenarioSimulationResponse:
    """Simulates counterfactual nutrition and activity scenarios (ephemeral, non-causal)."""
    return ScenarioService.simulate_user_scenarios(
        db=db,
        user=current_user,
        request=request,
        reference_date=reference_date,
    )


@router.post(
    "/optimize-plan",
    response_model=PlanOptimizationResponse,
    summary="Find candidate plan adjustments",
    description="Generates a bounded candidate grid and scores candidates using a multi-criteria objective.",
)
def optimize_plan(
    request: PlanOptimizationRequest,
    reference_date: Optional[date] = Query(None, description="Point-in-time reference date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlanOptimizationResponse:
    """Deterministic candidate plan grid search to help user achieve active goal."""
    return PlanOptimizerService.optimize_plan(
        db=db,
        user=current_user,
        request=request,
        reference_date=reference_date,
    )


@router.get(
    "/adaptation",
    response_model=AdaptationStatusResponse,
    summary="Check trajectory adaptation status",
    description="Compares actual longitudinal weight change with past model projections and identifies primary drivers.",
)
def get_adaptation_status(
    reference_date: Optional[date] = Query(None, description="Point-in-time reference date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdaptationStatusResponse:
    """Evaluates whether recent progress calls for plan adaptation or continued monitoring."""
    return AdaptationService.evaluate_adaptation(
        db=db,
        user=current_user,
        reference_date=reference_date,
    )
