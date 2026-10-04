from urllib.parse import urlparse
from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
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


def verify_csrf_origin(request: Request) -> None:
    """
    Validates Origin or Referer header on cookie-authenticated mutation endpoints
    to protect against Cross-Site Request Forgery (CSRF).
    """
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    if not origin and not referer:
        if settings.is_production:
            cookie = request.cookies.get(settings.REFRESH_COOKIE_NAME)
            if cookie:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Origin or Referer header required for cookie authentication",
                )
        return

    check_url = origin
    if not check_url and referer:
        parsed = urlparse(referer)
        check_url = f"{parsed.scheme}://{parsed.netloc}"

    if check_url:
        check_url = check_url.rstrip("/")
        allowed_origins = [
            o.rstrip("/")
            for o in (settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS])
        ]

        if not settings.is_production:
            if "localhost" in check_url or "127.0.0.1" in check_url or "testserver" in check_url:
                return

        if check_url not in allowed_origins:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF origin validation failed",
            )


def set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=raw_token,
        max_age=settings.REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
        path=settings.REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_REGISTER)
def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user account."""
    user = AuthService.register_user(db, req)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(request: Request, response: Response, req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate and receive access token in JSON and refresh token in secure HttpOnly cookie."""
    token_response = AuthService.authenticate_user(db, req)
    raw_refresh_token = token_response.refresh_token
    if raw_refresh_token:
        set_refresh_cookie(response, raw_refresh_token)
    
    # Do not leak refresh token in response body
    token_response.refresh_token = None
    return token_response


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
def refresh(
    request: Request,
    response: Response,
    req: Optional[RefreshTokenRequest] = None,
    db: Session = Depends(get_db),
):
    """Refresh access token using HttpOnly cookie or fallback body token (rotates refresh token)."""
    verify_csrf_origin(request)
    raw_refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME) or (req.refresh_token if req else None)

    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_response = AuthService.refresh_access_token(db, raw_refresh_token)
    new_raw_refresh = token_response.refresh_token
    if new_raw_refresh:
        set_refresh_cookie(response, new_raw_refresh)

    # Do not leak refresh token in response body
    token_response.refresh_token = None
    return token_response


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    req: Optional[RefreshTokenRequest] = None,
    db: Session = Depends(get_db),
):
    """Revoke refresh token session and clear HttpOnly refresh cookie."""
    verify_csrf_origin(request)
    raw_refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME) or (req.refresh_token if req else None)

    if raw_refresh_token:
        AuthService.logout_user(db, raw_refresh_token)

    clear_refresh_cookie(response)
    return MessageResponse(message="Successfully logged out")
