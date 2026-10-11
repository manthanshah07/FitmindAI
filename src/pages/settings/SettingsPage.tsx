import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Target,
  Dumbbell,
  Sliders,
  HeartPulse,
  ShieldAlert,
  ChevronRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Info,
  Lock,
  Download,
  Trash2,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/useAuthStore';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { useTheme, type Theme } from '../../lib/theme';
import { getProfileApi, updateProfileApi } from '../../lib/api/profile';
import { getActiveGoalApi, createGoalApi } from '../../lib/api/goals';
import { changePasswordApi } from '../../lib/api/auth';
import { exportUserDataApi, deleteUserAccountApi } from '../../lib/api/user';
import { formatDate, formatWeightByUnit, formatHeightByUnit } from '../../lib/format';
import { getErrorMessage } from '../../utils/apiError';
import type { Gender } from '../../types/profile';
import type { GoalType } from '../../types/goal';

type SettingsSection = 'profile' | 'goal' | 'training' | 'preferences' | 'health' | 'account';

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Bodyweight Only' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'barbell', label: 'Barbell & Plates' },
  { id: 'kettlebell', label: 'Kettlebells' },
  { id: 'pull_up_bar', label: 'Pull-up Bar' },
  { id: 'bench', label: 'Weight Bench' },
  { id: 'machines', label: 'Gym Machines' },
  { id: 'cables', label: 'Cable Station' },
  { id: 'resistance_bands', label: 'Resistance Bands' },
  { id: 'cardio_machines', label: 'Cardio Equipment' },
  { id: 'full_gym', label: 'Full Commercial Gym' },
];

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT -5/-4)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT -6/-5)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT -7/-6)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT -8/-7)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST +0/+1)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST +1/+2)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST +9:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +4:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT +10/+11)' },
];

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { units, setUnits, screenWakeLock, setScreenWakeLock, restTimerSound, setRestTimerSound } =
    usePreferencesStore();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [mobileViewingDetail, setMobileViewingDetail] = useState<boolean>(false);

  // Per-section edit mode state
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<boolean>(false);
  const [editingTraining, setEditingTraining] = useState<boolean>(false);
  const [editingPreferences, setEditingPreferences] = useState<boolean>(false);
  const [editingHealth, setEditingHealth] = useState<boolean>(false);

  // Local form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: 'prefer_not_to_say' as Gender,
    height_cm: '',
    weight_kg: '',
  });

  const [goalForm, setGoalForm] = useState({
    goal_type: 'general_fitness' as GoalType,
    target_weight_kg: '',
    target_date: '',
  });

  const [trainingForm, setTrainingForm] = useState({
    equipment: [] as string[],
    target_workout_days_per_week: 4,
    preferred_workout_duration_minutes: 45,
  });

  const [preferencesForm, setPreferencesForm] = useState({
    timezone: 'UTC',
    units: units,
  });

  const [healthForm, setHealthForm] = useState({
    medical_notes: '',
  });

  // Action status and errors
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Account modal states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState<boolean>(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deletePassword, setDeletePassword] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Queries
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfileApi,
  });

  const {
    data: goal,
    isLoading: isGoalLoading,
    refetch: refetchGoal,
  } = useQuery({
    queryKey: ['activeGoal'],
    queryFn: getActiveGoalApi,
  });

  // Initialize form state when query resolves
  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
        gender: profile.gender || 'prefer_not_to_say',
        height_cm: profile.height_cm ? String(profile.height_cm) : '',
        weight_kg: profile.weight_kg ? String(profile.weight_kg) : '',
      });
      setTrainingForm({
        equipment: profile.equipment || [],
        target_workout_days_per_week: profile.target_workout_days_per_week || 4,
        preferred_workout_duration_minutes: profile.preferred_workout_duration_minutes || 45,
      });
      setPreferencesForm({
        timezone: profile.timezone || 'UTC',
        units: units,
      });
      setHealthForm({
        medical_notes: profile.medical_notes || '',
      });
    }
  }, [profile, units]);

  React.useEffect(() => {
    if (goal) {
      setGoalForm({
        goal_type: goal.goal_type,
        target_weight_kg: goal.target_weight_kg ? String(goal.target_weight_kg) : '',
        target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
      });
    }
  }, [goal]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sec = params.get('section');
      if (sec && ['profile', 'goal', 'training', 'preferences', 'health', 'account'].includes(sec)) {
        setActiveSection(sec as SettingsSection);
        setMobileViewingDetail(true);
      }
    }
  }, []);

  const clearFeedback = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  // Section Save Handlers
  const handleSaveProfile = async () => {
    clearFeedback();
    try {
      const height = profileForm.height_cm ? parseFloat(profileForm.height_cm) : undefined;
      const weight = profileForm.weight_kg ? parseFloat(profileForm.weight_kg) : undefined;

      if (height !== undefined && (isNaN(height) || height < 50 || height > 300)) {
        setErrorMessage('Height must be between 50 and 300 cm.');
        return;
      }
      if (weight !== undefined && (isNaN(weight) || weight < 30 || weight > 300)) {
        setErrorMessage('Weight must be between 30 and 300 kg.');
        return;
      }

      await updateProfileApi({
        full_name: profileForm.full_name.trim(),
        date_of_birth: profileForm.date_of_birth ? profileForm.date_of_birth : undefined,
        gender: profileForm.gender,
        height_cm: height,
        weight_kg: weight,
      });

      setStatusMessage('Profile updated successfully!');
      setEditingProfile(false);
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const handleSaveGoal = async () => {
    clearFeedback();
    try {
      const targetWeight = goalForm.target_weight_kg
        ? parseFloat(goalForm.target_weight_kg)
        : undefined;

      if (targetWeight !== undefined && (isNaN(targetWeight) || targetWeight < 30 || targetWeight > 300)) {
        setErrorMessage('Target weight must be between 30 and 300 kg.');
        return;
      }

      const currentWeight = profile?.weight_kg;
      if (currentWeight && targetWeight) {
        if (
          (goalForm.goal_type === 'fat_loss' || goalForm.goal_type === 'weight_loss') &&
          targetWeight >= currentWeight
        ) {
          setErrorMessage(
            `For fat loss, target weight (${targetWeight} kg) must be lower than your current weight (${currentWeight} kg).`,
          );
          return;
        }
        if (goalForm.goal_type === 'muscle_gain' && targetWeight < currentWeight) {
          setErrorMessage(
            `For muscle gain, target weight (${targetWeight} kg) must be at or above your current weight (${currentWeight} kg).`,
          );
          return;
        }
      }

      await createGoalApi({
        goal_type: goalForm.goal_type,
        target_weight_kg: targetWeight,
        target_date: goalForm.target_date || undefined,
      });

      setStatusMessage('Fitness goal saved successfully!');
      setEditingGoal(false);
      refetchGoal();
      queryClient.invalidateQueries({ queryKey: ['activeGoal'] });
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const handleSaveTraining = async () => {
    clearFeedback();
    try {
      await updateProfileApi({
        equipment: trainingForm.equipment,
        target_workout_days_per_week: trainingForm.target_workout_days_per_week,
        preferred_workout_duration_minutes: trainingForm.preferred_workout_duration_minutes,
      });

      setStatusMessage('Training settings saved successfully!');
      setEditingTraining(false);
      refetchProfile();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const handleSavePreferences = async () => {
    clearFeedback();
    try {
      setUnits(preferencesForm.units);
      await updateProfileApi({
        timezone: preferencesForm.timezone,
      });

      setStatusMessage('Preferences updated successfully!');
      setEditingPreferences(false);
      refetchProfile();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const handleSaveHealth = async () => {
    clearFeedback();
    try {
      await updateProfileApi({
        medical_notes: healthForm.medical_notes,
      });

      setStatusMessage('Health notes updated successfully!');
      setEditingHealth(false);
      refetchProfile();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  // Account management actions
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordForm.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePasswordApi({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordSuccess('Password successfully updated!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => {
        setPasswordDialogOpen(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    clearFeedback();
    try {
      const data = await exportUserDataApi();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fitmind_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage('Data export downloaded successfully!');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    if (!deletePassword) {
      setDeleteError('Password is required to confirm account deletion.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteUserAccountApi(deletePassword);
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setIsDeletingAccount(false);
    }
  };

  // Pace calculation helper
  const calculatePaceInfo = () => {
    if (!profile?.weight_kg || !goalForm.target_weight_kg || !goalForm.target_date) return null;
    const currentW = profile.weight_kg;
    const targetW = parseFloat(goalForm.target_weight_kg);
    if (isNaN(targetW)) return null;

    const targetDateObj = new Date(goalForm.target_date);
    const today = new Date();
    const diffDays = Math.ceil((targetDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const diffWeeks = diffDays / 7;

    if (diffWeeks <= 0) return { isPast: true };

    const weightDelta = Math.abs(currentW - targetW);
    const kgPerWeek = weightDelta / diffWeeks;
    const isAggressive = kgPerWeek > 1.0;

    return {
      diffWeeks: diffWeeks.toFixed(1),
      kgPerWeek: kgPerWeek.toFixed(2),
      isAggressive,
    };
  };

  const paceInfo = calculatePaceInfo();

  const navItems = [
    { id: 'profile' as const, label: 'Profile', icon: UserIcon, desc: 'Name, DOB, gender & physical metrics' },
    { id: 'goal' as const, label: 'Goal', icon: Target, desc: 'Target weight, target date & pace' },
    { id: 'training' as const, label: 'Training', icon: Dumbbell, desc: 'Equipment, duration & weekly split' },
    { id: 'preferences' as const, label: 'Preferences', icon: Sliders, desc: 'Units, timezone, theme & alerts' },
    { id: 'health' as const, label: 'Health Notes', icon: HeartPulse, desc: 'Injuries & coach safety notes' },
    { id: 'account' as const, label: 'Account', icon: ShieldAlert, desc: 'Password, data export & deletion' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-20">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, goal, training, and account preferences."
      />

      {statusMessage && (
        <div
          role="status"
          className="mb-6 p-4 rounded-lg border border-accent/30 bg-accent/10 text-accent text-sm font-medium flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-lg border border-danger/30 bg-danger-soft text-danger text-sm font-medium flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="md:grid md:grid-cols-12 md:gap-8">
        {/* Navigation Column */}
        <aside
          className={`col-span-4 lg:col-span-3 ${
            mobileViewingDetail ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileViewingDetail(true);
                    clearFeedback();
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-lg border transition-all text-left ${
                    isActive
                      ? 'bg-accent/10 border-accent/40 text-accent font-semibold shadow-xs'
                      : 'bg-surface border-border text-text hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-accent' : 'text-text-2'}`} />
                    <div className="truncate">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-text-3 truncate hidden sm:block md:hidden lg:block">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-3 shrink-0 ml-2" />
                </button>
              );
            })}

            {user?.is_admin && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-accent/30 bg-accent-soft/30 text-left text-accent hover:bg-accent-soft transition-all mt-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent text-accent-contrast">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Platform Admin</div>
                    <div className="text-xs text-text-2 truncate">
                      Users, catalog & audit logs
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-accent shrink-0 ml-2" />
              </button>
            )}
          </div>
        </aside>

        {/* Content Column */}
        <main
          className={`col-span-8 lg:col-span-9 mt-4 md:mt-0 ${
            !mobileViewingDetail ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Mobile Back Button */}
          <div className="md:hidden mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMobileViewingDetail(false);
                clearFeedback();
              }}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Settings
            </Button>
          </div>

          {/* SECTION 1: PROFILE */}
          {activeSection === 'profile' && (
            <Card className="p-6 border-border bg-surface">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-text">Personal Profile</h2>
                  <p className="text-xs text-text-2">
                    Your foundational personal details and biometric inputs.
                  </p>
                </div>
                {!editingProfile ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      clearFeedback();
                      setEditingProfile(true);
                    }}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        clearFeedback();
                        if (profile) {
                          setProfileForm({
                            full_name: profile.full_name || '',
                            date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
                            gender: profile.gender || 'prefer_not_to_say',
                            height_cm: profile.height_cm ? String(profile.height_cm) : '',
                            weight_kg: profile.weight_kg ? String(profile.weight_kg) : '',
                          });
                        }
                        setEditingProfile(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSaveProfile}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>

              {isProfileLoading ? (
                <div className="py-8 text-center text-text-2 text-sm">Loading profile...</div>
              ) : !editingProfile ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Full Name
                    </label>
                    <p className="text-sm font-semibold text-text">
                      {profile?.full_name || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Date of Birth
                    </label>
                    <p className="text-sm font-semibold text-text">
                      {profile?.date_of_birth
                        ? formatDate(profile.date_of_birth, {
                            includeWeekday: false,
                            includeYear: true,
                            monthFormat: 'short',
                          })
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Sex / Gender
                    </label>
                    <p className="text-sm font-semibold text-text capitalize">
                      {profile?.gender ? profile.gender.replace('_', ' ') : 'Prefer not to say'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Current Weight
                    </label>
                    <p className="text-sm font-semibold text-text">
                      {formatWeightByUnit(profile?.weight_kg, units)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Height
                    </label>
                    <p className="text-sm font-semibold text-text">
                      {formatHeightByUnit(profile?.height_cm, units)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Account Email
                    </label>
                    <p className="text-sm font-semibold text-text">{user?.email || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <TextField
                    label="Full Name"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  />
                  <div>
                    <label className="text-xs font-medium text-text-2 block mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={profileForm.date_of_birth}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, date_of_birth: e.target.value })
                      }
                      className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <Select
                    label="Sex / Gender"
                    value={profileForm.gender}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, gender: e.target.value as Gender })
                    }
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' },
                      { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                    ]}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <TextField
                      label={`Current Weight (${units === 'imperial' ? 'lbs' : 'kg'})`}
                      type="number"
                      step="0.1"
                      value={profileForm.weight_kg}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, weight_kg: e.target.value })
                      }
                    />
                    <TextField
                      label={`Height (${units === 'imperial' ? 'inches' : 'cm'})`}
                      type="number"
                      step="0.1"
                      value={profileForm.height_cm}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, height_cm: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* SECTION 2: GOAL */}
          {activeSection === 'goal' && (
            <Card className="p-6 border-border bg-surface">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-text">Fitness Goal</h2>
                  <p className="text-xs text-text-2">
                    Primary objective guiding macro calculation and training suggestions.
                  </p>
                </div>
                {!editingGoal ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      clearFeedback();
                      setEditingGoal(true);
                    }}
                  >
                    Edit Goal
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        clearFeedback();
                        if (goal) {
                          setGoalForm({
                            goal_type: goal.goal_type,
                            target_weight_kg: goal.target_weight_kg ? String(goal.target_weight_kg) : '',
                            target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
                          });
                        }
                        setEditingGoal(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSaveGoal}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>

              {/* M6 Conflict Warning Banner */}
              {goal?.has_goal_conflict && (
                <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Goal Reconciliation Notice</span>
                    {goal.conflict_reason ||
                      'Your intake target or workout frequency conflicts with your chosen goal. Consider reconciling your target weight or timeframe.'}
                  </div>
                </div>
              )}

              {isGoalLoading ? (
                <div className="py-8 text-center text-text-2 text-sm">Loading goal...</div>
              ) : !editingGoal ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Active Goal
                    </label>
                    <p className="text-sm font-semibold text-text capitalize">
                      {goal?.goal_type ? goal.goal_type.replace('_', ' ') : 'General Fitness'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Target Weight
                    </label>
                    <p className="text-sm font-semibold text-text">
                      {goal?.target_weight_kg
                        ? formatWeightByUnit(goal.target_weight_kg, units)
                        : 'No specific target weight'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Target Date
                    </label>
                    <p className="text-sm font-semibold text-text">
                      {goal?.target_date
                        ? formatDate(goal.target_date, {
                            includeWeekday: false,
                            includeYear: true,
                            monthFormat: 'short',
                          })
                        : 'No target deadline'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Recommended Pace
                    </label>
                    <p className="text-sm font-semibold text-text">
                      {paceInfo && !paceInfo.isPast ? (
                        <span>
                          {paceInfo.kgPerWeek} kg/week ({paceInfo.diffWeeks} weeks left)
                        </span>
                      ) : (
                        'Safe standard pace (0.25 – 0.75 kg/wk)'
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Select
                    label="Primary Goal"
                    value={goalForm.goal_type}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, goal_type: e.target.value as GoalType })
                    }
                    options={[
                      { value: 'weight_loss', label: 'Weight Loss' },
                      { value: 'fat_loss', label: 'Fat Loss' },
                      { value: 'muscle_gain', label: 'Muscle Gain' },
                      { value: 'maintenance', label: 'Maintenance' },
                      { value: 'endurance', label: 'Endurance & Conditioning' },
                      { value: 'general_fitness', label: 'General Fitness' },
                    ]}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <TextField
                        label={`Target Weight (${units === 'imperial' ? 'lbs' : 'kg'})`}
                        type="number"
                        step="0.1"
                        placeholder="e.g. 75"
                        value={goalForm.target_weight_kg}
                        onChange={(e) =>
                          setGoalForm({ ...goalForm, target_weight_kg: e.target.value })
                        }
                      />
                      <p className="text-[11px] text-text-3 mt-1">
                        {goalForm.goal_type === 'fat_loss' || goalForm.goal_type === 'weight_loss'
                          ? 'Must be lower than current weight.'
                          : goalForm.goal_type === 'muscle_gain'
                          ? 'Must be equal to or higher than current weight.'
                          : 'Optional weight target.'}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-text-2 block mb-1.5">
                        Target Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={goalForm.target_date}
                        onChange={(e) =>
                          setGoalForm({ ...goalForm, target_date: e.target.value })
                        }
                        className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <p className="text-[11px] text-text-3 mt-1">
                        Recommended healthy pace: 0.25 to 0.75 kg/week.
                      </p>
                    </div>
                  </div>

                  {paceInfo && !paceInfo.isPast && (
                    <div
                      className={`p-3 rounded-md border text-xs flex items-center gap-2 ${
                        paceInfo.isAggressive
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                          : 'bg-accent/10 border-accent/30 text-accent'
                      }`}
                    >
                      <Info className="w-4 h-4 shrink-0" />
                      <span>
                        Calculated pace: <strong>{paceInfo.kgPerWeek} kg/week</strong> over{' '}
                        {paceInfo.diffWeeks} weeks.{' '}
                        {paceInfo.isAggressive &&
                          'Aggressive pace (> 1.0 kg/wk). Consider extending deadline.'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* SECTION 3: TRAINING */}
          {activeSection === 'training' && (
            <Card className="p-6 border-border bg-surface">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-text">Training Setup</h2>
                  <p className="text-xs text-text-2">
                    Available gym equipment, weekly session frequency, and target workout length.
                  </p>
                </div>
                {!editingTraining ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      clearFeedback();
                      setEditingTraining(true);
                    }}
                  >
                    Edit Training
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        clearFeedback();
                        if (profile) {
                          setTrainingForm({
                            equipment: profile.equipment || [],
                            target_workout_days_per_week: profile.target_workout_days_per_week || 4,
                            preferred_workout_duration_minutes:
                              profile.preferred_workout_duration_minutes || 45,
                          });
                        }
                        setEditingTraining(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSaveTraining}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>

              {!editingTraining ? (
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-2">
                      Available Equipment
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {profile?.equipment && profile.equipment.length > 0 ? (
                        profile.equipment.map((eq) => {
                          const item = EQUIPMENT_OPTIONS.find((o) => o.id === eq);
                          return (
                            <Badge key={eq} variant="olive">
                              {item ? item.label : eq}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs text-text-3">No equipment selected</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                        Weekly Target Days
                      </label>
                      <p className="text-sm font-semibold text-text">
                        {profile?.target_workout_days_per_week || 4} days / week
                      </p>
                    </div>
                    <div>
                      <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                        Target Session Duration
                      </label>
                      <p className="text-sm font-semibold text-text">
                        {profile?.preferred_workout_duration_minutes || 45} minutes
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-2">
                      Available Equipment (Select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {EQUIPMENT_OPTIONS.map((item) => {
                        const selected = trainingForm.equipment.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              const updated = selected
                                ? trainingForm.equipment.filter((id) => id !== item.id)
                                : [...trainingForm.equipment, item.id];
                              setTrainingForm({ ...trainingForm, equipment: updated });
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              selected
                                ? 'bg-accent text-white border-accent'
                                : 'bg-surface-2 text-text-2 border-border hover:border-accent/40'
                            }`}
                          >
                            {selected ? '✓ ' : '+ '}
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Days Per Week"
                      value={String(trainingForm.target_workout_days_per_week)}
                      onChange={(e) =>
                        setTrainingForm({
                          ...trainingForm,
                          target_workout_days_per_week: parseInt(e.target.value, 10),
                        })
                      }
                      options={[
                        { value: '1', label: '1 Day / Week' },
                        { value: '2', label: '2 Days / Week' },
                        { value: '3', label: '3 Days / Week' },
                        { value: '4', label: '4 Days / Week (Recommended)' },
                        { value: '5', label: '5 Days / Week' },
                        { value: '6', label: '6 Days / Week' },
                        { value: '7', label: '7 Days / Week' },
                      ]}
                    />

                    <Select
                      label="Session Duration"
                      value={String(trainingForm.preferred_workout_duration_minutes)}
                      onChange={(e) =>
                        setTrainingForm({
                          ...trainingForm,
                          preferred_workout_duration_minutes: parseInt(e.target.value, 10),
                        })
                      }
                      options={[
                        { value: '15', label: '15 min (Express)' },
                        { value: '30', label: '30 min (Short)' },
                        { value: '45', label: '45 min (Standard)' },
                        { value: '60', label: '60 min (Full)' },
                        { value: '90', label: '90 min (Extended)' },
                      ]}
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* SECTION 4: PREFERENCES */}
          {activeSection === 'preferences' && (
            <Card className="p-6 border-border bg-surface">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-text">App Preferences</h2>
                  <p className="text-xs text-text-2">
                    Unit measurements, client timezone, interface theme, and workout utility toggles.
                  </p>
                </div>
                {!editingPreferences ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      clearFeedback();
                      setEditingPreferences(true);
                    }}
                  >
                    Edit Preferences
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        clearFeedback();
                        setPreferencesForm({
                          timezone: profile?.timezone || 'UTC',
                          units: units,
                        });
                        setEditingPreferences(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSavePreferences}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>

              {!editingPreferences ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Measurement Units
                    </label>
                    <p className="text-sm font-semibold text-text capitalize">
                      {units === 'imperial' ? 'Imperial (lbs, in)' : 'Metric (kg, cm)'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Timezone
                    </label>
                    <p className="text-sm font-semibold text-text">
                      {profile?.timezone || 'UTC'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Color Theme
                    </label>
                    <p className="text-sm font-semibold text-text capitalize">{theme}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Screen Wake Lock
                    </label>
                    <p className="text-sm font-semibold text-text">
                      {screenWakeLock ? 'Enabled (Screen stays awake during workouts)' : 'Disabled'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                      Rest Timer Sound
                    </label>
                    <p className="text-sm font-semibold text-text">
                      {restTimerSound ? 'Enabled (Sound alert when rest finishes)' : 'Disabled'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="text-xs font-medium text-text-2 block mb-2">
                      Unit System
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-w-sm">
                      <button
                        type="button"
                        onClick={() =>
                          setPreferencesForm({ ...preferencesForm, units: 'metric' })
                        }
                        className={`p-3 rounded-md border text-sm font-medium transition-all ${
                          preferencesForm.units === 'metric'
                            ? 'bg-accent/10 border-accent text-accent font-semibold'
                            : 'bg-surface-2 border-border text-text hover:bg-surface'
                        }`}
                      >
                        Metric (kg, cm)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPreferencesForm({ ...preferencesForm, units: 'imperial' })
                        }
                        className={`p-3 rounded-md border text-sm font-medium transition-all ${
                          preferencesForm.units === 'imperial'
                            ? 'bg-accent/10 border-accent text-accent font-semibold'
                            : 'bg-surface-2 border-border text-text hover:bg-surface'
                        }`}
                      >
                        Imperial (lbs, in)
                      </button>
                    </div>
                  </div>

                  <Select
                    label="Client Timezone"
                    value={preferencesForm.timezone}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, timezone: e.target.value })
                    }
                    options={TIMEZONE_OPTIONS}
                  />

                  <div>
                    <label className="text-xs font-medium text-text-2 block mb-2">
                      Interface Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3 max-w-md">
                      {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTheme(t)}
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-medium capitalize ${
                            theme === t
                              ? 'bg-accent/10 border-accent text-accent font-semibold'
                              : 'bg-surface-2 border-border text-text'
                          }`}
                        >
                          {t === 'light' && <Sun className="w-3.5 h-3.5" />}
                          {t === 'dark' && <Moon className="w-3.5 h-3.5" />}
                          {t === 'system' && <Monitor className="w-3.5 h-3.5" />}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 border-t border-border">
                    <label className="flex items-center justify-between p-3 rounded-md border border-border bg-surface-2 cursor-pointer">
                      <div>
                        <span className="text-sm font-medium text-text block">Screen Wake Lock</span>
                        <span className="text-xs text-text-3 block">
                          Prevent phone display from sleeping while workout session is active
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={screenWakeLock}
                        onChange={(e) => setScreenWakeLock(e.target.checked)}
                        className="w-4 h-4 text-accent rounded accent-accent"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-md border border-border bg-surface-2 cursor-pointer">
                      <div>
                        <span className="text-sm font-medium text-text block">Rest Timer Sound</span>
                        <span className="text-xs text-text-3 block">
                          Play an audio chime when the rest timer countdown reaches zero
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={restTimerSound}
                        onChange={(e) => setRestTimerSound(e.target.checked)}
                        className="w-4 h-4 text-accent rounded accent-accent"
                      />
                    </label>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* SECTION 5: HEALTH NOTES */}
          {activeSection === 'health' && (
            <Card className="p-6 border-border bg-surface">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-text">Health & Injury Notes</h2>
                  <p className="text-xs text-text-2">
                    Medical conditions and physical restrictions.
                  </p>
                </div>
                {!editingHealth ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      clearFeedback();
                      setEditingHealth(true);
                    }}
                  >
                    Edit Notes
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        clearFeedback();
                        if (profile) {
                          setHealthForm({ medical_notes: profile.medical_notes || '' });
                        }
                        setEditingHealth(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSaveHealth}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>

              {/* Explicit AI Coach Disclosure */}
              <div className="mb-6 p-4 rounded-lg border border-accent/30 bg-accent/10 text-accent text-xs flex items-start gap-3">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">AI Coach Safety Integration</span>
                  These notes are directly factored into your AI Coach recommendations to protect
                  against injury, recommend substitutions, and respect joint or movement constraints.
                </div>
              </div>

              {!editingHealth ? (
                <div>
                  <label className="text-xs uppercase font-medium text-text-3 block mb-1">
                    Recorded Medical Notes & Constraints
                  </label>
                  <p className="text-sm text-text whitespace-pre-wrap leading-relaxed bg-surface-2 p-4 rounded-md border border-border">
                    {profile?.medical_notes || 'No health restrictions or injuries recorded.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-medium text-text-2 block">
                    Medical Notes & Movement Restrictions
                  </label>
                  <textarea
                    rows={4}
                    value={healthForm.medical_notes}
                    onChange={(e) => setHealthForm({ medical_notes: e.target.value })}
                    placeholder="e.g. Lower back stiffness on deadlifts; previous rotator cuff sprain on left side..."
                    className="w-full bg-surface-2 border border-border rounded-md p-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-[11px] text-text-3">
                    Do not enter emergency medical data. In case of acute injury, consult a physician.
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* SECTION 6: ACCOUNT */}
          {activeSection === 'account' && (
            <div className="flex flex-col gap-6">
              {/* Account Security Card */}
              <Card className="p-6 border-border bg-surface">
                <div className="pb-4 border-b border-border mb-4">
                  <h2 className="text-lg font-semibold text-text">Account & Security</h2>
                  <p className="text-xs text-text-2">
                    Manage your login credentials and data portability.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-border">
                  <div>
                    <span className="text-sm font-semibold text-text block">Password</span>
                    <span className="text-xs text-text-3 block">
                      Change your password to keep your account secure
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Lock className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setPasswordError(null);
                      setPasswordSuccess(null);
                      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
                      setPasswordDialogOpen(true);
                    }}
                  >
                    Change Password
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
                  <div>
                    <span className="text-sm font-semibold text-text block">Export My Data</span>
                    <span className="text-xs text-text-3 block">
                      Download a complete JSON archive of all your workouts, measurements, goals, and history
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isExporting}
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleExportData}
                  >
                    {isExporting ? 'Exporting...' : 'Export JSON'}
                  </Button>
                </div>
              </Card>

              {/* Danger Zone Card */}
              <Card className="p-6 border-danger/30 bg-surface">
                <div className="pb-4 border-b border-border mb-4">
                  <h2 className="text-lg font-semibold text-danger">Danger Zone</h2>
                  <p className="text-xs text-text-2">
                    Irreversible actions that affect your account and history.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-semibold text-text block">Delete Account</span>
                    <span className="text-xs text-text-3 block">
                      Permanently delete your account and all associated workout, nutrition, and conversation data
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setDeletePassword('');
                      setDeleteError(null);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    Delete Account
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* CHANGE PASSWORD DIALOG */}
      <Dialog
        isOpen={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        title="Change Password"
        description="Enter your current password and your new password."
      >
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4 mt-4">
          {passwordError && (
            <div className="p-3 rounded-md bg-danger-soft border border-danger/30 text-danger text-xs font-medium">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 rounded-md bg-accent/10 border border-accent/30 text-accent text-xs font-medium">
              {passwordSuccess}
            </div>
          )}

          <TextField
            label="Current Password"
            type="password"
            value={passwordForm.current_password}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, current_password: e.target.value })
            }
            required
          />

          <TextField
            label="New Password"
            type="password"
            value={passwordForm.new_password}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, new_password: e.target.value })
            }
            required
          />

          <TextField
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirm_password}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
            }
            required
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPasswordDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE ACCOUNT CONFIRMATION DIALOG */}
      <Dialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete FitMind Account"
        description="This action is permanent and cannot be undone. All your workout records, measurements, goals, and coach chats will be permanently erased."
      >
        <div className="flex flex-col gap-4 mt-4">
          {deleteError && (
            <div className="p-3 rounded-md bg-danger-soft border border-danger/30 text-danger text-xs font-medium">
              {deleteError}
            </div>
          )}

          <TextField
            label="Confirm Password"
            type="password"
            placeholder="Enter your current password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeletingAccount}
              onClick={handleDeleteAccount}
            >
              {isDeletingAccount ? 'Deleting...' : 'Permanently Delete Account'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
