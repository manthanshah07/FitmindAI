from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator


class MeasurementBase(BaseModel):
    measured_at: Optional[date] = Field(default_factory=date.today)
    weight_kg: Optional[float] = Field(None, ge=10.0, le=500.0)
    chest_cm: Optional[float] = Field(None, ge=20.0, le=300.0)
    waist_cm: Optional[float] = Field(None, ge=20.0, le=300.0)
    hips_cm: Optional[float] = Field(None, ge=20.0, le=300.0)
    bicep_cm: Optional[float] = Field(None, ge=10.0, le=100.0)
    thigh_cm: Optional[float] = Field(None, ge=10.0, le=150.0)
    body_fat_pct: Optional[float] = Field(None, ge=2.0, le=70.0)


class MeasurementCreate(MeasurementBase):
    @model_validator(mode="after")
    def validate_at_least_one_metric(self):
        metrics = [
            self.weight_kg,
            self.chest_cm,
            self.waist_cm,
            self.hips_cm,
            self.bicep_cm,
            self.thigh_cm,
            self.body_fat_pct,
        ]
        if all(m is None for m in metrics):
            raise ValueError("At least one measurement metric must be provided.")
        return self


class MeasurementResponse(MeasurementBase):
    id: UUID
    user_id: UUID
    measured_at: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProgressSummaryResponse(BaseModel):
    latest_weight_kg: Optional[float] = None
    weight_change_kg: Optional[float] = None
    trend_direction: str = "no_data"  # 'gaining', 'losing', 'maintaining', 'no_data'
    total_entries: int = 0
    latest_measurement: Optional[MeasurementResponse] = None
    history: List[MeasurementResponse] = []
