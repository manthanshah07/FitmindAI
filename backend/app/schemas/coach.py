from pydantic import BaseModel, Field, field_validator


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


class CoachChatResponse(BaseModel):
    message: str = Field(..., description="The AI Coach's response message")
