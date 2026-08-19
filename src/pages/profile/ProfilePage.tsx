import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { getProfileApi, updateProfileApi } from '../../lib/api/profile';
import { getErrorMessage } from '../../utils/apiError';
import type { Profile, Gender, ActivityLevel, DietPreference } from '../../types/profile';

const EQUIPMENT_OPTIONS = [
  { value: 'bodyweight', label: 'Bodyweight Only' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'barbell', label: 'Barbell & Plates' },
  { value: 'kettlebell', label: 'Kettlebells' },
  { value: 'machines', label: 'Gym Machines' },
  { value: 'cables', label: 'Cable Station' },
  { value: 'resistance_bands', label: 'Resistance Bands' },
  { value: 'cardio_machines', label: 'Cardio Equipment' },
  { value: 'full_gym', label: 'Full Commercial Gym' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary (Little or no exercise)' },
  { value: 'light', label: 'Lightly Active (1-3 days/week)' },
  { value: 'moderate', label: 'Moderately Active (3-5 days/week)' },
  { value: 'very_active', label: 'Very Active (6-7 days/week)' },
  { value: 'extra_active', label: 'Extra Active (Hard daily exercise/job)' },
];

const DIET_OPTIONS = [
  { value: 'omnivore', label: 'Omnivore (No Restrictions)' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'keto', label: 'Ketogenic' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'other', label: 'Other' },
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

const DURATION_OPTIONS = [
  { value: '15', label: '15 Minutes (Express)' },
  { value: '30', label: '30 Minutes (Short)' },
  { value: '45', label: '45 Minutes (Standard)' },
  { value: '60', label: '60 Minutes (Full)' },
  { value: '90', label: '90 Minutes (Extended)' },
];

const DAYS_OPTIONS = [
  { value: '1', label: '1 Day / Week' },
  { value: '2', label: '2 Days / Week' },
  { value: '3', label: '3 Days / Week' },
  { value: '4', label: '4 Days / Week (Recommended)' },
  { value: '5', label: '5 Days / Week' },
  { value: '6', label: '6 Days / Week' },
  { value: '7', label: '7 Days / Week' },
];

const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be under 100 characters'),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  height_cm: z
    .number({ message: 'Height must be a number' })
    .min(50, 'Height must be at least 50 cm')
    .max(300, 'Height must be under 300 cm')
    .optional(),
  weight_kg: z
    .number({ message: 'Weight must be a number' })
    .min(30, 'Weight must be at least 30 kg')
    .max(300, 'Weight must be under 300 kg')
    .optional(),
  activity_level: z
    .enum(['sedentary', 'light', 'moderate', 'very_active', 'extra_active'])
    .optional(),
  diet_preference: z
    .enum(['omnivore', 'vegetarian', 'vegan', 'keto', 'paleo', 'pescatarian', 'other'])
    .optional(),
  timezone: z.string().optional(),
  preferred_workout_duration_minutes: z.number().min(15).max(180).optional(),
  target_workout_days_per_week: z.number().min(1).max(7).optional(),
  medical_notes: z.string().optional().nullable(),
});




