from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.limiter import limiter
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
@limiter.limit(settings.RATE_LIMIT_REGISTER)
def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user account."""
    user = AuthService.register_user(db, req)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate and receive access + refresh JWT tokens."""
    return AuthService.authenticate_user(db, req)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
def refresh(request: Request, req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using valid refresh token (rotates refresh token)."""
    return AuthService.refresh_access_token(db, req.refresh_token)


@router.post("/logout", response_model=MessageResponse)
def logout(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Revoke refresh token session."""
    AuthService.logout_user(db, req.refresh_token)
    return MessageResponse(message="Successfully logged out")
