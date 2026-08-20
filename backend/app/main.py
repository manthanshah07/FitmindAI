import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.limiter import limiter, custom_rate_limit_handler
from app.api.v1.router import api_v1_router
from app.seed_demo_data import seed_test_subjects

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    seed_flag = (
        os.getenv("SEED_TEST_SUBJECTS_PRODUCTION", "").lower() in ("true", "1", "yes")
        or os.getenv("DEMO_SEED_PRODUCTION", "").lower() in ("true", "1", "yes")
    )
    if seed_flag:
        print("[Startup] SEED_TEST_SUBJECTS_PRODUCTION flag detected. Seeding test subject accounts...")
        db = SessionLocal()
        try:
            seeded_emails = seed_test_subjects(db)
            print(f"[Startup] Successfully seeded {len(seeded_emails)} test subject accounts into database.")
        except Exception as e:
            db.rollback()
            print(f"[Startup Error] Failed to seed test subjects: {e}", file=sys.stderr)
        finally:
            db.close()
    yield

app = FastAPI(
    title="FitMind AI API",
    description="Backend service for FitMind AI personalized fitness coach",
    version="1.0.0",
    lifespan=lifespan,
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
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Admin-Secret",
            "Accept",
            "Origin",
            "X-Requested-With",
        ],
    )

# Mount API v1 router
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check():
    """Unprotected health check endpoint."""
    return {"status": "ok"}


