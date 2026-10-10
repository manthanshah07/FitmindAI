import type { WorkoutDraft } from '../types/workout';

export const DRAFT_STORAGE_PREFIX = 'fitmind:workout-draft:';
export const QUARANTINE_STORAGE_PREFIX = 'fitmind:workout-draft-quarantine:';

export function getDraftStorageKey(userId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${userId}`;
}

export function getQuarantineStorageKey(userId: string, timestamp: number = Date.now()): string {
  return `${QUARANTINE_STORAGE_PREFIX}${userId}:${timestamp}`;
}

export interface LoadDraftResult {
  draft: WorkoutDraft | null;
  isCorrupt: boolean;
  corruptRaw?: string;
  quarantineKey?: string;
  isStale?: boolean;
}

export interface SaveDraftResult {
  success: boolean;
  isQuotaExceeded: boolean;
  error?: string;
}

/**
 * Checks whether a draft started more than 24 hours ago.
 */
export function isDraftStale(draft: WorkoutDraft): boolean {
  if (!draft.startedAt) return false;
  const startMs = new Date(draft.startedAt).getTime();
  if (isNaN(startMs)) return false;
  return Date.now() - startMs > 24 * 60 * 60 * 1000;
}

/**
 * Validates the minimal structure of a WorkoutDraft.
 */
function isValidDraftShape(obj: unknown, userId: string): obj is WorkoutDraft {
  if (!obj || typeof obj !== 'object') return false;
  const d = obj as Partial<WorkoutDraft>;
  return (
    d.schemaVersion === 1 &&
    d.userId === userId &&
    typeof d.sessionId === 'string' &&
    typeof d.idempotencyKey === 'string' &&
    typeof d.startedAt === 'string' &&
    Array.isArray(d.exercises)
  );
}

/**
 * Load draft for a specific user from localStorage with corruption quarantine and error isolation.
 */
export function loadDraft(userId: string): LoadDraftResult {
  if (!userId) {
    return { draft: null, isCorrupt: false };
  }

  const key = getDraftStorageKey(userId);
  let raw: string | null = null;

  try {
    raw = localStorage.getItem(key);
  } catch {
    // If localStorage read fails entirely (e.g. security policy)
    return { draft: null, isCorrupt: false };
  }

  if (raw === null || raw.trim() === '') {
    return { draft: null, isCorrupt: false };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isValidDraftShape(parsed, userId)) {
      throw new Error('Invalid draft schema or user mismatch');
    }
    return {
      draft: parsed,
      isCorrupt: false,
      isStale: isDraftStale(parsed),
    };
  } catch {
    // Corrupt JSON or schema mismatch: quarantine raw data per Appendix C
    const quarantineKey = getQuarantineStorageKey(userId);
    let verified = false;

    try {
      localStorage.setItem(quarantineKey, raw);
      const readBack = localStorage.getItem(quarantineKey);
      if (readBack === raw) {
        verified = true;
      }
    } catch {
      // Quarantine write failed (e.g. quota)
    }

    return {
      draft: null,
      isCorrupt: true,
      corruptRaw: raw,
      quarantineKey: verified ? quarantineKey : undefined,
    };
  }
}

/**
 * Saves a workout draft to localStorage with QuotaExceededError detection.
 */
export function saveDraft(draft: WorkoutDraft): SaveDraftResult {
  if (!draft || !draft.userId) {
    return { success: false, isQuotaExceeded: false, error: 'Invalid draft or userId missing' };
  }

  const key = getDraftStorageKey(draft.userId);

  try {
    const serialized = JSON.stringify(draft);
    localStorage.setItem(key, serialized);
    return { success: true, isQuotaExceeded: false };
  } catch (err: unknown) {
    const errorObj = err as { name?: string; code?: number; message?: string };
    const isQuota =
      errorObj?.name === 'QuotaExceededError' ||
      errorObj?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      errorObj?.code === 22 ||
      errorObj?.code === 1014;

    return {
      success: false,
      isQuotaExceeded: isQuota,
      error: errorObj?.message || 'Failed to save draft to storage',
    };
  }
}

/**
 * Discards a user's active draft from localStorage.
 */
export function discardDraft(userId: string): void {
  if (!userId) return;
  try {
    localStorage.removeItem(getDraftStorageKey(userId));
  } catch {
    // Ignore storage deletion errors
  }
}

/**
 * Discards the corrupt draft after quarantine confirmation.
 */
export function discardCorruptDraft(userId: string): void {
  discardDraft(userId);
}

/**
 * Helper to copy draft JSON to user's clipboard.
 */
export async function copyDraftToClipboard(draft: WorkoutDraft | string): Promise<boolean> {
  try {
    const text = typeof draft === 'string' ? draft : JSON.stringify(draft, null, 2);
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Helper to trigger a file download of the draft JSON.
 */
export function downloadDraftJson(draft: WorkoutDraft | string, filename?: string): void {
  try {
    const text = typeof draft === 'string' ? draft : JSON.stringify(draft, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `fitmind-workout-draft-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // Download fallback
  }
}
