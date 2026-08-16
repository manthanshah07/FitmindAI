import { api } from './client';
import type { Profile, ProfileUpdate, OnboardingCreate } from '../../types/profile';

export async function getProfileApi(): Promise<Profile> {
  const response = await api.get<Profile>('/profile');
  return response.data;
}

export async function updateProfileApi(data: ProfileUpdate): Promise<Profile> {
  const response = await api.put<Profile>('/profile', data);
  return response.data;
}

export async function completeOnboardingApi(data: OnboardingCreate): Promise<Profile> {
  const response = await api.post<Profile>('/profile/onboarding', data);
  return response.data;
}
