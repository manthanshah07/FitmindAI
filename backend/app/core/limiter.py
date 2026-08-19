import logging
from typing import Optional
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.security import decode_token

logger = logging.getLogger(__name__)


def get_user_or_ip_identifier(request: Request) -> str:
    """
    Rate limit key function.
    Attempts to identify authenticated user by decoding Bearer JWT access token.
    Falls back to remote IP address for unauthenticated requests.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                user_id = payload.get("sub")
                if user_id:
                    return f"user:{user_id}"
        except Exception:
            pass
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=get_user_or_ip_identifier,
    enabled=settings.RATE_LIMIT_ENABLED,
)


def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Standardized JSON response for HTTP 429 Rate Limit Exceeded.
    Excludes stack traces and internal exceptions.
    """
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}. Please wait before retrying.",
            "error_code": "RATE_LIMIT_EXCEEDED",
        },
        headers={"Retry-After": "60"},
    )
