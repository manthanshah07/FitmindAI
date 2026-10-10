from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class DeleteAccountRequest(BaseModel):
    password: str = Field(..., min_length=1, description="Password confirmation to delete account")


class ExportResponse(BaseModel):
    exported_at: str
    user: Dict[str, Any]
    profile: Optional[Dict[str, Any]] = None
    goals: List[Dict[str, Any]] = []
    workout_plans: List[Dict[str, Any]] = []
    workout_logs: List[Dict[str, Any]] = []
    meal_logs: List[Dict[str, Any]] = []
    measurements: List[Dict[str, Any]] = []
    fitness_scores: List[Dict[str, Any]] = []
    ai_memories: List[Dict[str, Any]] = []
    chat_messages: List[Dict[str, Any]] = []
