from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse, status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
def get_dashboard_summary(
    request: Request,
    date_ref: Optional[date] = Query(None, alias="date", description="Target reference date (YYYY-MM-DD) for dashboard summary"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardSummaryResponse:
    """
    Authenticated endpoint returning lightweight 1-shot dashboard summary.
    Reuses backend ReportService and NutritionService deterministic calculations
    without invoking Gemini LLM or creating database side-effects.
    """
    return DashboardService.get_dashboard_summary(
        db=db,
        user=current_user,
        target_date=date_ref,
    )
