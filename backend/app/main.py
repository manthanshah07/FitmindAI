from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_v1_router

app = FastAPI(
    title="FitMind AI API",
    description="Backend service for FitMind AI personalized fitness coach",
    version="1.0.0",
)

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
