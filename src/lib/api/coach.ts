import { api } from './client';
import type { CoachChatRequest, CoachChatResponse } from '../../types/coach';

export async function sendCoachMessageApi(
  payload: CoachChatRequest,
): Promise<CoachChatResponse> {
  const response = await api.post<CoachChatResponse>('/coach/chat', payload);
  return response.data;
}