type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true);
        const data = await getProfileApi();
        setProfile(data);
        setSelectedEquipment(data.equipment || ['bodyweight']);
        reset({
          full_name: data.full_name || '',
          date_of_birth: data.date_of_birth || '',
          gender: (data.gender as Gender) || 'prefer_not_to_say',
          height_cm: data.height_cm || undefined,
          weight_kg: data.weight_kg || undefined,
          activity_level: (data.activity_level as ActivityLevel) || 'moderate',
          diet_preference: (data.diet_preference as DietPreference) || 'omnivore',
          timezone: data.timezone || 'UTC',
          preferred_workout_duration_minutes: data.preferred_workout_duration_minutes || 45,
          target_workout_days_per_week: data.target_workout_days_per_week || 4,
          medical_notes: data.medical_notes || '',
        });
      } catch (err) {
        setFeedbackMessage({ type: 'error', text: getErrorMessage(err) });
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [reset]);

  const toggleEquipment = (eq: string) => {
    if (!isEditing) return;
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((item) => item !== eq) : [...prev, eq],
    );
  };

  const handleCancel = () => {
    if (profile) {
      reset({
        full_name: profile.full_name || '',
        date_of_birth: profile.date_of_birth || '',
        gender: (profile.gender as Gender) || 'prefer_not_to_say',
        height_cm: profile.height_cm || undefined,
        weight_kg: profile.weight_kg || undefined,
        activity_level: (profile.activity_level as ActivityLevel) || 'moderate',
        diet_preference: (profile.diet_preference as DietPreference) || 'omnivore',
        timezone: profile.timezone || 'UTC',
        preferred_workout_duration_minutes: profile.preferred_workout_duration_minutes || 45,
        target_workout_days_per_week: profile.target_workout_days_per_week || 4,
        medical_notes: profile.medical_notes || '',
      });
      setSelectedEquipment(profile.equipment || ['bodyweight']);
    }
    setIsEditing(false);
    setFeedbackMessage(null);
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {


      setIsSubmitting(true);
      setFeedbackMessage(null);

      const payload = {
        full_name: data.full_name,
        date_of_birth: data.date_of_birth || undefined,
        gender: data.gender,
        height_cm: data.height_cm,
        weight_kg: data.weight_kg,
        activity_level: data.activity_level,
        diet_preference: data.diet_preference,
        equipment: selectedEquipment,
        timezone: data.timezone,
        preferred_workout_duration_minutes: data.preferred_workout_duration_minutes ? Number(data.preferred_workout_duration_minutes) : undefined,
        target_workout_days_per_week: data.target_workout_days_per_week ? Number(data.target_workout_days_per_week) : undefined,

        medical_notes: data.medical_notes || undefined,
      };

      const updated = await updateProfileApi(payload);
      setProfile(updated);
      setIsEditing(false);
      setFeedbackMessage({ type: 'success', text: 'Profile updated successfully!' });

    } catch (err) {
      setFeedbackMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-borderLine bg-bone min-h-[400px]">
        <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">
          FitMind Profile
        </span>
        <h3 className="text-xl font-bold uppercase tracking-tighter animate-pulse font-mono">
          Loading Profile Settings...
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderLine pb-6">
        <div>
          <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold block mb-1">
            Account & Settings
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-graphite">
            User Profile & Preferences
          </h1>
          <p className="text-sm text-charcoal font-sans mt-1">
            Manage your personal metrics, regional timezone settings, and physical constraints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={profile?.onboarding_complete ? 'olive' : 'faded'}>
            {profile?.onboarding_complete ? 'Onboarding Complete' : 'Onboarding Pending'}
          </Badge>
          {!isEditing ? (
            <Button variant="primary" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Alert Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 border font-mono text-xs uppercase tracking-wider ${
            feedbackMessage.type === 'success'
              ? 'border-olive bg-olive/5 text-olive'
              : 'border-error bg-error/5 text-error'
          }`}
          role={feedbackMessage.type === 'error' ? 'alert' : 'status'}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        {/* Section 1: Personal Information */}
        <Card className="p-6 md:p-8">
          <h2 className="text-lg font-bold uppercase tracking-tighter text-graphite font-mono mb-6 pb-3 border-b border-borderLine">
            1. Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Full Name"
              disabled={!isEditing || isSubmitting}
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            <Input
              label="Date of Birth"
              type="date"
              disabled={!isEditing || isSubmitting}
              error={errors.date_of_birth?.message}
              {...register('date_of_birth')}
            />

            <Select
              label="Gender"
              options={GENDER_OPTIONS}
              disabled={!isEditing || isSubmitting}
              error={errors.gender?.message}
              {...register('gender')}
            />
          </div>
        </Card>

        {/* Section 2: Physical Metrics */}
        <Card className="p-6 md:p-8">
          <h2 className="text-lg font-bold uppercase tracking-tighter text-graphite font-mono mb-6 pb-3 border-b border-borderLine">
            2. Physical Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Current Weight (kg)"
              type="number"
              step="0.1"
              placeholder="e.g. 75.5"
              disabled={!isEditing || isSubmitting}
              error={errors.weight_kg?.message}
              {...register('weight_kg', { valueAsNumber: true })}
            />

            <Input
              label="Height (cm)"
              type="number"
              step="0.5"
              placeholder="e.g. 178"
              disabled={!isEditing || isSubmitting}
              error={errors.height_cm?.message}
              {...register('height_cm', { valueAsNumber: true })}
            />
          </div>
        </Card>

        {/* Section 3: Fitness Preferences */}
        <Card className="p-6 md:p-8">
          <h2 className="text-lg font-bold uppercase tracking-tighter text-graphite font-mono mb-6 pb-3 border-b border-borderLine">
            3. Fitness & Activity Preferences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Select
              label="Activity Level"
              options={ACTIVITY_OPTIONS}
              disabled={!isEditing || isSubmitting}
              error={errors.activity_level?.message}
              {...register('activity_level')}
            />

            <Select
              label="Dietary Preference"
              options={DIET_OPTIONS}
              disabled={!isEditing || isSubmitting}
              error={errors.diet_preference?.message}
              {...register('diet_preference')}
            />
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-graphite font-bold block mb-3">
              Available Training Equipment
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const isSelected = selectedEquipment.includes(eq.value);
                return (
                  <button
                    key={eq.value}
                    type="button"
                    onClick={() => toggleEquipment(eq.value)}
                    disabled={!isEditing || isSubmitting}
                    className={`p-3 text-left font-mono text-xs uppercase tracking-wider border transition-colors ${
                      isSelected
                        ? 'border-olive bg-olive/10 text-graphite font-bold'
                        : 'border-borderLine text-charcoal hover:border-graphite'
                    } ${!isEditing ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                  >
                    <span className="mr-2">{isSelected ? '✓' : '+'}</span>
                    {eq.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Section 4: Application & Regional Settings */}
        <Card className="p-6 md:p-8">
          <h2 className="text-lg font-bold uppercase tracking-tighter text-graphite font-mono mb-6 pb-3 border-b border-borderLine">
            4. Application & Regional Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select
              label="Primary Timezone (IANA)"
              options={TIMEZONE_OPTIONS}
              disabled={!isEditing || isSubmitting}
              error={errors.timezone?.message}
              {...register('timezone')}
            />

            <Select
              label="Target Workout Days"
              options={DAYS_OPTIONS}
              disabled={!isEditing || isSubmitting}
              error={errors.target_workout_days_per_week?.message}
              {...register('target_workout_days_per_week')}
            />

            <Select
              label="Preferred Workout Duration"
              options={DURATION_OPTIONS}
              disabled={!isEditing || isSubmitting}
              error={errors.preferred_workout_duration_minutes?.message}
              {...register('preferred_workout_duration_minutes')}
            />

          </div>
        </Card>

        {/* Section 5: Safety & Medical Constraints */}
        <Card className="p-6 md:p-8">
          <h2 className="text-lg font-bold uppercase tracking-tighter text-graphite font-mono mb-6 pb-3 border-b border-borderLine">
            5. Safety & Health Constraints
          </h2>
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs uppercase tracking-widest text-graphite font-bold">
              Medical Notes / Injury Limitations
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Lower back pain during heavy squats, right shoulder tightness..."
              disabled={!isEditing || isSubmitting}
              className="w-full bg-bone border border-borderLine p-3.5 font-sans text-sm text-graphite placeholder:text-faded focus:outline-none focus:ring-2 focus:ring-olive disabled:opacity-60"
              {...register('medical_notes')}
            />
          </div>
        </Card>
      </form>
    </div>
  );
};
