import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { tokenStorage } from '../lib/api/tokenStorage';
import * as authApi from '../lib/api/auth';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { getErrorMessage } from '../utils/apiError';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('../lib/api/auth', () => ({
  registerApi: vi.fn(),
  loginApi: vi.fn(),
  refreshApi: vi.fn(),
  logoutApi: vi.fn(),
}));

describe('Token Storage Adapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves refresh token', () => {
    tokenStorage.setRefreshToken('sample_token');
    expect(tokenStorage.getRefreshToken()).toBe('sample_token');
  });

  it('clears refresh token', () => {
    tokenStorage.setRefreshToken('sample_token');
    tokenStorage.clearRefreshToken();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });
});

describe('API Error Utility', () => {
  it('parses detail string from Axios error', () => {
    const error = new AxiosError('Bad Request');
    error.response = {
      data: { detail: 'Email is already registered' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    expect(getErrorMessage(error)).toBe('Email is already registered');
  });

  it('parses detail array from Pydantic 422 error', () => {
    const error = new AxiosError('Unprocessable Entity');
    error.response = {
      data: {
        detail: [
          { msg: 'Field required', loc: ['body', 'email'] },
          { msg: 'Invalid password', loc: ['body', 'password'] },
        ],
      },
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    expect(getErrorMessage(error)).toBe('Field required, Invalid password');
  });
});

describe('Zustand Auth Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('initializes with default unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('handles login success', async () => {
    const mockUser = {
      id: 'uuid-123',
      email: 'user@example.com',
      is_active: true,
      is_verified: false,
      created_at: new Date().toISOString(),
    };

    vi.mocked(authApi.loginApi).mockResolvedValueOnce({
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      token_type: 'bearer',
      user: mockUser,
    });

    await useAuthStore.getState().login({ email: 'user@example.com', password: 'password123' });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('mock_access_token');
    expect(state.user?.email).toBe('user@example.com');
    expect(tokenStorage.getRefreshToken()).toBe('mock_refresh_token');
  });

  it('handles login failure and updates error state', async () => {
    const error = new AxiosError('Unauthorized');
    error.response = {
      data: { detail: 'Invalid email or password' },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    vi.mocked(authApi.loginApi).mockRejectedValueOnce(error);

    await expect(
      useAuthStore.getState().login({ email: 'user@example.com', password: 'wrongpassword' }),
    ).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Invalid email or password');
  });

  it('handles logout and clears session', async () => {
    tokenStorage.setRefreshToken('mock_refresh_token');
    useAuthStore.setState({
      user: {
        id: '123',
        email: 'test@example.com',
        is_active: true,
        is_verified: false,
        created_at: '2026-08-16',
      },
      accessToken: 'access_123',
      isAuthenticated: true,
    });

    vi.mocked(authApi.logoutApi).mockResolvedValueOnce({ message: 'Successfully logged out' });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });
});

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('renders loading state when session is initializing or loading', () => {
    useAuthStore.setState({ isInitialized: true, isLoading: true });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Secret Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Initializing Session.../i)).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated', async () => {
    useAuthStore.setState({ isInitialized: true, isAuthenticated: false, isLoading: false });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Secret Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page Target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Login Page Target/i)).toBeInTheDocument();
    });
  });

  it('renders protected content when authenticated', () => {
    useAuthStore.setState({
      isInitialized: true,
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '1',
        email: 'auth@example.com',
        is_active: true,
        is_verified: true,
        created_at: '2026-08-16',
      },
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Secret Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Protected Secret Content/i)).toBeInTheDocument();
  });
});
