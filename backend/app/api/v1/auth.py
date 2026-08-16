from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserResponse,
    MessageResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user account."""
    user = AuthService.register_user(db, req)
    return user


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate and receive access + refresh JWT tokens."""
    return AuthService.authenticate_user(db, req)


@router.post("/refresh", response_model=TokenResponse)
def refresh(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using valid refresh token (rotates refresh token)."""
    return AuthService.refresh_access_token(db, req.refresh_token)


@router.post("/logout", response_model=MessageResponse)
def logout(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Revoke refresh token session."""
    AuthService.logout_user(db, req.refresh_token)
    return MessageResponse(message="Successfully logged out")
