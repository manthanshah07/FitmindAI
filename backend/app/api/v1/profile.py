from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.profile import ProfileResponse, ProfileUpdate, OnboardingCreate
from app.services.profile_service import ProfileService

router = APIRouter()


@router.get("", response_model=ProfileResponse)
@router.get("/me", response_model=ProfileResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """Fetch current user's profile information."""
    return ProfileService.get_profile(db, current_user)


@router.put("", response_model=ProfileResponse)
@router.put("/me", response_model=ProfileResponse)
@router.patch("", response_model=ProfileResponse)
@router.patch("/me", response_model=ProfileResponse)
def update_current_user_profile(
    req: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """Update profile fields for the authenticated user."""
    return ProfileService.update_profile(db, current_user, req)


@router.post("/onboarding", response_model=ProfileResponse, status_code=status.HTTP_200_OK)
def complete_user_onboarding(
    req: OnboardingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """Submit initial onboarding data and mark onboarding_complete = true (Idempotent)."""
    return ProfileService.complete_onboarding(db, current_user, req)
