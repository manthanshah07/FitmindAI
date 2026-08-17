from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class FitnessScoreItem(BaseModel):
    id: UUID
    user_id: UUID
    score: int = Field(..., ge=0, le=100)
    workout_adherence_pct: Optional[float] = None
    nutrition_score: Optional[float] = None
    protein_score: Optional[float] = None
    sleep_score: float = 75.0
    recovery_score: float = 75.0
    consistency_score: Optional[float] = None
    calculated_at: datetime
    period_start: date
    period_end: date

    model_config = ConfigDict(from_attributes=True)


class FitnessScoreResponse(BaseModel):
    current_score: Optional[FitnessScoreItem] = None
    score_label: str = "Needs Work"  # 'Excellent', 'Good', 'Fair', 'Needs Work'
    history: List[FitnessScoreItem] = []
