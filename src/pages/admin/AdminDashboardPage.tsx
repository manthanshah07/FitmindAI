import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Users,
  Activity,
  Dumbbell,
  Utensils,
  MessageSquare,
  Database,
  Cpu,
  ArrowLeft,
  FileText,
  Edit3,
  Lock,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { TextField } from '../../components/ui/TextField';
import { Select } from '../../components/ui/Select';
import { useAuthStore } from '../../store/useAuthStore';
import {
  getAdminStatsApi,
  getAdminUsersApi,
  updateAdminUserStatusApi,
  updateAdminUserRoleApi,
  getAdminExercisesApi,
  updateAdminExerciseApi,
  getAdminFoodsApi,
  updateAdminFoodApi,
  getAdminAuditLogsApi,
} from '../../lib/api/admin';
import { formatDate } from '../../lib/format';
import { getErrorMessage } from '../../utils/apiError';
import type {
  AdminAuditLogListResponse,
  AdminExerciseItem,
  AdminExerciseListResponse,
  AdminFoodItem,
  AdminFoodListResponse,
  AdminStatsResponse,
  AdminUserItem,
  AdminUserListResponse,
} from '../../types/admin';

type AdminTab = 'overview' | 'users' | 'content' | 'audit';
type ContentSubTab = 'exercises' | 'foods';

const DEV_FALLBACK_STATS: AdminStatsResponse = {
  total_users: 148,
  active_users_7d: 94,
  active_users_30d: 132,
  new_signups_7d: 19,
  total_workouts_logged: 1842,
  total_meals_logged: 4610,
  total_ai_messages: 3290,
  system_health: {
    database_status: 'healthy',
    ai_provider_status: 'configured',
    formula_version: 2,
  },
};

const DEV_FALLBACK_USERS: AdminUserListResponse = {
  total: 4,
  page: 1,
  limit: 20,
  items: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@fitmind.ai',
      full_name: 'Aarav Mehta (Platform Admin)',
      is_active: true,
      is_admin: true,
      created_at: '2026-08-15T09:00:00Z',
      last_active_at: '2026-10-11T08:10:00Z',
      workouts_count: 42,
      meals_count: 118,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'demo.full@fitmind.ai',
      full_name: 'Rohan Sharma',
      is_active: true,
      is_admin: false,
      created_at: '2026-09-01T11:20:00Z',
      last_active_at: '2026-10-11T07:45:00Z',
      workouts_count: 28,
      meals_count: 84,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'priya.nair@fitmind.ai',
      full_name: 'Priya Nair',
      is_active: true,
      is_admin: false,
      created_at: '2026-09-14T14:30:00Z',
      last_active_at: '2026-10-10T19:15:00Z',
      workouts_count: 19,
      meals_count: 63,
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      email: 'suspended.member@fitmind.ai',
      full_name: 'Vikram Desai',
      is_active: false,
      is_admin: false,
      created_at: '2026-09-20T10:00:00Z',
      last_active_at: '2026-10-02T16:00:00Z',
      workouts_count: 3,
      meals_count: 7,
    },
  ],
};

const DEV_FALLBACK_EXERCISES: AdminExerciseListResponse = {
  total: 3,
  page: 1,
  limit: 20,
  items: [
    {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'Barbell Bench Press',
      primary_muscle: 'Chest',
      equipment_required: ['barbell', 'bench'],
      difficulty: 'intermediate',
      category: 'strength',
      is_verified: true,
      created_at: '2026-08-16T00:00:00Z',
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'Romanian Deadlift',
      primary_muscle: 'Hamstrings',
      equipment_required: ['barbell'],
      difficulty: 'intermediate',
      category: 'strength',
      is_verified: true,
      created_at: '2026-08-16T00:00:00Z',
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      name: 'Pull-Up (Strict)',
      primary_muscle: 'Back',
      equipment_required: ['pull_up_bar'],
      difficulty: 'intermediate',
      category: 'bodyweight',
      is_verified: true,
      created_at: '2026-08-16T00:00:00Z',
    },
  ],
};

