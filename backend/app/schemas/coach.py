from pydantic import BaseModel, Field, field_validator
from app.schemas.coach_response import CoachResponseStructured


class CoachChatRequest(BaseModel):
    message: str = Field(
        ...,
        description="The user's question or statement for the AI Coach",
        max_length=1000,
    )

    @field_validator("message")
    @classmethod
    def validate_message_not_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Message cannot be empty or contain only whitespace.")
        return value.strip()


class CoachChatResponse(CoachResponseStructured):
    """
    Authenticated response model for AI Coach chat endpoint.
    Inherits structured coaching response format (answer, observations, recommendations, warnings, data_quality).
    """
    pass
