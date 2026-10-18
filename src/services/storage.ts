import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ActivityCategory,
  AppStatus,
  PomodoroPhase,
  TimeLog,
  TimerMode,
} from '../domain/types.ts';

const STORAGE_KEY = '@kairos:app_state_v1';

export interface PersistedTimerState {
  readonly status: AppStatus;
  readonly startedAtTimestamp: number | null;
  readonly accumulatedSeconds: number;
  readonly elapsedSeconds: number;
}

export interface PersistedAppState {
  readonly balanceMinutes: number;
  readonly dailyWorkEarnedMinutes: number;
  readonly lastWorkDateKey: string | null;
  readonly lastResetMondayTimestamp: number | null;
  readonly activeMode: TimerMode;
  readonly activeCategory: ActivityCategory;
  readonly pomodoroPhase: PomodoroPhase;
  readonly timerState: PersistedTimerState;
  readonly logs: readonly TimeLog[];
}

export const DEFAULT_PERSISTED_STATE: PersistedAppState = {
  balanceMinutes: 0,
  dailyWorkEarnedMinutes: 0,
  lastWorkDateKey: null,
  lastResetMondayTimestamp: null,
  activeMode: 'FREE',
  activeCategory: 'STUDY',
  pomodoroPhase: 'FOCUS',
  timerState: {
    status: 'IDLE',
    startedAtTimestamp: null,
    accumulatedSeconds: 0,
    elapsedSeconds: 0,
  },
  logs: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidCategory(value: unknown): value is ActivityCategory {
  return (
    value === 'STUDY' ||
    value === 'MAINTENANCE' ||
    value === 'WORK' ||
    value === 'LEISURE'
  );
}

function isValidTimerMode(value: unknown): value is TimerMode {
  return value === 'FREE' || value === 'POMODORO';
}

function isValidPomodoroPhase(value: unknown): value is PomodoroPhase {
  return value === 'FOCUS' || value === 'BREAK';
}

function isValidAppStatus(value: unknown): value is AppStatus {
  return value === 'IDLE' || value === 'RUNNING' || value === 'PAUSED';
}

function parseTimerState(rawTimer: unknown): PersistedTimerState {
  if (!isRecord(rawTimer)) {
    return DEFAULT_PERSISTED_STATE.timerState;
  }
  const status = isValidAppStatus(rawTimer.status) ? rawTimer.status : 'IDLE';
  const startedAtTimestamp =
    typeof rawTimer.startedAtTimestamp === 'number' &&
    Number.isFinite(rawTimer.startedAtTimestamp)
      ? rawTimer.startedAtTimestamp
      : null;
  const accumulatedSeconds =
    typeof rawTimer.accumulatedSeconds === 'number' &&
    Number.isFinite(rawTimer.accumulatedSeconds)
      ? Math.max(0, Math.floor(rawTimer.accumulatedSeconds))
      : 0;
  const elapsedSeconds =
    typeof rawTimer.elapsedSeconds === 'number' &&
    Number.isFinite(rawTimer.elapsedSeconds)
      ? Math.max(0, Math.floor(rawTimer.elapsedSeconds))
      : accumulatedSeconds;

  return {
    status,
    startedAtTimestamp,
    accumulatedSeconds,
    elapsedSeconds,
  };
}

/**
 * Puramente valida e desserializa um JSON de estado persistido.
 */
export function deserializePersistedState(rawJson: string | null): PersistedAppState {
  if (!rawJson) {
    return DEFAULT_PERSISTED_STATE;
  }

  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!isRecord(parsed)) {
      return DEFAULT_PERSISTED_STATE;
    }

    const balanceMinutes =
      typeof parsed.balanceMinutes === 'number' && Number.isFinite(parsed.balanceMinutes)
        ? parsed.balanceMinutes
        : DEFAULT_PERSISTED_STATE.balanceMinutes;

    const dailyWorkEarnedMinutes =
      typeof parsed.dailyWorkEarnedMinutes === 'number' &&
      Number.isFinite(parsed.dailyWorkEarnedMinutes)
        ? parsed.dailyWorkEarnedMinutes
        : DEFAULT_PERSISTED_STATE.dailyWorkEarnedMinutes;

    const lastWorkDateKey =
      typeof parsed.lastWorkDateKey === 'string' ? parsed.lastWorkDateKey : null;

    const lastResetMondayTimestamp =
      typeof parsed.lastResetMondayTimestamp === 'number' &&
      Number.isFinite(parsed.lastResetMondayTimestamp)
        ? parsed.lastResetMondayTimestamp
        : null;

    const activeMode = isValidTimerMode(parsed.activeMode)
      ? parsed.activeMode
      : DEFAULT_PERSISTED_STATE.activeMode;

    const activeCategory = isValidCategory(parsed.activeCategory)
      ? parsed.activeCategory
      : DEFAULT_PERSISTED_STATE.activeCategory;

    const pomodoroPhase = isValidPomodoroPhase(parsed.pomodoroPhase)
      ? parsed.pomodoroPhase
      : DEFAULT_PERSISTED_STATE.pomodoroPhase;

    const timerState = parseTimerState(parsed.timerState);
    const logs = Array.isArray(parsed.logs) ? (parsed.logs as TimeLog[]) : [];

    return {
      balanceMinutes,
      dailyWorkEarnedMinutes,
      lastWorkDateKey,
      lastResetMondayTimestamp,
      activeMode,
      activeCategory,
      pomodoroPhase,
      timerState,
      logs,
    };
  } catch {
    return DEFAULT_PERSISTED_STATE;
  }
}

/**
 * Serviço de persistência local encapsulando o AsyncStorage com validação estrita de tipos.
 */
export const storageService = {
  async loadState(): Promise<PersistedAppState> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return deserializePersistedState(raw);
    } catch {
      return DEFAULT_PERSISTED_STATE;
    }
  },

  async saveState(state: PersistedAppState): Promise<void> {
    try {
      const serialized = JSON.stringify(state);
      await AsyncStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // Falha silenciosa segura para evitar crash da UI em caso de erro de I/O
    }
  },

  async clearState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignora erro ao limpar
    }
  },
};
