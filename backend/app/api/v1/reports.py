from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.limiter import limiter
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.report import FitnessReportResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/weekly", response_model=FitnessReportResponse, status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_REPORTS)
def get_weekly_report(
    request: Request,
    date_ref: Optional[date] = Query(None, alias="date", description="Target reference date (YYYY-MM-DD) for weekly 7-day report period"),
    ai: bool = Query(True, description="Whether to generate AI narrative summary"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FitnessReportResponse:
    """
    Authenticated endpoint returning deterministic 7-day weekly fitness progress report.
    """
    return ReportService.generate_weekly_report(
        db=db,
        user=current_user,
        target_date=date_ref,
        include_ai_narrative=ai,
    )


@router.get("/monthly", response_model=FitnessReportResponse, status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_REPORTS)
def get_monthly_report(
    request: Request,
    date_ref: Optional[date] = Query(None, alias="date", description="Target reference date (YYYY-MM-DD) for calendar-month report period"),
    ai: bool = Query(True, description="Whether to generate AI narrative summary"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FitnessReportResponse:
    """
    Authenticated endpoint returning deterministic calendar-month fitness progress report.
    """
    return ReportService.generate_monthly_report(
        db=db,
        user=current_user,
        target_date=date_ref,
        include_ai_narrative=ai,
    )
