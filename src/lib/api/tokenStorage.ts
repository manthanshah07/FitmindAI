/**
 * Token Storage Utility
 *
 * SECURITY NOTICE:
 * FitMind AI enforces secure HttpOnly cookies for refresh token storage.
 * Refresh tokens are NEVER persisted to localStorage or sessionStorage.
 * This adapter exists strictly to purge any legacy tokens during user migration.
 */

const LEGACY_REFRESH_TOKEN_KEY = 'fitmind_refresh_token';

export const tokenStorage = {
  /**
   * Purges any legacy refresh tokens from previous versions from browser storage.
   */
  clearRefreshToken(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
      }
    } catch {
      // Handle sandboxed/disabled storage gracefully
    }
  },

  /**
   * Legacy check (always returns null as refresh tokens are strictly HttpOnly cookies).
   */
  getRefreshToken(): string | null {
    return null;
  },

  /**
   * @deprecated Refresh tokens must never be written to localStorage.
   */
  setRefreshToken(_token: string): void {
    // Intentionally no-op to prevent persisting tokens
  },
};
