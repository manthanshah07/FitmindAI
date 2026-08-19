from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.schemas.coach import CoachChatResponse


class ChatMessageResponse(BaseModel):
    id: UUID
    user_id: UUID
    role: str  # "user" | "assistant"
    content: Optional[str] = None
    response: Optional[CoachChatResponse] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
