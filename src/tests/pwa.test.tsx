import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PwaUpdateBanner } from '../components/pwa/PwaUpdateBanner';
import { InstallPromptCard } from '../components/pwa/InstallPromptCard';
import { OfflineBanner } from '../components/pwa/OfflineBanner';
import { ColdStartBanner } from '../components/pwa/ColdStartBanner';

describe('Milestone M10 — PWA, Install Prompts, Offline & Cold Start Banners', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PwaUpdateBanner Component', () => {
    it('renders update banner and triggers update callback on button click', () => {
      const handleUpdate = vi.fn();
      render(<PwaUpdateBanner forceShow={true} onUpdate={handleUpdate} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/A new version of FitMind AI is available/i)).toBeInTheDocument();

      const updateBtn = screen.getByRole('button', { name: /^Update$/i });
      fireEvent.click(updateBtn);
      expect(handleUpdate).toHaveBeenCalledTimes(1);
    });

    it('dismisses update banner when close button is clicked', () => {
      render(<PwaUpdateBanner forceShow={true} />);
      expect(screen.getByText(/A new version of FitMind AI is available/i)).toBeInTheDocument();

      const closeBtn = screen.getByLabelText(/Dismiss update banner/i);
      fireEvent.click(closeBtn);
      expect(screen.queryByText(/A new version of FitMind AI is available/i)).not.toBeInTheDocument();
    });
  });

  describe('InstallPromptCard Component', () => {
    it('renders iOS Safari instructions ("Tap Share, then Add to Home Screen")', () => {
      render(<InstallPromptCard forcePlatform="ios" forceShow={true} />);

      expect(screen.getByText(/Install FitMind AI App/i)).toBeInTheDocument();
      expect(screen.getByText(/Add to Home Screen/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Share button/i)).toBeInTheDocument();
    });

    it('renders Android/Chromium install button and handles dismiss', () => {
      render(<InstallPromptCard forcePlatform="android" forceShow={true} />);

      expect(screen.getByText(/Install FitMind AI App/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Install App/i })).toBeInTheDocument();

      // Dismiss card
      const dismissBtn = screen.getByRole('button', { name: /Not now/i });
      fireEvent.click(dismissBtn);

      expect(screen.queryByText(/Install FitMind AI App/i)).not.toBeInTheDocument();
      expect(localStorage.getItem('fitmind:pwa-install-dismissed')).toBe('true');
    });

    it('does not render if previously dismissed in localStorage', () => {
      localStorage.setItem('fitmind:pwa-install-dismissed', 'true');
      render(<InstallPromptCard forcePlatform="ios" forceShow={false} />);

      expect(screen.queryByText(/Install FitMind AI App/i)).not.toBeInTheDocument();
    });
  });

  describe('OfflineBanner Component', () => {
    it('renders persistent offline banner when forceOffline is true', () => {
      render(<OfflineBanner forceOffline={true} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(
        screen.getByText(/You are offline\. Workout Mode continues to save locally\./i)
      ).toBeInTheDocument();
    });

    it('responds dynamically to window online and offline events', () => {
      render(<OfflineBanner forceOffline={false} />);

      // Initially online (or default)
      expect(
        screen.queryByText(/You are offline\. Workout Mode continues to save locally\./i)
      ).not.toBeInTheDocument();

      // Simulate network disconnection
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(
        screen.getByText(/You are offline\. Workout Mode continues to save locally\./i)
      ).toBeInTheDocument();

      // Simulate network reconnection
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(
        screen.queryByText(/You are offline\. Workout Mode continues to save locally\./i)
      ).not.toBeInTheDocument();
    });
  });

  describe('ColdStartBanner Component', () => {
    it('renders server waking message when forceShow is true', () => {
      render(<ColdStartBanner forceShow={true} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(
        screen.getByText(/Waking up the server, this can take up to a minute\./i)
      ).toBeInTheDocument();
    });

    it('triggers after specified timeout when /health check is delayed', async () => {
      vi.useFakeTimers();

      // Mock fetch with delayed response
      let resolveFetch: (val: Response) => void;
      const delayedFetch = new Promise<Response>((res) => {
        resolveFetch = res;
      });
      vi.spyOn(globalThis, 'fetch').mockReturnValue(delayedFetch as Promise<Response>);

      render(<ColdStartBanner forceShow={false} pingTimeoutMs={4000} />);

      // Before 4s: banner should NOT appear
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(
        screen.queryByText(/Waking up the server, this can take up to a minute\./i)
      ).not.toBeInTheDocument();

      // After 4s: banner appears
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(
        screen.getByText(/Waking up the server, this can take up to a minute\./i)
      ).toBeInTheDocument();

      // When fetch finally responds, banner is dismissed
      await act(async () => {
        resolveFetch(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
      });
      expect(
        screen.queryByText(/Waking up the server, this can take up to a minute\./i)
      ).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });
});
