from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.profile import Profile
from app.schemas.profile import ProfileUpdate, OnboardingCreate, ProfileResponse


class ProfileService:
    @staticmethod
    def get_or_create_profile(db: Session, user: User) -> Profile:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if not profile:
            default_name = user.email.split("@")[0].capitalize()
            profile = Profile(
                user_id=user.id,
                full_name=default_name,
                onboarding_complete=False,
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
        return profile

    @staticmethod
    def get_profile(db: Session, user: User) -> ProfileResponse:
        profile = ProfileService.get_or_create_profile(db, user)
        return ProfileResponse.model_validate(profile)

    @staticmethod
    def update_profile(db: Session, user: User, data: ProfileUpdate) -> ProfileResponse:
        profile = ProfileService.get_or_create_profile(db, user)

        # Omitted fields remain unchanged; explicit null values clear optional fields.
        update_data = data.model_dump(exclude_unset=True)
        required_fields = {"full_name"}

        for key, value in update_data.items():
            if key in required_fields:
                if value is None or (isinstance(value, str) and not value.strip()):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Field '{key}' is required and cannot be cleared",
                    )
                setattr(profile, key, value.strip())
            else:
                # Nullable optional fields: explicitly setting None clears the stored value
                setattr(profile, key, value)

        db.commit()
        db.refresh(profile)
        return ProfileResponse.model_validate(profile)

    @staticmethod
    def complete_onboarding(db: Session, user: User, data: OnboardingCreate) -> ProfileResponse:
        profile = ProfileService.get_or_create_profile(db, user)

        update_data = data.model_dump(exclude_unset=True)
        required_fields = {"full_name"}

        for key, value in update_data.items():
            if key in required_fields:
                if value is not None and value.strip():
                    setattr(profile, key, value.strip())
            else:
                if value is not None:
                    setattr(profile, key, value)

        profile.onboarding_complete = True
        db.commit()
        db.refresh(profile)
        return ProfileResponse.model_validate(profile)
