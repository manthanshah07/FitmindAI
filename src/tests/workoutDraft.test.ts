import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadDraft,
  saveDraft,
  discardDraft,
  isDraftStale,
  copyDraftToClipboard,
  downloadDraftJson,
  getDraftStorageKey,
  getQuarantineStorageKey,
} from '../lib/workoutDraft';
import type { WorkoutDraft } from '../types/workout';

const createSampleDraft = (userId: string = 'user-1', overrides?: Partial<WorkoutDraft>): WorkoutDraft => ({
  schemaVersion: 1,
  userId,
  sessionId: 'session-uuid-1',
  idempotencyKey: 'idemp-uuid-1',
  startedAt: new Date().toISOString(),
  endedAt: null,
  status: 'in_progress',
  templateRef: { planId: 'plan-1', dayIndex: 1 },
  notes: null,
  restEndsAt: null,
  exercises: [
    {
      exerciseId: 'ex-1',
      name: 'Barbell Bench Press',
      targetSets: 3,
      targetReps: '8-12',
      restSeconds: 90,
      sets: [
        {
          setNumber: 1,
          weightKg: '80.00',
          reps: 10,
          done: true,
          completedAt: new Date().toISOString(),
        },
        {
          setNumber: 2,
          weightKg: '80.00',
          reps: 8,
          done: false,
          completedAt: null,
        },
      ],
    },
  ],
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Milestone M3 — Workout Draft Storage Engine (Appendix C)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('correctly formats storage and quarantine keys scoped by userId', () => {
    expect(getDraftStorageKey('user-abc')).toBe('fitmind:workout-draft:user-abc');
    expect(getQuarantineStorageKey('user-abc', 123456789)).toBe(
      'fitmind:workout-draft-quarantine:user-abc:123456789',
    );
  });

  it('saves and loads a valid draft round-trip', () => {
    const draft = createSampleDraft('user-1');
    const saveRes = saveDraft(draft);
    expect(saveRes.success).toBe(true);
    expect(saveRes.isQuotaExceeded).toBe(false);

    const loadRes = loadDraft('user-1');
    expect(loadRes.isCorrupt).toBe(false);
    expect(loadRes.draft).not.toBeNull();
    expect(loadRes.draft?.sessionId).toBe(draft.sessionId);
    expect(loadRes.draft?.idempotencyKey).toBe(draft.idempotencyKey);
    expect(loadRes.draft?.exercises.length).toBe(1);
    expect(loadRes.draft?.exercises[0].sets[0].weightKg).toBe('80.00');
  });

  it('preserves notes verbatim across null, empty string, whitespace-only, and text', () => {
    const noteVariants = [null, '', '   ', 'Great session! Felt strong.'];

    noteVariants.forEach((noteVal) => {
      localStorage.clear();
      const draft = createSampleDraft('user-1', { notes: noteVal });
      saveDraft(draft);

      const loadRes = loadDraft('user-1');
      expect(loadRes.draft?.notes).toBe(noteVal);
    });
  });

  it('enforces strict user isolation on the same browser', () => {
    const draftUserA = createSampleDraft('user-A', { sessionId: 'session-A' });
    saveDraft(draftUserA);

    // User B attempts to load
    const loadUserB = loadDraft('user-B');
    expect(loadUserB.draft).toBeNull();
    expect(loadUserB.isCorrupt).toBe(false);

    // User A loads successfully
    const loadUserA = loadDraft('user-A');
    expect(loadUserA.draft?.sessionId).toBe('session-A');
  });

  it('quarantines corrupt JSON, verifies quarantine copy, and flags corruption', () => {
    const corruptJson = '{ "schemaVersion": 1, "userId": "user-1", UNTERMINATED_CORRUPT_STRING';
    const draftKey = getDraftStorageKey('user-1');
    localStorage.setItem(draftKey, corruptJson);

    const loadRes = loadDraft('user-1');
    expect(loadRes.draft).toBeNull();
    expect(loadRes.isCorrupt).toBe(true);
    expect(loadRes.corruptRaw).toBe(corruptJson);
    expect(loadRes.quarantineKey).toBeDefined();

    // Verify raw data was preserved in quarantine key in localStorage
    expect(localStorage.getItem(loadRes.quarantineKey!)).toBe(corruptJson);
  });

  it('detects QuotaExceededError and leaves existing draft intact', () => {
    const draft = createSampleDraft('user-1');
    saveDraft(draft);

    // Mock localStorage.setItem to simulate QuotaExceededError on next write
    const quotaError = new Error('Storage limit exceeded');
    quotaError.name = 'QuotaExceededError';
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw quotaError;
    });

    const mutateDraft = { ...draft, updatedAt: '2026-10-10T12:00:00Z' };
    const saveRes = saveDraft(mutateDraft);

    expect(saveRes.success).toBe(false);
    expect(saveRes.isQuotaExceeded).toBe(true);

    // Previous valid draft remains in storage
    const loadRes = loadDraft('user-1');
    expect(loadRes.draft).not.toBeNull();
    expect(loadRes.draft?.sessionId).toBe(draft.sessionId);
  });

  it('accurately identifies stale drafts older than 24 hours', () => {
    const freshDraft = createSampleDraft('user-1', {
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    });
    expect(isDraftStale(freshDraft)).toBe(false);

    const staleDraft = createSampleDraft('user-1', {
      startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25h ago
    });
    expect(isDraftStale(staleDraft)).toBe(true);
  });

  it('discardDraft cleanly removes the draft without affecting other users', () => {
    saveDraft(createSampleDraft('user-1'));
    saveDraft(createSampleDraft('user-2'));

    discardDraft('user-1');

    expect(loadDraft('user-1').draft).toBeNull();
    expect(loadDraft('user-2').draft).not.toBeNull();
  });

  it('copies draft JSON to clipboard where supported', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    const draft = createSampleDraft('user-1');
    const copied = await copyDraftToClipboard(draft);
    expect(copied).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('session-uuid-1'));
  });

  it('triggers JSON file download for draft recovery', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    const draft = createSampleDraft('user-1');
    downloadDraftJson(draft, 'test-draft.json');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });
});
