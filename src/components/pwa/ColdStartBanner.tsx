import React, { useState, useEffect } from 'react';
import { Server, Loader2 } from 'lucide-react';
import { BASE_URL } from '../../lib/api/client';

export interface ColdStartBannerProps {
  forceShow?: boolean;
  pingTimeoutMs?: number;
  healthEndpoint?: string;
}

export const ColdStartBanner: React.FC<ColdStartBannerProps> = ({
  forceShow = false,
  pingTimeoutMs = 4000,
  healthEndpoint,
}) => {
  const [isWaking, setIsWaking] = useState<boolean>(forceShow);

  useEffect(() => {
    if (forceShow) {
      setIsWaking(true);
      return;
    }

    let isMounted = true;

    // Derive base URL for root /health check
    const rootUrl = healthEndpoint || BASE_URL.replace(/\/api\/v1\/?$/, '');
    const healthUrl = `${rootUrl}/health`;

    // 4.0 second timer threshold
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsWaking(true);
      }
    }, pingTimeoutMs);

    // Ping health endpoint
    const controller = new AbortController();
    fetch(healthUrl, { signal: controller.signal })
      .then(() => {
        clearTimeout(timeoutId);
        if (isMounted) {
          setIsWaking(false);
        }
      })
      .catch(() => {
        // Network error or aborted; dismiss waking banner
        clearTimeout(timeoutId);
        if (isMounted) {
          setIsWaking(false);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [forceShow, pingTimeoutMs, healthEndpoint]);

  if (!isWaking) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-blue-500/15 border-b border-blue-500/30 text-blue-200 px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium z-40 sticky top-0 backdrop-blur-md animate-fadeIn"
    >
      <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin shrink-0" aria-hidden="true" />
      <Server className="h-3.5 w-3.5 text-blue-400 shrink-0 hidden sm:inline" aria-hidden="true" />
      <span>
        Waking up the server, this can take up to a minute.
      </span>
    </div>
  );
};
