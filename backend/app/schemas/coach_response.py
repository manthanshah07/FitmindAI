from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


ObservationSeverity = Literal["info", "caution", "important"]
RecommendationPriority = Literal["low", "medium", "high"]
DataQualityLevel = Literal["comprehensive", "moderate", "sparse", "minimal"]


class ObservationItem(BaseModel):
    category: str = Field(..., description="Fact category e.g., 'nutrition', 'workout', 'progress'")
    text: str = Field(..., description="Fact or observation text derived from context")
    severity: ObservationSeverity = Field("info", description="Severity level")

    @field_validator("category", "text")
    @classmethod
    def validate_non_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Field cannot be empty or blank.")
        return value.strip()


class RecommendationItem(BaseModel):
    category: str = Field(..., description="Recommendation category")
    title: str = Field(..., description="Short title of recommendation")
    action: str = Field(..., description="Actionable recommendation step")
    priority: RecommendationPriority = Field("medium", description="Priority level")

    @field_validator("category", "title", "action")
    @classmethod
    def validate_non_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Field cannot be empty or blank.")
        return value.strip()


class CoachResponseStructured(BaseModel):
    answer: str = Field(..., description="Concise natural-language coaching answer")
    observations: List[ObservationItem] = Field(default_factory=list, description="Structured facts")
    recommendations: List[RecommendationItem] = Field(default_factory=list, description="Actionable advice")
    warnings: List[str] = Field(default_factory=list, description="Safety or data limitation warnings")
    data_quality: DataQualityLevel = Field("moderate", description="Data completeness classification")

    @field_validator("answer")
    @classmethod
    def validate_answer_not_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Answer cannot be empty or contain only whitespace.")
        return value.strip()
