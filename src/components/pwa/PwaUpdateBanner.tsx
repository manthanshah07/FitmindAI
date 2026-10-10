import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '../ui/Button';

export interface PwaUpdateBannerProps {
  // Allow manual override for unit testing
  forceShow?: boolean;
  onUpdate?: () => void;
}

export const PwaUpdateBanner: React.FC<PwaUpdateBannerProps> = ({
  forceShow = false,
  onUpdate,
}) => {
  const [needRefresh, setNeedRefresh] = useState(forceShow);
  const [updateFn, setUpdateFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (forceShow) {
      setNeedRefresh(true);
      return;
    }

    // Check if Service Worker is supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Dynamic import of virtual:pwa-register to safeguard SSR / test runners
      import('virtual:pwa-register')
        .then(({ registerSW }) => {
          const updateSW = registerSW({
            onNeedRefresh() {
              setNeedRefresh(true);
            },
            onOfflineReady() {
              // App is ready to work offline
            },
          });
          setUpdateFn(() => updateSW);
        })
        .catch(() => {
          // Virtual module unavailable in non-Vite environments
        });
    }
  }, [forceShow]);

  const handleRefresh = () => {
    if (onUpdate) {
      onUpdate();
    } else if (updateFn) {
      updateFn();
    } else {
      window.location.reload();
    }
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className="bg-accent/15 border-b border-accent/30 text-text px-4 py-2.5 flex items-center justify-between gap-3 text-sm z-50 sticky top-0 backdrop-blur-md animate-fadeIn"
    >
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-accent shrink-0 animate-spin-slow" aria-hidden="true" />
        <span className="font-medium">
          A new version of FitMind AI is available.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleRefresh}
          className="h-8 px-3 text-xs"
        >
          Update
        </Button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="p-1 text-text-3 hover:text-text rounded transition-colors"
          aria-label="Dismiss update banner"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
