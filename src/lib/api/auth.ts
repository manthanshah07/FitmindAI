import { api } from './client';
import type {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  TokenResponse,
  User,
  MessageResponse,
  ChangePasswordRequest,
} from '../../types/auth';

export async function registerApi(data: RegisterRequest): Promise<User> {
  const response = await api.post<User>('/auth/register', data);
  return response.data;
}

export async function loginApi(data: LoginRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>('/auth/login', data);
  return response.data;
}

export async function refreshApi(data: RefreshTokenRequest = {}): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>('/auth/refresh', data);
  return response.data;
}

export async function logoutApi(data: RefreshTokenRequest = {}): Promise<MessageResponse> {
  const response = await api.post<MessageResponse>('/auth/logout', data);
  return response.data;
}

export async function changePasswordApi(data: ChangePasswordRequest): Promise<MessageResponse> {
  const response = await api.post<MessageResponse>('/auth/change-password', data);
  return response.data;
}

