import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { CoachPage } from '../pages/coach/CoachPage';
import { AppShell } from '../components/layout/AppShell';
import * as coachApi from '../lib/api/coach';
import type { CoachChatResponse } from '../types/coach';

vi.mock('../lib/api/coach', () => ({
  sendCoachMessageApi: vi.fn(),
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

describe('Phase 7 — FitMind AI Coach UI Component', () => {
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

  it('renders the Coach Page empty state with introduction and suggested prompts', () => {
    render(
      <MemoryRouter initialEntries={['/coach']}>
        <AppShell>
          <CoachPage />
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/FitMind AI Coach/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Welcome to your AI Coach/i)).toBeInTheDocument();
    expect(screen.getByText(/What should I focus on this week\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Am I eating enough protein\?/i)).toBeInTheDocument();
  });

  it('disables send button when input is empty or whitespace only', () => {
    render(
      <MemoryRouter initialEntries={['/coach']}>
        <AppShell>
          <CoachPage />
        </AppShell>
      </MemoryRouter>,
    );

    const sendBtn = screen.getByRole('button', { name: /SEND QUESTION/i });
    expect(sendBtn).toBeDisabled();

    const input = screen.getByPlaceholderText(/Ask FitMind AI Coach/i);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(sendBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Valid question' } });
    expect(sendBtn).not.toBeDisabled();
  });

  it('sends user question and renders structured AI coach response', async () => {
    vi.mocked(coachApi.sendCoachMessageApi).mockResolvedValueOnce(mockStructuredResponse);

    render(
      <MemoryRouter initialEntries={['/coach']}>
        <AppShell>
          <CoachPage />
        </AppShell>
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Ask FitMind AI Coach/i);
    fireEvent.change(input, { target: { value: 'What should I eat?' } });

    const sendBtn = screen.getByRole('button', { name: /SEND QUESTION/i });
    fireEvent.click(sendBtn);

    // Verify user message appears in list
    expect(screen.getByText('What should I eat?')).toBeInTheDocument();

    // Verify API call was made
    expect(coachApi.sendCoachMessageApi).toHaveBeenCalledWith({
      message: 'What should I eat?',
    });

    // Verify structured response sections render
    await waitFor(() => {
      expect(screen.getByText(/COACH DIRECT ANSWER/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/focus on increasing protein intake/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/FACTS & OBSERVATIONS/i)).toBeInTheDocument();
    expect(screen.getByText(/Average protein intake is 110g/i)).toBeInTheDocument();
    expect(screen.getByText(/ACTIONABLE RECOMMENDATIONS/i)).toBeInTheDocument();
    expect(screen.getByText(/Increase Daily Protein/i)).toBeInTheDocument();
    expect(screen.getByText(/DATA LIMITATIONS & SAFETY WARNINGS/i)).toBeInTheDocument();
    expect(screen.getByText(/2 unlogged nutrition days/i)).toBeInTheDocument();
    expect(screen.getByText(/DATA QUALITY: MODERATE/i)).toBeInTheDocument();
  });

  it('triggers send when clicking a suggested prompt button', async () => {
    vi.mocked(coachApi.sendCoachMessageApi).mockResolvedValueOnce(mockStructuredResponse);

    render(
      <MemoryRouter initialEntries={['/coach']}>
        <AppShell>
          <CoachPage />
        </AppShell>
      </MemoryRouter>,
    );

    const suggestedBtn = screen.getByText(/Am I eating enough protein\?/i);
    fireEvent.click(suggestedBtn);

    expect(screen.getByText('Am I eating enough protein?')).toBeInTheDocument();
    expect(coachApi.sendCoachMessageApi).toHaveBeenCalledWith({
      message: 'Am I eating enough protein?',
    });
  });

  it('handles API errors gracefully and displays error alert banner', async () => {
    vi.mocked(coachApi.sendCoachMessageApi).mockRejectedValueOnce(
      new Error('AI service returned an invalid or empty response.')
    );

    render(
      <MemoryRouter initialEntries={['/coach']}>
        <AppShell>
          <CoachPage />
        </AppShell>
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Ask FitMind AI Coach/i);
    fireEvent.change(input, { target: { value: 'Trigger error test' } });

    const sendBtn = screen.getByRole('button', { name: /SEND QUESTION/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/COACH ERROR/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/invalid or empty response/i).length).toBeGreaterThan(0);
  });
});
