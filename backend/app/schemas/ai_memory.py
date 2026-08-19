from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class AIMemoryCreate(BaseModel):
    key: str
    value: str
    memory_type: str = "conversational"
    source: Optional[str] = "conversation"


class AIMemoryResponse(BaseModel):
    id: UUID
    user_id: UUID
    memory_type: str
    key: str
    value: str
    source: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
