from datetime import date
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.profile import Profile
from app.models.progress import Measurement
from app.schemas.progress import (
    MeasurementCreate,
    MeasurementResponse,
    ProgressSummaryResponse,
)


class ProgressService:
    @staticmethod
    def create_measurement(db: Session, user: User, data: MeasurementCreate) -> MeasurementResponse:
        measured_date = data.measured_at or date.today()

        measurement = Measurement(
            user_id=user.id,
            measured_at=measured_date,
            weight_kg=data.weight_kg,
            chest_cm=data.chest_cm,
            waist_cm=data.waist_cm,
            hips_cm=data.hips_cm,
            bicep_cm=data.bicep_cm,
            thigh_cm=data.thigh_cm,
            body_fat_pct=data.body_fat_pct,
        )
        db.add(measurement)

        # Sync latest weight_kg to user Profile if weight was provided
        if data.weight_kg is not None:
            profile = db.query(Profile).filter(Profile.user_id == user.id).first()
            if profile:
                profile.weight_kg = data.weight_kg
                db.add(profile)

        db.commit()
        db.refresh(measurement)
        return MeasurementResponse.model_validate(measurement)

    @staticmethod
    def get_measurements(db: Session, user: User, limit: int = 50, skip: int = 0) -> List[MeasurementResponse]:
        records = (
            db.query(Measurement)
            .filter(Measurement.user_id == user.id)
            .order_by(Measurement.measured_at.desc(), Measurement.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [MeasurementResponse.model_validate(r) for r in records]

    @staticmethod
    def get_measurement_by_id(db: Session, user: User, measurement_id: UUID) -> Optional[MeasurementResponse]:
        record = (
            db.query(Measurement)
            .filter(Measurement.user_id == user.id, Measurement.id == measurement_id)
            .first()
        )
        if not record:
            return None
        return MeasurementResponse.model_validate(record)

    @staticmethod
    def get_progress_summary(db: Session, user: User) -> ProgressSummaryResponse:
        records = (
            db.query(Measurement)
            .filter(Measurement.user_id == user.id)
            .order_by(Measurement.measured_at.asc(), Measurement.created_at.asc())
            .all()
        )

        if not records:
            return ProgressSummaryResponse(
                latest_weight_kg=None,
                weight_change_kg=None,
                trend_direction="no_data",
                total_entries=0,
                latest_measurement=None,
                history=[],
            )

        weight_entries = [r for r in records if r.weight_kg is not None]

        latest_weight = float(weight_entries[-1].weight_kg) if weight_entries else None
        earliest_weight = float(weight_entries[0].weight_kg) if weight_entries else None

        weight_change = None
        trend = "no_data"
        if latest_weight is not None and earliest_weight is not None:
            if len(weight_entries) >= 2:
                weight_change = round(latest_weight - earliest_weight, 2)
            else:
                weight_change = 0.0

            if weight_change < -0.2:
                trend = "losing"
            elif weight_change > 0.2:
                trend = "gaining"
            else:
                trend = "maintaining"

        latest_record = MeasurementResponse.model_validate(records[-1])
        history_desc = [MeasurementResponse.model_validate(r) for r in reversed(records)]

        return ProgressSummaryResponse(
            latest_weight_kg=latest_weight,
            weight_change_kg=weight_change,
            trend_direction=trend,
            total_entries=len(records),
            latest_measurement=latest_record,
            history=history_desc,
        )
