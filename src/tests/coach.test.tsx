import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { CoachPage } from '../pages/coach/CoachPage';
import { AppShell } from '../components/layout/AppShell';
import * as coachApi from '../lib/api/coach';
import type { CoachChatResponse, ChatMessageResponse } from '../types/coach';

vi.mock('../lib/api/coach', () => ({
  sendCoachMessageApi: vi.fn(),
  getCoachHistoryApi: vi.fn(),
}));

const mockStructuredResponse: CoachChatResponse = {
  answer: 'Based on your recent nutrition logs, you should focus on increasing protein intake.',
  observations: [
    {
      category: 'nutrition',
      text: 'Average protein intake is 110g against target of 140g.',
      severity: 'caution',
    },
    {
      category: 'workout',
      text: 'Logged 4 workout sessions in the past 30 days.',
      severity: 'info',
    },
  ],
  recommendations: [
    {
      category: 'nutrition',
      title: 'Increase Daily Protein',
      action: 'Add a protein shake or chicken breast to consistently hit your 140g target.',
      priority: 'high',
    },
  ],
  warnings: ['You have 2 unlogged nutrition days in the past 7 days.'],
  data_quality: 'moderate',
};

const mockHistoryResponse: ChatMessageResponse[] = [
  {
    id: 'msg-1',
    user_id: 'u-123',
    role: 'user',
    content: 'What should I eat?',
    created_at: new Date().toISOString(),
  },
  {
    id: 'msg-2',
    user_id: 'u-123',
    role: 'assistant',
    response: mockStructuredResponse,
    created_at: new Date().toISOString(),
  },
];

describe('Phase 7 — FitMind AI Coach UI Component & Persistent History', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'u-123',
        email: 'athlete@example.com',
        full_name: 'Athlete User',
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString(),
      },
      accessToken: 'mock_token',
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('renders the Coach Page empty state when no history exists', async () => {
    vi.mocked(coachApi.getCoachHistoryApi).mockResolvedValueOnce([]);

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/coach']}>
          <AppShell>
            <CoachPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Welcome to your AI Coach/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/FitMind AI Coach/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/What should I focus on this week\?/i)).toBeInTheDocument();
  });

  it('loads and renders persistent chat history on mount', async () => {
    vi.mocked(coachApi.getCoachHistoryApi).mockResolvedValueOnce(mockHistoryResponse);

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/coach']}>
          <AppShell>
            <CoachPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText('What should I eat?')).toBeInTheDocument();
    });

    expect(screen.getByText(/focus on increasing protein intake/i)).toBeInTheDocument();
    expect(screen.getByText(/Average protein intake is 110g/i)).toBeInTheDocument();
    expect(screen.getByText(/Increase Daily Protein/i)).toBeInTheDocument();
  });

  it('disables send button when input is empty or whitespace only', async () => {
    vi.mocked(coachApi.getCoachHistoryApi).mockResolvedValueOnce([]);

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/coach']}>
          <AppShell>
            <CoachPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    const sendBtn = screen.getByRole('button', { name: /SEND QUESTION/i });
    expect(sendBtn).toBeDisabled();

    const input = screen.getByPlaceholderText(/Ask FitMind AI Coach/i);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(sendBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Valid question' } });
    expect(sendBtn).not.toBeDisabled();
  });

  it('sends user question and renders structured AI coach response', async () => {
    vi.mocked(coachApi.getCoachHistoryApi).mockResolvedValueOnce([]);
    vi.mocked(coachApi.sendCoachMessageApi).mockResolvedValueOnce(mockStructuredResponse);

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/coach']}>
          <AppShell>
            <CoachPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    const input = screen.getByPlaceholderText(/Ask FitMind AI Coach/i);
    fireEvent.change(input, { target: { value: 'What should I eat?' } });

    const sendBtn = screen.getByRole('button', { name: /SEND QUESTION/i });

    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(screen.getByText('What should I eat?')).toBeInTheDocument();
    expect(coachApi.sendCoachMessageApi).toHaveBeenCalledWith({
      message: 'What should I eat?',
    });

    await waitFor(() => {
      expect(screen.getByText(/COACH DIRECT ANSWER/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/focus on increasing protein intake/i)).toBeInTheDocument();
    expect(screen.getByText(/FACTS & OBSERVATIONS/i)).toBeInTheDocument();
  });

  it('triggers send when clicking a suggested prompt button', async () => {
    vi.mocked(coachApi.getCoachHistoryApi).mockResolvedValueOnce([]);
    vi.mocked(coachApi.sendCoachMessageApi).mockResolvedValueOnce(mockStructuredResponse);

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/coach']}>
          <AppShell>
            <CoachPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Am I eating enough protein\?/i)).toBeInTheDocument();
    });

    const suggestedBtn = screen.getByText(/Am I eating enough protein\?/i);

    await act(async () => {
      fireEvent.click(suggestedBtn);
    });

    expect(screen.getByText('Am I eating enough protein?')).toBeInTheDocument();
    expect(coachApi.sendCoachMessageApi).toHaveBeenCalledWith({
      message: 'Am I eating enough protein?',
    });
  });

  it('handles API errors gracefully and displays error alert banner', async () => {
    vi.mocked(coachApi.getCoachHistoryApi).mockResolvedValueOnce([]);
    vi.mocked(coachApi.sendCoachMessageApi).mockRejectedValueOnce(
      new Error('AI service returned an invalid or empty response.')
    );

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/coach']}>
          <AppShell>
            <CoachPage />
          </AppShell>
        </MemoryRouter>,
      );
    });

    const input = screen.getByPlaceholderText(/Ask FitMind AI Coach/i);
    fireEvent.change(input, { target: { value: 'Trigger error test' } });

    const sendBtn = screen.getByRole('button', { name: /SEND QUESTION/i });

    await act(async () => {
      fireEvent.click(sendBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/COACH ERROR/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/invalid or empty response/i).length).toBeGreaterThan(0);
  });
});
