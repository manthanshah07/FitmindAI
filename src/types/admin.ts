export interface AdminSystemHealth {
  database_status: string;
  ai_provider_status: string;
  formula_version: number;
}

export interface AdminStatsResponse {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  new_signups_7d: number;
  total_workouts_logged: number;
  total_meals_logged: number;
  total_ai_messages: number;
  system_health: AdminSystemHealth;
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_active_at?: string | null;
  workouts_count: number;
  meals_count: number;
}

export interface AdminUserListResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
}

export interface UserStatusUpdateRequest {
  is_active: boolean;
  reason?: string;
}

export interface UserRoleUpdateRequest {
  is_admin: boolean;
}

export interface AdminExerciseItem {
  id: string;
  name: string;
  primary_muscle: string;
  equipment_required?: string[] | null;
  difficulty?: string | null;
  category?: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface AdminExerciseListResponse {
  items: AdminExerciseItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminExerciseUpdateRequest {
  name?: string;
  primary_muscle?: string;
  difficulty?: string;
  category?: string;
  is_verified?: boolean;
}

export interface AdminFoodItem {
  id: string;
  name: string;
  brand?: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  is_verified: boolean;
  created_at: string;
}

export interface AdminFoodListResponse {
  items: AdminFoodItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminFoodUpdateRequest {
  name?: string;
  brand?: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fat_per_100g?: number;
  is_verified?: boolean;
}

export interface AdminAuditLogItem {
  id: string;
  admin_id: string;
  admin_email?: string | null;
  action: string;
  target_user_id?: string | null;
  target_user_email?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminAuditLogListResponse {
  items: AdminAuditLogItem[];
  total: number;
  page: number;
  limit: number;
}
