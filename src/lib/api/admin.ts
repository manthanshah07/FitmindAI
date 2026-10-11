import { api as apiClient } from './client';
import type {
  AdminAuditLogListResponse,
  AdminExerciseItem,
  AdminExerciseListResponse,
  AdminExerciseUpdateRequest,
  AdminFoodItem,
  AdminFoodListResponse,
  AdminFoodUpdateRequest,
  AdminStatsResponse,
  AdminUserItem,
  AdminUserListResponse,
  UserRoleUpdateRequest,
  UserStatusUpdateRequest,
} from '../../types/admin';

export const getAdminStatsApi = async (): Promise<AdminStatsResponse> => {
  const response = await apiClient.get<AdminStatsResponse>('/admin/stats');
  return response.data;
};

export const getAdminUsersApi = async (params?: {
  q?: string;
  status?: string;
  role?: string;
  page?: number;
  limit?: number;
}): Promise<AdminUserListResponse> => {
  const response = await apiClient.get<AdminUserListResponse>('/admin/users', { params });
  return response.data;
};

export const updateAdminUserStatusApi = async (
  userId: string,
  payload: UserStatusUpdateRequest
): Promise<AdminUserItem> => {
  const response = await apiClient.post<AdminUserItem>(`/admin/users/${userId}/status`, payload);
  return response.data;
};

export const updateAdminUserRoleApi = async (
  userId: string,
  payload: UserRoleUpdateRequest
): Promise<AdminUserItem> => {
  const response = await apiClient.post<AdminUserItem>(`/admin/users/${userId}/role`, payload);
  return response.data;
};

export const getAdminExercisesApi = async (params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<AdminExerciseListResponse> => {
  const response = await apiClient.get<AdminExerciseListResponse>('/admin/content/exercises', {
    params,
  });
  return response.data;
};

export const updateAdminExerciseApi = async (
  exerciseId: string,
  payload: AdminExerciseUpdateRequest
): Promise<AdminExerciseItem> => {
  const response = await apiClient.patch<AdminExerciseItem>(
    `/admin/content/exercises/${exerciseId}`,
    payload
  );
  return response.data;
};

export const getAdminFoodsApi = async (params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<AdminFoodListResponse> => {
  const response = await apiClient.get<AdminFoodListResponse>('/admin/content/foods', {
    params,
  });
  return response.data;
};

export const updateAdminFoodApi = async (
  foodId: string,
  payload: AdminFoodUpdateRequest
): Promise<AdminFoodItem> => {
  const response = await apiClient.patch<AdminFoodItem>(`/admin/content/foods/${foodId}`, payload);
  return response.data;
};

export const getAdminAuditLogsApi = async (params?: {
  page?: number;
  limit?: number;
}): Promise<AdminAuditLogListResponse> => {
  const response = await apiClient.get<AdminAuditLogListResponse>('/admin/audit-log', {
    params,
  });
  return response.data;
};
