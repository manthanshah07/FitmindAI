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
        for key, value in update_data.items():
            setattr(profile, key, value)

        db.commit()
        db.refresh(profile)
        return ProfileResponse.model_validate(profile)

    @staticmethod
    def complete_onboarding(db: Session, user: User, data: OnboardingCreate) -> ProfileResponse:
        profile = ProfileService.get_or_create_profile(db, user)

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(profile, key, value)

        profile.onboarding_complete = True
        db.commit()
        db.refresh(profile)
        return ProfileResponse.model_validate(profile)
