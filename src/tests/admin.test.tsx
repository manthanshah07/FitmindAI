import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminRoute } from '../components/layout/AdminRoute';
import { Sidebar } from '../components/layout/Sidebar';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { useAuthStore } from '../store/useAuthStore';
import * as adminApi from '../lib/api/admin';

vi.mock('../lib/api/admin', () => ({
  getAdminStatsApi: vi.fn(),
  getAdminUsersApi: vi.fn(),
  updateAdminUserStatusApi: vi.fn(),
  updateAdminUserRoleApi: vi.fn(),
  getAdminExercisesApi: vi.fn(),
  updateAdminExerciseApi: vi.fn(),
  getAdminFoodsApi: vi.fn(),
  updateAdminFoodApi: vi.fn(),
  getAdminAuditLogsApi: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('Milestone M11 — Platform Admin Frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getAdminStatsApi).mockResolvedValue({
      total_users: 250,
      active_users_7d: 140,
      active_users_30d: 210,
      new_signups_7d: 18,
      total_workouts_logged: 1200,
      total_meals_logged: 3400,
      total_ai_messages: 890,
      system_health: {
        database_status: 'healthy',
        ai_provider_status: 'configured',
        formula_version: 2,
      },
    });
    vi.mocked(adminApi.getAdminUsersApi).mockResolvedValue({
      total: 2,
      page: 1,
      limit: 50,
      items: [
        {
          id: 'admin-1',
          email: 'admin@fitmind.ai',
          full_name: 'Platform Admin',
          is_active: true,
          is_admin: true,
          created_at: '2026-09-01T00:00:00Z',
          last_active_at: '2026-10-11T00:00:00Z',
          workouts_count: 15,
          meals_count: 30,
        },
        {
          id: 'member-2',
          email: 'member@fitmind.ai',
          full_name: 'Regular Member',
          is_active: true,
          is_admin: false,
          created_at: '2026-09-10T00:00:00Z',
          last_active_at: '2026-10-10T00:00:00Z',
          workouts_count: 8,
          meals_count: 22,
        },
      ],
    });
    vi.mocked(adminApi.getAdminAuditLogsApi).mockResolvedValue({
      total: 1,
      page: 1,
      limit: 50,
      items: [
        {
          id: 'audit-1',
          admin_id: 'admin-1',
          admin_email: 'admin@fitmind.ai',
          action: 'user.deactivate',
          target_user_id: 'member-2',
          target_user_email: 'member@fitmind.ai',
          details: { reason: 'Abuse check' },
          created_at: '2026-10-11T08:00:00Z',
        },
      ],
    });
  });

  it('redirects non-admin authenticated user from /admin to /today', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isInitialized: true,
      isLoading: false,
      user: {
        id: 'member-2',
        email: 'member@fitmind.ai',
        full_name: 'Regular Member',
        is_active: true,
        is_verified: true,
        is_admin: false,
        created_at: '2026-09-10T00:00:00Z',
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin Secret Area</div>
              </AdminRoute>
            }
          />
          <Route path="/today" element={<div>Today Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Today Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Secret Area')).not.toBeInTheDocument();
  });

  it('hides Platform Admin link in Sidebar for normal users and shows it for admins', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isInitialized: true,
      isLoading: false,
      user: {
        id: 'member-2',
        email: 'member@fitmind.ai',
        is_active: true,
        is_verified: true,
        is_admin: false,
        created_at: '2026-09-10T00:00:00Z',
      },
    });

    const { rerender } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.queryByText('Platform Admin')).not.toBeInTheDocument();

    useAuthStore.setState({
      user: {
        id: 'admin-1',
        email: 'admin@fitmind.ai',
        is_active: true,
        is_verified: true,
        is_admin: true,
        created_at: '2026-09-01T00:00:00Z',
      },
    });

    rerender(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Platform Admin')).toBeInTheDocument();
  });

  it('allows admin user to view KPI stats, switch to Users tab, open confirmation modal, and view Audit Log', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isInitialized: true,
      isLoading: false,
      user: {
        id: 'admin-1',
        email: 'admin@fitmind.ai',
        full_name: 'Platform Admin',
        is_active: true,
        is_verified: true,
        is_admin: true,
        created_at: '2026-09-01T00:00:00Z',
      },
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Overview KPIs load
    expect(await screen.findByText('250')).toBeInTheDocument();
    expect(screen.getByText('PLATFORM ADMIN')).toBeInTheDocument();

    // Switch to Users tab
    fireEvent.click(screen.getByRole('button', { name: /Users/i }));
    expect(await screen.findAllByText('Regular Member')).toHaveLength(2); // desktop table + mobile card

    // Click Deactivate on Regular Member (enabled since not self)
    const deactivateButtons = screen
      .getAllByRole('button', { name: 'Deactivate' })
      .filter((btn) => !btn.hasAttribute('disabled'));
    fireEvent.click(deactivateButtons[0]);

    // Confirmation dialog opens
    expect(await screen.findByText('Confirm Account Deactivation')).toBeInTheDocument();

    // Close modal so background tabs are accessible
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Switch to Audit Log tab
    fireEvent.click(screen.getByRole('button', { name: /Audit Log/i }));
    await waitFor(() => {
      expect(screen.getByText('user.deactivate')).toBeInTheDocument();
    });
  });
});
