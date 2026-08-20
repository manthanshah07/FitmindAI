from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.profile import Profile
from app.models.refresh_token import RefreshToken
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.core.security import (
    hash_password,
    verify_password,
    hash_token,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class AuthService:
    @staticmethod
    def register_user(db: Session, req: RegisterRequest) -> User:
        normalized_email = req.email.strip().lower()
        
        # Check if email is already registered
        existing_user = db.query(User).filter(User.email == normalized_email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered",
            )
            
        hashed_pw = hash_password(req.password)
        user = User(
            email=normalized_email,
            password_hash=hashed_pw,
            is_active=True,
            is_verified=False,
        )
        db.add(user)
        db.flush()  # Obtain user.id before creating dependent Profile

        # Eagerly create the user's Profile using the provided full_name.
        # This prevents the registration full_name from being silently discarded.
        # If no name provided, fall back to the email prefix (same as lazy creation path).
        display_name = (req.full_name or "").strip() or normalized_email.split("@")[0].capitalize()
        profile = Profile(
            user_id=user.id,
            full_name=display_name,
            onboarding_complete=False,
        )
        db.add(profile)

        db.commit()
        db.refresh(user)
        return user


    @staticmethod
    def authenticate_user(db: Session, req: LoginRequest) -> TokenResponse:
        normalized_email = req.email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()
        
        # Generic error message to prevent email enumeration
        invalid_credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

        if not user or not verify_password(req.password, user.password_hash):
            raise invalid_credentials_exception

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        # Issue Tokens
        token_data = {"sub": str(user.id)}
        access_token = create_access_token(token_data)
        raw_refresh_token = create_refresh_token(token_data)

        # Persist refresh token hash in DB
        refresh_hash = hash_token(raw_refresh_token)
        refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=utc_now() + timedelta(days=30),
            is_revoked=False,
        )
        db.add(refresh_record)
        db.commit()

        user_response = UserResponse(
            id=user.id,
            email=user.email,
            full_name=None,
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_admin=user.is_admin,
            created_at=user.created_at,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="bearer",
            user=user_response,
        )

    @staticmethod
    def refresh_access_token(db: Session, raw_refresh_token: str) -> TokenResponse:
        invalid_token_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            payload = decode_token(raw_refresh_token)
            if payload.get("type") != "refresh":
                raise invalid_token_exception
            user_id_str = payload.get("sub")
            if not user_id_str:
                raise invalid_token_exception
            user_id = UUID(user_id_str)
        except Exception:
            raise invalid_token_exception

        token_hash_val = hash_token(raw_refresh_token)
        refresh_record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash_val).first()

        if not refresh_record or refresh_record.is_revoked or ensure_utc(refresh_record.expires_at) <= utc_now():
            raise invalid_token_exception

        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise invalid_token_exception

        # Revoke old refresh token (Token Rotation)
        refresh_record.is_revoked = True
        refresh_record.revoked_at = utc_now()
        db.add(refresh_record)

        # Issue new token pair
        token_data = {"sub": str(user.id)}
        new_access_token = create_access_token(token_data)
        new_raw_refresh_token = create_refresh_token(token_data)

        new_refresh_hash = hash_token(new_raw_refresh_token)
        new_refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=new_refresh_hash,
            expires_at=utc_now() + timedelta(days=30),
            is_revoked=False,
        )
        db.add(new_refresh_record)
        db.commit()

        user_response = UserResponse(
            id=user.id,
            email=user.email,
            full_name=None,
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_admin=user.is_admin,
            created_at=user.created_at,
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_raw_refresh_token,
            token_type="bearer",
            user=user_response,
        )

    @staticmethod
    def logout_user(db: Session, raw_refresh_token: str) -> None:
        try:
            token_hash_val = hash_token(raw_refresh_token)
            refresh_record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash_val).first()
            if refresh_record and not refresh_record.is_revoked:
                refresh_record.is_revoked = True
                refresh_record.revoked_at = utc_now()
                db.add(refresh_record)
                db.commit()
        except Exception:
            # Logout should fail silently/gracefully without leaking internal errors
            pass
