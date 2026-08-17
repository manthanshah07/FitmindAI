from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.progress import (
    MeasurementCreate,
    MeasurementResponse,
    ProgressSummaryResponse,
)
from app.services.progress_service import ProgressService

router = APIRouter()


@router.get("/summary", response_model=ProgressSummaryResponse)
def get_progress_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProgressSummaryResponse:
    """Get aggregated progress & weight measurement trends."""
    return ProgressService.get_progress_summary(db, current_user)


@router.get("/measurements", response_model=List[MeasurementResponse])
def get_measurements(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[MeasurementResponse]:
    """Get body measurement history for authenticated user (paginated)."""
    return ProgressService.get_measurements(db, current_user, limit=limit, skip=skip)


@router.post("/measurements", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
def create_measurement(
    req: MeasurementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeasurementResponse:
    """Log a new body weight or body measurement record."""
    return ProgressService.create_measurement(db, current_user, req)


@router.get("/measurements/{measurement_id}", response_model=MeasurementResponse)
def get_measurement_by_id(
    measurement_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeasurementResponse:
    """Get specific measurement record detail (User Isolated)."""
    record = ProgressService.get_measurement_by_id(db, current_user, measurement_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Measurement record not found"
        )
    return record
