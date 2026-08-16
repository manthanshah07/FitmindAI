from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.profile import router as profile_router
from app.api.v1.goals import router as goals_router

api_v1_router = APIRouter()

# Include auth endpoints
api_v1_router.include_router(auth_router)

# Include profile endpoints
api_v1_router.include_router(profile_router, prefix="/profile", tags=["Profile"])

# Include goals endpoints
api_v1_router.include_router(goals_router, prefix="/goals", tags=["Goals"])


