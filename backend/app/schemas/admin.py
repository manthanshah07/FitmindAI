from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class AdminSystemHealth(BaseModel):
    database_status: str = "healthy"
    ai_provider_status: str = "configured"
    formula_version: int = 2


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users_7d: int
    active_users_30d: int
    new_signups_7d: int
    total_workouts_logged: int
    total_meals_logged: int
    total_ai_messages: int
    system_health: AdminSystemHealth


class AdminUserItem(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_active_at: Optional[datetime] = None
    workouts_count: int = 0
    meals_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AdminUserListResponse(BaseModel):
    items: List[AdminUserItem]
    total: int
    page: int
    limit: int


class UserStatusUpdateRequest(BaseModel):
    is_active: bool
    reason: Optional[str] = Field(None, max_length=255)


class UserRoleUpdateRequest(BaseModel):
    is_admin: bool


class AdminExerciseItem(BaseModel):
    id: UUID
    name: str
    primary_muscle: str
    equipment_required: Optional[List[str]] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    is_verified: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminExerciseListResponse(BaseModel):
    items: List[AdminExerciseItem]
    total: int
    page: int
    limit: int


class AdminExerciseUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    primary_muscle: Optional[str] = Field(None, min_length=1, max_length=50)
    difficulty: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = Field(None, max_length=50)
    is_verified: Optional[bool] = None


class AdminFoodItem(BaseModel):
    id: UUID
    name: str
    brand: Optional[str] = None
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    is_verified: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminFoodListResponse(BaseModel):
    items: List[AdminFoodItem]
    total: int
    page: int
    limit: int


class AdminFoodUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    brand: Optional[str] = Field(None, max_length=100)
    calories_per_100g: Optional[float] = Field(None, ge=0)
    protein_per_100g: Optional[float] = Field(None, ge=0)
    carbs_per_100g: Optional[float] = Field(None, ge=0)
    fat_per_100g: Optional[float] = Field(None, ge=0)
    is_verified: Optional[bool] = None


class AdminAuditLogItem(BaseModel):
    id: UUID
    admin_id: UUID
    admin_email: Optional[str] = None
    action: str
    target_user_id: Optional[UUID] = None
    target_user_email: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminAuditLogListResponse(BaseModel):
    items: List[AdminAuditLogItem]
    total: int
    page: int
    limit: int
