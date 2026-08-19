import { api } from './client';
import type { CoachChatRequest, CoachChatResponse, ChatMessageResponse } from '../../types/coach';

export async function sendCoachMessageApi(
  payload: CoachChatRequest,
): Promise<CoachChatResponse> {
  const response = await api.post<CoachChatResponse>('/coach/chat', payload);
  return response.data;
}

export async function getCoachHistoryApi(limit = 50): Promise<ChatMessageResponse[]> {
  const response = await api.get<ChatMessageResponse[]>('/coach/history', {
    params: { limit },
  });
  return response.data;
}
