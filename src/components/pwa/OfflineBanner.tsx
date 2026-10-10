import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export interface OfflineBannerProps {
  forceOffline?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  forceOffline = false,
}) => {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (forceOffline) return true;
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return !navigator.onLine;
    }
    return false;
  });

  useEffect(() => {
    if (forceOffline) {
      setIsOffline(true);
      return;
    }

    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [forceOffline]);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2 flex items-center justify-center gap-2.5 text-xs font-medium z-40 sticky top-0 backdrop-blur-md animate-fadeIn"
    >
      <WifiOff className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
      <span>
        You are offline. Workout Mode continues to save locally.
      </span>
    </div>
  );
};
