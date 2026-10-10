import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

const STORAGE_KEY = 'fitmind:pwa-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface InstallPromptCardProps {
  forcePlatform?: 'ios' | 'android';
  forceShow?: boolean;
}

export const InstallPromptCard: React.FC<InstallPromptCardProps> = ({
  forcePlatform,
  forceShow = false,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(forcePlatform || null);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (forceShow) return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (forcePlatform) {
      setPlatform(forcePlatform);
      return;
    }

    if (typeof window === 'undefined') return;

    // Check if app is already running in standalone PWA mode
    const isStandalone =
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      Boolean((navigator as unknown as { standalone?: boolean }).standalone);

    if (isStandalone && !forceShow) {
      return;
    }

    const ua = navigator.userAgent || '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;

    if (isIOSDevice) {
      setPlatform('ios');
      return;
    }

    // Android / Chromium beforeinstallprompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform('android');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [forcePlatform, forceShow]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Storage unavailable or quota exceeded
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        handleDismiss();
      }
    } catch {
      // Prompt dismissed or failed
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (isDismissed || !platform) return null;

  return (
    <Card
      role="region"
      aria-label="Install FitMind AI App"
      className="relative mb-4 bg-surface border border-accent/25 shadow-card p-4 overflow-hidden"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 text-text-3 hover:text-text rounded-md transition-colors"
        aria-label="Dismiss install card"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3.5 pr-6">
        <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 border border-accent/30 text-accent">
          <Download className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text tracking-tight">
            Install FitMind AI App
          </h4>
          <p className="text-xs text-text-2 mt-0.5 leading-relaxed">
            {platform === 'ios' ? (
              <span>
                Install to your home screen for full-screen Workout Mode and fast offline tracking.
              </span>
            ) : (
              <span>
                Install FitMind on your device for instant launch and offline workout persistence.
              </span>
            )}
          </p>

          {platform === 'ios' && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-text bg-surface-2/80 px-3 py-2 rounded-lg border border-border">
              <span>Tap</span>
              <Share2 className="h-4 w-4 text-accent inline shrink-0" aria-label="Share button" />
              <span>Share, then</span>
              <PlusSquare className="h-4 w-4 text-accent inline shrink-0" aria-label="Add to Home Screen button" />
              <strong className="text-accent">Add to Home Screen</strong>
            </div>
          )}

          {platform === 'android' && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleInstallClick}
                className="h-9 px-4 text-xs font-medium"
              >
                Install App
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-9 px-3 text-xs text-text-3"
              >
                Not now
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