const DEV_FALLBACK_FOODS: AdminFoodListResponse = {
  total: 3,
  page: 1,
  limit: 20,
  items: [
    {
      id: '20000000-0000-0000-0000-000000000001',
      name: 'Chicken Breast (Cooked, Skinless)',
      brand: 'USDA Reference',
      calories_per_100g: 165,
      protein_per_100g: 31,
      carbs_per_100g: 0,
      fat_per_100g: 3.6,
      is_verified: true,
      created_at: '2026-08-16T00:00:00Z',
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      name: 'Greek Yogurt (Plain, Non-Fat)',
      brand: 'FitDairy',
      calories_per_100g: 59,
      protein_per_100g: 10.3,
      carbs_per_100g: 3.6,
      fat_per_100g: 0.4,
      is_verified: true,
      created_at: '2026-08-16T00:00:00Z',
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      name: 'Rolled Oats (Dry)',
      brand: 'WholeGrain Co',
      calories_per_100g: 389,
      protein_per_100g: 16.9,
      carbs_per_100g: 66.3,
      fat_per_100g: 6.9,
      is_verified: true,
      created_at: '2026-08-16T00:00:00Z',
    },
  ],
};

const DEV_FALLBACK_AUDIT: AdminAuditLogListResponse = {
  total: 3,
  page: 1,
  limit: 30,
  items: [
    {
      id: '30000000-0000-0000-0000-000000000001',
      admin_id: '00000000-0000-0000-0000-000000000001',
      admin_email: 'admin@fitmind.ai',
      action: 'user.deactivate',
      target_user_id: '00000000-0000-0000-0000-000000000004',
      target_user_email: 'suspended.member@fitmind.ai',
      details: {
        previous_is_active: true,
        new_is_active: false,
        reason: 'Automated spam abuse prevention',
      },
      created_at: '2026-10-10T16:40:00Z',
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      admin_id: '00000000-0000-0000-0000-000000000001',
      admin_email: 'admin@fitmind.ai',
      action: 'content.update',
      target_user_id: null,
      target_user_email: null,
      details: {
        entity_type: 'food',
        name: 'Greek Yogurt (Plain, Non-Fat)',
        changes: { is_verified: { from: false, to: true } },
      },
      created_at: '2026-10-09T11:25:00Z',
    },
    {
      id: '30000000-0000-0000-0000-000000000003',
      admin_id: '00000000-0000-0000-0000-000000000001',
      admin_email: 'admin@fitmind.ai',
      action: 'user.promote_admin',
      target_user_id: '00000000-0000-0000-0000-000000000001',
      target_user_email: 'admin@fitmind.ai',
      details: {
        previous_is_admin: false,
        new_is_admin: true,
      },
      created_at: '2026-10-01T09:00:00Z',
    },
  ],
};

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isDevRoute = location.pathname.startsWith('/dev/admin');

  const paramTab = searchParams.get('tab') as AdminTab | null;
  const activeTab: AdminTab =
    paramTab && ['overview', 'users', 'content', 'audit'].includes(paramTab)
      ? paramTab
      : 'overview';

  const setActiveTab = (tab: AdminTab) => {
    setSearchParams({ tab });
    setActionError(null);
    setActionSuccess(null);
  };

  // Users filter state
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');

  // Content catalog state
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>('exercises');
  const [contentSearch, setContentSearch] = useState('');

  // Confirmation modal states
  const [statusModalUser, setStatusModalUser] = useState<AdminUserItem | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);

  // Content edit modal states
  const [editingExercise, setEditingExercise] = useState<AdminExerciseItem | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    primary_muscle: '',
    difficulty: '',
    category: '',
    is_verified: true,
  });

  const [editingFood, setEditingFood] = useState<AdminFoodItem | null>(null);
  const [foodForm, setFoodForm] = useState({
    name: '',
    brand: '',
    calories_per_100g: '',
    protein_per_100g: '',
    carbs_per_100g: '',
    fat_per_100g: '',
    is_verified: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Queries
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStatsApi,
    retry: false,
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['admin-users', userSearch, statusFilter, roleFilter],
    queryFn: () =>
      getAdminUsersApi({
        q: userSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        role: roleFilter === 'all' ? undefined : roleFilter,
        page: 1,
        limit: 50,
      }),
    retry: false,
  });

  const { data: exercisesData, isLoading: isExercisesLoading } = useQuery({
    queryKey: ['admin-exercises', contentSearch],
    queryFn: () =>
      getAdminExercisesApi({
        q: contentSearch || undefined,
        page: 1,
        limit: 30,
      }),
    enabled: activeTab === 'content' && contentSubTab === 'exercises',
    retry: false,
  });

  const { data: foodsData, isLoading: isFoodsLoading } = useQuery({
    queryKey: ['admin-foods', contentSearch],
    queryFn: () =>
      getAdminFoodsApi({
        q: contentSearch || undefined,
        page: 1,
        limit: 30,
      }),
    enabled: activeTab === 'content' && contentSubTab === 'foods',
    retry: false,
  });

  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => getAdminAuditLogsApi({ page: 1, limit: 50 }),
    enabled: activeTab === 'audit' || isDevRoute,
    retry: false,
  });

  const effectiveStats = statsData ?? (isDevRoute ? DEV_FALLBACK_STATS : undefined);
  const effectiveUsers = usersData ?? (isDevRoute ? DEV_FALLBACK_USERS : undefined);
  const effectiveExercises = exercisesData ?? (isDevRoute ? DEV_FALLBACK_EXERCISES : undefined);
  const effectiveFoods = foodsData ?? (isDevRoute ? DEV_FALLBACK_FOODS : undefined);
  const effectiveAudit = auditData ?? (isDevRoute ? DEV_FALLBACK_AUDIT : undefined);

  const handleConfirmStatusToggle = async () => {
    if (!statusModalUser) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const nextStatus = !statusModalUser.is_active;
      await updateAdminUserStatusApi(statusModalUser.id, {
        is_active: nextStatus,
        reason: statusReason.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      setActionSuccess(
        `User ${statusModalUser.email} has been ${nextStatus ? 'activated' : 'deactivated'}.`
      );
      setStatusModalUser(null);
      setStatusReason('');
    } catch (err) {
      setActionError(getErrorMessage(err) || 'Failed to update user status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRoleToggle = async () => {
    if (!roleModalUser) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const nextRole = !roleModalUser.is_admin;
      await updateAdminUserRoleApi(roleModalUser.id, {
        is_admin: nextRole,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      setActionSuccess(
        `User ${roleModalUser.email} role updated to ${nextRole ? 'Platform Admin' : 'Member'}.`
      );
      setRoleModalUser(null);
    } catch (err) {
      setActionError(getErrorMessage(err) || 'Failed to update user role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditExercise = (item: AdminExerciseItem) => {
    setEditingExercise(item);
    setExerciseForm({
      name: item.name,
      primary_muscle: item.primary_muscle,
      difficulty: item.difficulty || 'intermediate',
      category: item.category || 'strength',
      is_verified: item.is_verified,
    });
  };

  const handleSaveExercise = async () => {
    if (!editingExercise) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await updateAdminExerciseApi(editingExercise.id, {
        name: exerciseForm.name,
        primary_muscle: exerciseForm.primary_muscle,
        difficulty: exerciseForm.difficulty,
        category: exerciseForm.category,
        is_verified: exerciseForm.is_verified,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      setActionSuccess(`Exercise "${exerciseForm.name}" updated.`);
      setEditingExercise(null);
    } catch (err) {
      setActionError(getErrorMessage(err) || 'Failed to update exercise');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditFood = (item: AdminFoodItem) => {
    setEditingFood(item);
    setFoodForm({
      name: item.name,
      brand: item.brand || '',
      calories_per_100g: String(item.calories_per_100g),
      protein_per_100g: String(item.protein_per_100g),
      carbs_per_100g: String(item.carbs_per_100g),
      fat_per_100g: String(item.fat_per_100g),
      is_verified: item.is_verified,
    });
  };

  const handleSaveFood = async () => {
    if (!editingFood) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await updateAdminFoodApi(editingFood.id, {
        name: foodForm.name,
        brand: foodForm.brand || undefined,
        calories_per_100g: Number(foodForm.calories_per_100g),
        protein_per_100g: Number(foodForm.protein_per_100g),
        carbs_per_100g: Number(foodForm.carbs_per_100g),
        fat_per_100g: Number(foodForm.fat_per_100g),
        is_verified: foodForm.is_verified,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-foods'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      setActionSuccess(`Food "${foodForm.name}" updated.`);
      setEditingFood(null);
    } catch (err) {
      setActionError(getErrorMessage(err) || 'Failed to update food item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-bg text-text flex flex-col">
      {/* Dedicated Platform Admin Top Bar */}
      <header className="bg-surface border-b border-border sticky top-0 z-20 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent-soft flex items-center justify-center text-accent shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm sm:text-base tracking-tight text-text truncate">
                  FitMind Console
                </span>
                <Badge variant="olive">PLATFORM ADMIN</Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-text-3 truncate">
                Logged in as {user?.email || 'admin@fitmind.ai'}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => navigate('/today')}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            App
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <nav
            aria-label="Platform Admin Sections"
            className="grid grid-cols-4 sm:flex sm:items-center gap-0.5 sm:gap-1 -mb-px"
          >
            {[
              { id: 'overview' as AdminTab, label: 'Overview', icon: Activity },
              { id: 'users' as AdminTab, label: 'Users', icon: Users },
              { id: 'content' as AdminTab, label: 'Content', icon: Dumbbell },
              { id: 'audit' as AdminTab, label: 'Audit Log', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-accent text-accent font-semibold'
                      : 'border-transparent text-text-2 hover:text-text hover:border-border'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {actionError && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-danger-soft border border-danger/30 text-danger text-sm flex items-center justify-between"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="p-3.5 rounded-lg bg-success-soft border border-success/30 text-success text-sm flex items-center justify-between"
          >
            <span>{actionSuccess}</span>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-xs underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-text">Platform Overview</h1>
              <p className="text-sm text-text-2 mt-0.5">
                Aggregate platform activity, user adoption, and operational health.
              </p>
            </div>

            {isStatsLoading && !effectiveStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Card key={n} className="p-5 h-28 animate-pulse bg-surface">
                    <div />
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="p-5 bg-surface border-border">
                    <div className="flex items-center justify-between text-text-2 mb-2">
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Total Registered Users
                      </span>
                      <Users className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-text">
                      {effectiveStats?.total_users ?? 0}
                    </div>
                    <p className="text-xs text-text-3 mt-1">
                      +{effectiveStats?.new_signups_7d ?? 0} new signups in last 7 days
                    </p>
                  </Card>

                  <Card className="p-5 bg-surface border-border">
                    <div className="flex items-center justify-between text-text-2 mb-2">
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Active Users (7d / 30d)
                      </span>
                      <Activity className="w-4 h-4 text-success" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-text">
                      {effectiveStats?.active_users_7d ?? 0}{' '}
                      <span className="text-sm font-normal text-text-3">
                        / {effectiveStats?.active_users_30d ?? 0}
                      </span>
                    </div>
                    <p className="text-xs text-text-3 mt-1">
                      7-day vs 30-day active member window
                    </p>
                  </Card>

                  <Card className="p-5 bg-surface border-border">
                    <div className="flex items-center justify-between text-text-2 mb-2">
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Workouts Logged
                      </span>
                      <Dumbbell className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-text">
                      {effectiveStats?.total_workouts_logged ?? 0}
                    </div>
                    <p className="text-xs text-text-3 mt-1">
                      Total completed training sessions
                    </p>
                  </Card>

                  <Card className="p-5 bg-surface border-border">
                    <div className="flex items-center justify-between text-text-2 mb-2">
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Meals Logged
                      </span>
                      <Utensils className="w-4 h-4 text-warning" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-text">
                      {effectiveStats?.total_meals_logged ?? 0}
                    </div>
                    <p className="text-xs text-text-3 mt-1">
                      Total nutrition entries recorded
                    </p>
                  </Card>

                  <Card className="p-5 bg-surface border-border">
                    <div className="flex items-center justify-between text-text-2 mb-2">
                      <span className="text-xs font-medium uppercase tracking-wider">
                        AI Coach Messages
                      </span>
                      <MessageSquare className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-text">
                      {effectiveStats?.total_ai_messages ?? 0}
                    </div>
                    <p className="text-xs text-text-3 mt-1">
                      Grounded coaching interactions
                    </p>
                  </Card>

                  <Card className="p-5 bg-surface border-border">
                    <div className="flex items-center justify-between text-text-2 mb-2">
                      <span className="text-xs font-medium uppercase tracking-wider">
                        Privacy Boundary
                      </span>
                      <Lock className="w-4 h-4 text-success" />
                    </div>
                    <div className="text-base font-semibold text-text mt-1">
                      Aggregate-Only Mode
                    </div>
                    <p className="text-xs text-text-3 mt-1">
                      Personal meals, body metrics & chats are hidden
                    </p>
                  </Card>
                </div>

                {/* System Health Strip */}
                <Card className="p-5 bg-surface border-border">
                  <h2 className="text-sm font-semibold text-text uppercase tracking-wider mb-4">
                    System Health & Configuration
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                      <Database className="w-5 h-5 text-success shrink-0" />
                      <div>
                        <div className="text-xs text-text-3">Database Connectivity</div>
                        <div className="text-sm font-semibold text-text capitalize">
                          {effectiveStats?.system_health.database_status ?? 'healthy'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                      <Cpu className="w-5 h-5 text-accent shrink-0" />
                      <div>
                        <div className="text-xs text-text-3">AI Coach Provider</div>
                        <div className="text-sm font-semibold text-text capitalize">
                          {effectiveStats?.system_health.ai_provider_status ?? 'configured'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                      <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
                      <div>
                        <div className="text-xs text-text-3">Scoring Engine</div>
                        <div className="text-sm font-semibold text-text">
                          Formula v{effectiveStats?.system_health.formula_version ?? 2} (Goal-Aligned)
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* TAB 2: USERS */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold text-text">User Directory & Governance</h1>
                <p className="text-sm text-text-2 mt-0.5">
                  Manage account status and administrative privileges. Only aggregate activity counts are shown.
                </p>
              </div>
              <Badge variant="faded">
                {effectiveUsers?.total ?? 0} accounts
              </Badge>
            </div>

            {/* Filters Bar */}
            <Card className="p-4 bg-surface border-border">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextField
                  label="Search Users"
                  placeholder="Search by email or name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <Select
                  label="Account Status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
                  }
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'inactive', label: 'Deactivated Only' },
                  ]}
                />
                <Select
                  label="Role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'member')}
                  options={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'admin', label: 'Platform Admins' },
                    { value: 'member', label: 'Standard Members' },
                  ]}
                />
              </div>
            </Card>

            {isUsersLoading && !effectiveUsers ? (
              <Card className="p-8 text-center text-text-2 text-sm">Loading users...</Card>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Card className="overflow-hidden border-border bg-surface">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-surface-2 text-xs uppercase text-text-3 font-semibold">
                            <th className="py-3 px-4">User</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Activity Counts</th>
                            <th className="py-3 px-4">Joined</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                          {(effectiveUsers?.items ?? []).map((u) => {
                            const isSelf = user?.id === u.id || user?.email === u.email;
                            return (
                              <tr key={u.id} className="hover:bg-surface-2/60 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-text">
                                    {u.full_name || 'Unnamed User'}
                                  </div>
                                  <div className="text-xs text-text-3">{u.email}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  {u.is_active ? (
                                    <Badge variant="olive">Active</Badge>
                                  ) : (
                                    <Badge variant="error">Deactivated</Badge>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  {u.is_admin ? (
                                    <Badge variant="graphite">Admin</Badge>
                                  ) : (
                                    <Badge variant="faded">Member</Badge>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 tabular-nums text-xs text-text-2">
                                  {u.workouts_count} workouts · {u.meals_count} meals
                                </td>
                                <td className="py-3.5 px-4 text-xs text-text-3">
                                  {formatDate(u.created_at, {
                                    includeWeekday: false,
                                    includeYear: true,
                                    monthFormat: 'short',
                                  })}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="inline-flex items-center gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      disabled={isSelf}
                                      onClick={() => {
                                        setStatusReason('');
                                        setStatusModalUser(u);
                                      }}
                                    >
                                      {u.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={isSelf}
                                      onClick={() => setRoleModalUser(u)}
                                    >
                                      {u.is_admin ? 'Demote' : 'Make Admin'}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Mobile Stacked Cards View (<768px) */}
                <div className="md:hidden space-y-3">
                  {(effectiveUsers?.items ?? []).map((u) => {
                    const isSelf = user?.id === u.id || user?.email === u.email;
                    return (
                      <Card key={u.id} className="p-3.5 bg-surface border-border space-y-2.5">
                        <div className="space-y-1.5">
                          <div className="font-semibold text-sm text-text truncate">
                            {u.full_name || 'Unnamed User'}
                          </div>
                          <div className="text-xs text-text-3 truncate">{u.email}</div>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {u.is_active ? (
                              <Badge variant="olive">Active</Badge>
                            ) : (
                              <Badge variant="error">Deactivated</Badge>
                            )}
                            {u.is_admin ? (
                              <Badge variant="graphite">Admin</Badge>
                            ) : (
                              <Badge variant="faded">Member</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-text-2 pt-2 border-t border-border">
                          <span>
                            {u.workouts_count} workouts · {u.meals_count} meals
                          </span>
                          <span>
                            {formatDate(u.created_at, {
                              includeWeekday: false,
                              includeYear: true,
                              monthFormat: 'short',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            disabled={isSelf}
                            onClick={() => {
                              setStatusReason('');
                              setStatusModalUser(u);
                            }}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            disabled={isSelf}
                            onClick={() => setRoleModalUser(u)}
                          >
                            {u.is_admin ? 'Demote' : 'Make Admin'}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: CONTENT CATALOG */}
        {activeTab === 'content' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-text">Catalog Content Moderation</h1>
                <p className="text-sm text-text-2 mt-0.5">
                  Verify and curate platform exercise and nutrition reference catalogs.
                </p>
              </div>
              <div className="inline-flex rounded-lg bg-surface-2 p-1 border border-border self-start">
                <button
                  type="button"
                  onClick={() => setContentSubTab('exercises')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    contentSubTab === 'exercises'
                      ? 'bg-accent text-accent-contrast'
                      : 'text-text-2 hover:text-text'
                  }`}
                >
                  Exercises ({effectiveExercises?.total ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setContentSubTab('foods')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    contentSubTab === 'foods'
                      ? 'bg-accent text-accent-contrast'
                      : 'text-text-2 hover:text-text'
                  }`}
                >
                  Foods ({effectiveFoods?.total ?? 0})
                </button>
              </div>
            </div>

            <Card className="p-4 bg-surface border-border">
              <TextField
                label={
                  contentSubTab === 'exercises'
                    ? 'Search Exercises by Name or Muscle Group'
                    : 'Search Foods by Name or Brand'
                }
                placeholder="Type to filter catalog..."
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
              />
            </Card>

            {contentSubTab === 'exercises' ? (
              isExercisesLoading && !effectiveExercises ? (
                <Card className="p-8 text-center text-text-2 text-sm">Loading exercises...</Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(effectiveExercises?.items ?? []).map((ex) => (
                    <Card
                      key={ex.id}
                      className="p-4 bg-surface border-border flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-text truncate">
                            {ex.name}
                          </span>
                          {ex.is_verified ? (
                            <Badge variant="olive">Verified</Badge>
                          ) : (
                            <Badge variant="faded">Unverified</Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-2 mt-1 capitalize">
                          Muscle: {ex.primary_muscle} · Difficulty: {ex.difficulty || 'standard'}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Edit3 className="w-3.5 h-3.5" />}
                        onClick={() => openEditExercise(ex)}
                      >
                        Edit
                      </Button>
                    </Card>
                  ))}
                </div>
              )
            ) : isFoodsLoading && !effectiveFoods ? (
              <Card className="p-8 text-center text-text-2 text-sm">Loading foods...</Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(effectiveFoods?.items ?? []).map((fd) => (
                  <Card
                    key={fd.id}
                    className="p-4 bg-surface border-border flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-text truncate">
                          {fd.name}
                        </span>
                        {fd.is_verified ? (
                          <Badge variant="olive">Verified</Badge>
                        ) : (
                          <Badge variant="faded">Unverified</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-2 mt-1 tabular-nums">
                        {fd.calories_per_100g} kcal · P {fd.protein_per_100g}g · C{' '}
                        {fd.carbs_per_100g}g · F {fd.fat_per_100g}g (per 100g)
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={() => openEditFood(fd)}
                    >
                      Edit
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-text">Immutable Admin Audit Log</h1>
              <p className="text-sm text-text-2 mt-0.5">
                Chronological record of all administrative status changes, role assignments, and catalog updates.
              </p>
            </div>

            {isAuditLoading && !effectiveAudit ? (
              <Card className="p-8 text-center text-text-2 text-sm">Loading audit records...</Card>
            ) : (
              <div className="space-y-3">
                {(effectiveAudit?.items ?? []).map((entry) => (
                  <Card key={entry.id} className="p-4 bg-surface border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            entry.action.includes('deactivate') || entry.action.includes('demote')
                              ? 'error'
                              : entry.action.includes('promote') || entry.action.includes('activate')
                              ? 'olive'
                              : 'graphite'
                          }
                        >
                          {entry.action}
                        </Badge>
                        <span className="text-xs font-medium text-text">
                          by {entry.admin_email || entry.admin_id}
                        </span>
                        {entry.target_user_email && (
                          <span className="text-xs text-text-2">
                            → Target: <strong>{entry.target_user_email}</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-text-3 tabular-nums">
                        {formatDate(entry.created_at, {
                          includeWeekday: false,
                          includeYear: true,
                          monthFormat: 'short',
                        })}
                      </span>
                    </div>
                    {entry.details && (
                      <pre className="mt-2.5 p-2.5 rounded bg-surface-2 border border-border text-xs text-text-2 overflow-x-auto font-mono">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal: Activate / Deactivate User */}
      <Dialog
        open={Boolean(statusModalUser)}
        onClose={() => setStatusModalUser(null)}
        title={
          statusModalUser?.is_active ? 'Confirm Account Deactivation' : 'Confirm Account Activation'
        }
        description={
          statusModalUser?.is_active
            ? `Deactivating ${statusModalUser.email} will immediately revoke their active sessions and block sign-in.`
            : `Re-activating ${statusModalUser?.email} will restore their ability to sign in.`
        }
      >
        <div className="space-y-4 mt-2">
          <TextField
            label="Audit Reason (Optional)"
            placeholder="e.g., Terms of service violation or user request"
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStatusModalUser(null)}>
              Cancel
            </Button>
            <Button
              variant={statusModalUser?.is_active ? 'destructive' : 'primary'}
              size="sm"
              isLoading={isSubmitting}
              onClick={handleConfirmStatusToggle}
            >
              {statusModalUser?.is_active ? 'Confirm Deactivate' : 'Confirm Activate'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Modal: Promote / Demote Admin Role */}
      <Dialog
        open={Boolean(roleModalUser)}
        onClose={() => setRoleModalUser(null)}
        title={
          roleModalUser?.is_admin
            ? 'Confirm Admin Role Removal'
            : 'Confirm Platform Admin Promotion'
        }
        description={
          roleModalUser?.is_admin
            ? `Demoting ${roleModalUser.email} will remove their access to the Platform Admin console.`
            : `Promoting ${roleModalUser?.email} grants them Platform Admin privileges.`
        }
      >
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button variant="ghost" size="sm" onClick={() => setRoleModalUser(null)}>
            Cancel
          </Button>
          <Button
            variant={roleModalUser?.is_admin ? 'destructive' : 'primary'}
            size="sm"
            isLoading={isSubmitting}
            onClick={handleConfirmRoleToggle}
          >
            {roleModalUser?.is_admin ? 'Confirm Demote' : 'Confirm Promote'}
          </Button>
        </div>
      </Dialog>

      {/* Edit Exercise Modal */}
      <Dialog
        open={Boolean(editingExercise)}
        onClose={() => setEditingExercise(null)}
        title="Edit Catalog Exercise"
        description="Update exercise reference metadata or verification status."
      >
        <div className="space-y-3 mt-2">
          <TextField
            label="Exercise Name"
            value={exerciseForm.name}
            onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
          />
          <TextField
            label="Primary Muscle"
            value={exerciseForm.primary_muscle}
            onChange={(e) => setExerciseForm({ ...exerciseForm, primary_muscle: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-text pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={exerciseForm.is_verified}
              onChange={(e) =>
                setExerciseForm({ ...exerciseForm, is_verified: e.target.checked })
              }
              className="rounded border-border"
            />
            <span>Verified Catalog Entry</span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingExercise(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleSaveExercise}
            >
              Save Exercise
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Food Modal */}
      <Dialog
        open={Boolean(editingFood)}
        onClose={() => setEditingFood(null)}
        title="Edit Catalog Food"
        description="Update nutrition reference macros (per 100g) or verification status."
      >
        <div className="space-y-3 mt-2">
          <TextField
            label="Food Name"
            value={foodForm.name}
            onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Calories / 100g"
              type="number"
              value={foodForm.calories_per_100g}
              onChange={(e) => setFoodForm({ ...foodForm, calories_per_100g: e.target.value })}
            />
            <TextField
              label="Protein (g) / 100g"
              type="number"
              value={foodForm.protein_per_100g}
              onChange={(e) => setFoodForm({ ...foodForm, protein_per_100g: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-text pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={foodForm.is_verified}
              onChange={(e) => setFoodForm({ ...foodForm, is_verified: e.target.checked })}
              className="rounded border-border"
            />
            <span>Verified Catalog Entry</span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingFood(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={isSubmitting} onClick={handleSaveFood}>
              Save Food
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
