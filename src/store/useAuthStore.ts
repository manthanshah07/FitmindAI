import { create } from 'zustand';
import type { User, LoginRequest, RegisterRequest } from '../types/auth';
import { loginApi, registerApi, refreshApi, logoutApi } from '../lib/api/auth';
import { tokenStorage } from '../lib/api/tokenStorage';
import { getErrorMessage } from '../utils/apiError';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  initializeSession: () => Promise<void>;
  clearSession: () => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loginApi(credentials);
      tokenStorage.setRefreshToken(response.refresh_token);
      set({
        user: response.user,
        accessToken: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = getErrorMessage(err);
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const user = await registerApi(data);
      set({ isLoading: false, error: null });
      return user;
    } catch (err) {
      const message = getErrorMessage(err);
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await logoutApi({ refresh_token: refreshToken });
      } catch {
        // Silently handle backend network failure on logout
      }
    }
    tokenStorage.clearRefreshToken();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  refreshSession: async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      get().clearSession();
      throw new Error('No refresh token available');
    }

    try {
      const response = await refreshApi({ refresh_token: refreshToken });
      tokenStorage.setRefreshToken(response.refresh_token);
      set({
        user: response.user,
        accessToken: response.access_token,
        isAuthenticated: true,
        error: null,
      });
    } catch (err) {
      get().clearSession();
      throw err;
    }
  },

  initializeSession: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
      return;
    }

    try {
      const response = await refreshApi({ refresh_token: refreshToken });
      tokenStorage.setRefreshToken(response.refresh_token);
      set({
        user: response.user,
        accessToken: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    } catch {
      tokenStorage.clearRefreshToken();
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    }
  },

  clearSession: () => {
    tokenStorage.clearRefreshToken();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  setError: (error: string | null) => set({ error }),
}));
