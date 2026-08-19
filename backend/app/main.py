from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter, custom_rate_limit_handler
from app.api.v1.router import api_v1_router

app = FastAPI(
    title="FitMind AI API",
    description="Backend service for FitMind AI personalized fitness coach",
    version="1.0.0",
)

# Register SlowAPI Limiter state & custom 429 exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

# CORS middleware configuration
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount API v1 router
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check():
    """Unprotected health check endpoint."""
    return {"status": "ok"}
