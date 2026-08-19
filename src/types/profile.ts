export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';

export type DietPreference =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'paleo'
  | 'pescatarian'
  | 'other';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: Gender | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: ActivityLevel | null;
  diet_preference?: DietPreference | null;
  equipment?: string[] | null;
  medical_notes?: string | null;
  timezone: string;
  preferred_workout_duration_minutes?: number | null;
  target_workout_days_per_week?: number | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  full_name?: string;
  date_of_birth?: string;
  gender?: Gender;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: ActivityLevel;
  diet_preference?: DietPreference;
  equipment?: string[];
  medical_notes?: string;
  timezone?: string;
  preferred_workout_duration_minutes?: number;
  target_workout_days_per_week?: number;
}

export interface OnboardingCreate {
  full_name?: string;
  date_of_birth?: string;
  gender?: Gender;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: ActivityLevel;
  diet_preference?: DietPreference;
  equipment?: string[];
  medical_notes?: string;
  timezone?: string;
  preferred_workout_duration_minutes?: number;
  target_workout_days_per_week?: number;
}
