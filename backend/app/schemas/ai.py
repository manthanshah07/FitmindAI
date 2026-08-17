from typing import List, Optional
from pydantic import BaseModel, Field


class LLMMessage(BaseModel):
    role: str = Field(..., description="Message role, e.g., 'system', 'user', 'assistant'")
    content: str = Field(..., description="Text content of the message")


class LLMCompletionRequest(BaseModel):
    messages: List[LLMMessage] = Field(..., description="List of conversation messages")
    model: Optional[str] = Field(None, description="Optional override for model name")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, gt=0, description="Max tokens to generate")


class LLMCompletionResponse(BaseModel):
    content: str = Field(..., description="Generated text completion content")
    model: str = Field(..., description="Model used for generation")
    finish_reason: Optional[str] = Field(None, description="Reason generation finished")
    prompt_tokens: Optional[int] = Field(None, description="Tokens used in prompt")
    completion_tokens: Optional[int] = Field(None, description="Tokens generated in completion")
    total_tokens: Optional[int] = Field(None, description="Total tokens used")
