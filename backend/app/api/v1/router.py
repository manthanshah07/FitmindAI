from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.profile import router as profile_router
from app.api.v1.goals import router as goals_router
from app.api.v1.exercises import router as exercises_router
from app.api.v1.workout import router as workout_router
from app.api.v1.foods import router as foods_router
from app.api.v1.nutrition import router as nutrition_router

api_v1_router = APIRouter()

# Include auth endpoints
api_v1_router.include_router(auth_router)

# Include profile endpoints
api_v1_router.include_router(profile_router, prefix="/profile", tags=["Profile"])

# Include goals endpoints
api_v1_router.include_router(goals_router, prefix="/goals", tags=["Goals"])

# Include exercises endpoints
api_v1_router.include_router(exercises_router, prefix="/exercises", tags=["Exercises"])

# Include workout endpoints
api_v1_router.include_router(workout_router, prefix="/workout", tags=["Workout"])

# Include foods endpoints
api_v1_router.include_router(foods_router, prefix="/foods", tags=["Foods"])

# Include nutrition endpoints
api_v1_router.include_router(nutrition_router, prefix="/nutrition", tags=["Nutrition"])


