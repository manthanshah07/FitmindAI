import { create } from 'zustand';

export type UnitSystem = 'metric' | 'imperial';

export interface PreferencesState {
  units: UnitSystem;
  screenWakeLock: boolean;
  restTimerSound: boolean;
  setUnits: (units: UnitSystem) => void;
  setScreenWakeLock: (enabled: boolean) => void;
  setRestTimerSound: (enabled: boolean) => void;
}

const STORAGE_KEY = 'fitmind_preferences';

function loadStoredPreferences(): {
  units: UnitSystem;
  screenWakeLock: boolean;
  restTimerSound: boolean;
} {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          units: parsed.units === 'imperial' ? 'imperial' : 'metric',
          screenWakeLock: typeof parsed.screenWakeLock === 'boolean' ? parsed.screenWakeLock : false,
          restTimerSound: typeof parsed.restTimerSound === 'boolean' ? parsed.restTimerSound : true,
        };
      }
    }
  } catch {
    // Fall back to default preferences
  }
  return {
    units: 'metric',
    screenWakeLock: false,
    restTimerSound: true,
  };
}

function saveStoredPreferences(state: {
  units: UnitSystem;
  screenWakeLock: boolean;
  restTimerSound: boolean;
}) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota / access errors
  }
}

const initial = loadStoredPreferences();

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  units: initial.units,
  screenWakeLock: initial.screenWakeLock,
  restTimerSound: initial.restTimerSound,

  setUnits: (units: UnitSystem) => {
    set({ units });
    saveStoredPreferences({
      units,
      screenWakeLock: get().screenWakeLock,
      restTimerSound: get().restTimerSound,
    });
  },

  setScreenWakeLock: (enabled: boolean) => {
    set({ screenWakeLock: enabled });
    saveStoredPreferences({
      units: get().units,
      screenWakeLock: enabled,
      restTimerSound: get().restTimerSound,
    });
  },

  setRestTimerSound: (enabled: boolean) => {
    set({ restTimerSound: enabled });
    saveStoredPreferences({
      units: get().units,
      screenWakeLock: get().screenWakeLock,
      restTimerSound: enabled,
    });
  },
}));
