import { create } from 'zustand';
import {
  calculateEarnedMinutes,
  calculateSpendMinutes,
  evaluateDailyWorkReset,
  evaluateWeeklyReset,
  getLocalDateKey,
  roundMinutes,
} from '../domain/calculator.ts';
import {
  BUSINESS_RULES,
  type ActivityCategory,
  type AppStatus,
  type EntryDirection,
  type FocusCategory,
  type PomodoroPhase,
  type ScreenMode,
  type TimeLog,
  type TimerMode,
} from '../domain/types.ts';
import { audioService } from '../services/audio.ts';
import { storageService, type PersistedAppState } from '../services/storage.ts';

export interface TimerRuntimeState {
  readonly status: AppStatus;
  readonly startedAtTimestamp: number | null;
  readonly accumulatedSeconds: number;
  readonly elapsedSeconds: number;
}

export interface ManualEntryPayload {
  readonly direction: EntryDirection;
  readonly category: FocusCategory;
  readonly durationMinutes: number;
}

export interface ManualEntryResult {
  readonly success: boolean;
  readonly message: string;
  readonly appliedMinutes: number;
}

export interface AppStoreState {
  readonly isHydrated: boolean;
  readonly balanceMinutes: number;
  readonly dailyWorkEarnedMinutes: number;
  readonly lastWorkDateKey: string | null;
  readonly lastResetMondayTimestamp: number | null;
  readonly activeMode: TimerMode;
  readonly activeCategory: ActivityCategory;
  readonly pomodoroPhase: PomodoroPhase;
  readonly screenMode: ScreenMode;
  readonly isManualModalOpen: boolean;
  readonly statusMessage: string | null;
  readonly timerState: TimerRuntimeState;
  readonly logs: readonly TimeLog[];

  // Ações principais exigidas pela arquitetura
  readonly hydrate: () => Promise<void>;
  readonly checkWeeklyReset: (nowTimestamp?: number) => void;
  readonly startTimer: () => void;
  readonly pauseTimer: () => void;
  readonly stopAndSave: () => void;
  readonly tickTimer: () => void;
  readonly addManualEntry: (payload: ManualEntryPayload) => ManualEntryResult;

  // Ações de navegação e configuração de modo/categoria
  readonly setActiveMode: (mode: TimerMode) => void;
  readonly setActiveCategory: (category: ActivityCategory) => void;
  readonly setScreenMode: (screenMode: ScreenMode) => void;
  readonly setManualModalOpen: (isOpen: boolean) => void;
  readonly clearStatusMessage: () => void;
  readonly skipPomodoroPhase: () => void;
}

const INITIAL_TIMER_STATE: TimerRuntimeState = {
  status: 'IDLE',
  startedAtTimestamp: null,
  accumulatedSeconds: 0,
  elapsedSeconds: 0,
};

function extractPersistedSlice(state: AppStoreState): PersistedAppState {
  return {
    balanceMinutes: state.balanceMinutes,
    dailyWorkEarnedMinutes: state.dailyWorkEarnedMinutes,
    lastWorkDateKey: state.lastWorkDateKey,
    lastResetMondayTimestamp: state.lastResetMondayTimestamp,
    activeMode: state.activeMode,
    activeCategory: state.activeCategory,
    pomodoroPhase: state.pomodoroPhase,
    timerState: state.timerState,
    logs: state.logs,
  };
}

function createLogId(timestamp: number): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `log_${timestamp}_${randomSuffix}`;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  isHydrated: false,
  balanceMinutes: 0,
  dailyWorkEarnedMinutes: 0,
  lastWorkDateKey: null,
  lastResetMondayTimestamp: null,
  activeMode: 'FREE',
  activeCategory: 'STUDY',
  pomodoroPhase: 'FOCUS',
  screenMode: 'MAIN',
  isManualModalOpen: false,
  statusMessage: null,
  timerState: INITIAL_TIMER_STATE,
  logs: [],

  hydrate: async (): Promise<void> => {
    const loaded = await storageService.loadState();
    const now = Date.now();

    const weeklyCheck = evaluateWeeklyReset(
      loaded.balanceMinutes,
      loaded.lastResetMondayTimestamp,
      now
    );

    const dailyWorkCheck = evaluateDailyWorkReset(
      loaded.dailyWorkEarnedMinutes,
      loaded.lastWorkDateKey,
      now
    );

    let initialMessage: string | null = null;
    if (weeklyCheck.shouldReset) {
      initialMessage =
        loaded.balanceMinutes >= 0
          ? 'Novo ciclo semanal iniciado (Segunda 00:00): saldo positivo anterior resetado para 00h00.'
          : 'Novo ciclo semanal iniciado: saldo negativo transferido para quitação.';
    }

    // Recalcula elapsedSeconds caso o app tenha sido fechado com o cronômetro rodando
    let restoredTimer = loaded.timerState;
    if (
      restoredTimer.status === 'RUNNING' &&
      restoredTimer.startedAtTimestamp !== null
    ) {
      const deltaSec = Math.max(
        0,
        Math.floor((now - restoredTimer.startedAtTimestamp) / 1000)
      );
      restoredTimer = {
        ...restoredTimer,
        elapsedSeconds: restoredTimer.accumulatedSeconds + deltaSec,
      };
    }

    set({
      isHydrated: true,
      balanceMinutes: weeklyCheck.updatedBalanceMinutes,
      dailyWorkEarnedMinutes: dailyWorkCheck.dailyWorkEarnedMinutes,
      lastWorkDateKey: dailyWorkCheck.currentDateKey,
      lastResetMondayTimestamp: weeklyCheck.lastResetMondayTimestamp,
      activeMode: loaded.activeMode,
      activeCategory: loaded.activeCategory,
      pomodoroPhase: loaded.pomodoroPhase,
      timerState: restoredTimer,
      logs: loaded.logs,
      statusMessage: initialMessage,
    });

    await storageService.saveState(extractPersistedSlice(get()));
  },

  checkWeeklyReset: (nowTimestamp = Date.now()): void => {
    const state = get();
    const weeklyCheck = evaluateWeeklyReset(
      state.balanceMinutes,
      state.lastResetMondayTimestamp,
      nowTimestamp
    );
    const dailyWorkCheck = evaluateDailyWorkReset(
      state.dailyWorkEarnedMinutes,
      state.lastWorkDateKey,
      nowTimestamp
    );

    if (
      weeklyCheck.shouldReset ||
      weeklyCheck.lastResetMondayTimestamp !== state.lastResetMondayTimestamp ||
      dailyWorkCheck.didReset ||
      dailyWorkCheck.currentDateKey !== state.lastWorkDateKey
    ) {
      set({
        balanceMinutes: weeklyCheck.updatedBalanceMinutes,
        lastResetMondayTimestamp: weeklyCheck.lastResetMondayTimestamp,
        dailyWorkEarnedMinutes: dailyWorkCheck.dailyWorkEarnedMinutes,
        lastWorkDateKey: dailyWorkCheck.currentDateKey,
      });
      void storageService.saveState(extractPersistedSlice(get()));
    }
  },

  startTimer: (): void => {
    const now = Date.now();
    get().checkWeeklyReset(now);

    const state = get();
    if (state.timerState.status === 'RUNNING') {
      return;
    }

    // Validação do piso de -01h00 ao tentar iniciar consumo de lazer
    if (
      state.activeCategory === 'LEISURE' &&
      state.balanceMinutes <= BUSINESS_RULES.MIN_BALANCE_FLOOR_MINUTES
    ) {
      set({
        statusMessage:
          'Limite de -01h00 atingido! Acumule tempo de foco antes de consumir mais lazer.',
      });
      return;
    }

    set({
      statusMessage: null,
      timerState: {
        ...state.timerState,
        status: 'RUNNING',
        startedAtTimestamp: now,
      },
    });
    void storageService.saveState(extractPersistedSlice(get()));
  },

  pauseTimer: (): void => {
    const state = get();
    if (state.timerState.status !== 'RUNNING' || state.timerState.startedAtTimestamp === null) {
      return;
    }

    const now = Date.now();
    const deltaSeconds = Math.max(
      0,
      Math.floor((now - state.timerState.startedAtTimestamp) / 1000)
    );
    const totalElapsed = state.timerState.accumulatedSeconds + deltaSeconds;

    set({
      timerState: {
        status: 'PAUSED',
        startedAtTimestamp: null,
        accumulatedSeconds: totalElapsed,
        elapsedSeconds: totalElapsed,
      },
    });
    void storageService.saveState(extractPersistedSlice(get()));
  },

  stopAndSave: (): void => {
    const now = Date.now();
    get().checkWeeklyReset(now);
    const state = get();

    let totalSeconds = state.timerState.accumulatedSeconds;
    if (state.timerState.status === 'RUNNING' && state.timerState.startedAtTimestamp !== null) {
      totalSeconds += Math.max(
        0,
        Math.floor((now - state.timerState.startedAtTimestamp) / 1000)
      );
    }

    // Se no modo Pomodoro estiver em fase de descanso (BREAK), apenas encerra e volta para FOCUS sem alterar saldo
    if (state.activeMode === 'POMODORO' && state.pomodoroPhase === 'BREAK') {
      set({
        pomodoroPhase: 'FOCUS',
        timerState: INITIAL_TIMER_STATE,
        statusMessage: 'Descanso encerrado. Pronto para novo bloco de foco (25m).',
      });
      void storageService.saveState(extractPersistedSlice(get()));
      return;
    }

    const durationMinutes = totalSeconds / 60;
    if (durationMinutes <= 0) {
      set({ timerState: INITIAL_TIMER_STATE });
      return;
    }

    const dateKey = getLocalDateKey(now);

    if (state.activeCategory === 'LEISURE') {
      const spendRes = calculateSpendMinutes(durationMinutes, state.balanceMinutes);
      const newLog: TimeLog = {
        id: createLogId(now),
        timestamp: now,
        dateKey,
        direction: 'SPEND',
        category: 'LEISURE',
        durationMinutes: spendRes.allowedSpendMinutes,
        balanceDeltaMinutes: -spendRes.allowedSpendMinutes,
        source: 'FREE_TIMER',
      };

      set({
        balanceMinutes: spendRes.updatedBalanceMinutes,
        timerState: INITIAL_TIMER_STATE,
        logs: [newLog, ...state.logs].slice(0, 200),
        statusMessage: spendRes.hitFloorLimit
          ? 'Limite inferior de -01h00 atingido! Cronômetro de lazer bloqueado.'
          : `Lazer registrado: -${Math.round(spendRes.allowedSpendMinutes)}m consumidos.`,
      });
      void storageService.saveState(extractPersistedSlice(get()));
      return;
    }

    // Atividade de Foco (STUDY, MAINTENANCE, WORK)
    const focusCategory: FocusCategory = state.activeCategory;
    const earnedRes = calculateEarnedMinutes(
      focusCategory,
      durationMinutes,
      state.dailyWorkEarnedMinutes
    );

    const newBalance = roundMinutes(state.balanceMinutes + earnedRes.earnedMinutes);
    const newLog: TimeLog = {
      id: createLogId(now),
      timestamp: now,
      dateKey,
      direction: 'EARN',
      category: focusCategory,
      durationMinutes,
      balanceDeltaMinutes: earnedRes.earnedMinutes,
      source: state.activeMode === 'POMODORO' ? 'POMODORO' : 'FREE_TIMER',
    };

    const nextPomodoroPhase: PomodoroPhase =
      state.activeMode === 'POMODORO' && totalSeconds >= BUSINESS_RULES.POMODORO_FOCUS_MINUTES * 60
        ? 'BREAK'
        : 'FOCUS';

    let feedback = `Sessão salva: +${earnedRes.earnedMinutes}m de lazer gerados.`;
    if (earnedRes.cappedByWorkLimit) {
      feedback = `Sessão registrada! Teto diário de Trabalho (+2h00 de lazer) atingido hoje.`;
    }

    set({
      balanceMinutes: newBalance,
      dailyWorkEarnedMinutes: earnedRes.updatedDailyWorkMinutes,
      lastWorkDateKey: dateKey,
      pomodoroPhase: nextPomodoroPhase,
      timerState: INITIAL_TIMER_STATE,
      logs: [newLog, ...state.logs].slice(0, 200),
      statusMessage: feedback,
    });

    void storageService.saveState(extractPersistedSlice(get()));
  },

  tickTimer: (): void => {
    const state = get();
    if (state.timerState.status !== 'RUNNING' || state.timerState.startedAtTimestamp === null) {
      return;
    }

    const now = Date.now();
    const deltaSeconds = Math.max(
      0,
      Math.floor((now - state.timerState.startedAtTimestamp) / 1000)
    );
    const elapsedSeconds = state.timerState.accumulatedSeconds + deltaSeconds;

    // 1. Verificar piso de -01h00 (-60m) em tempo real durante Consumo de Lazer
    if (state.activeCategory === 'LEISURE') {
      const maxAvailableMinutes = Math.max(
        0,
        state.balanceMinutes - BUSINESS_RULES.MIN_BALANCE_FLOOR_MINUTES
      );
      const maxAvailableSeconds = Math.floor(maxAvailableMinutes * 60);

      if (elapsedSeconds >= maxAvailableSeconds) {
        void audioService.playPomodoroCompleteAlert();
        get().stopAndSave();
        return;
      }
    }

    // 2. Verificar conclusão automática de bloco no Modo Pomodoro (25m Foco / 5m Descanso)
    if (state.activeMode === 'POMODORO') {
      const targetSeconds =
        state.pomodoroPhase === 'FOCUS'
          ? BUSINESS_RULES.POMODORO_FOCUS_MINUTES * 60
          : BUSINESS_RULES.POMODORO_BREAK_MINUTES * 60;

      if (elapsedSeconds >= targetSeconds) {
        void audioService.playPomodoroCompleteAlert();

        if (state.pomodoroPhase === 'FOCUS') {
          // Credita exatamente os 25 minutos do bloco de foco e transita para descanso (5m)
          const focusCat: FocusCategory =
            state.activeCategory === 'LEISURE' ? 'STUDY' : state.activeCategory;
          const earnedRes = calculateEarnedMinutes(
            focusCat,
            BUSINESS_RULES.POMODORO_FOCUS_MINUTES,
            state.dailyWorkEarnedMinutes
          );
          const dateKey = getLocalDateKey(now);
          const newLog: TimeLog = {
            id: createLogId(now),
            timestamp: now,
            dateKey,
            direction: 'EARN',
            category: focusCat,
            durationMinutes: BUSINESS_RULES.POMODORO_FOCUS_MINUTES,
            balanceDeltaMinutes: earnedRes.earnedMinutes,
            source: 'POMODORO',
          };

          set({
            balanceMinutes: roundMinutes(state.balanceMinutes + earnedRes.earnedMinutes),
            dailyWorkEarnedMinutes: earnedRes.updatedDailyWorkMinutes,
            lastWorkDateKey: dateKey,
            pomodoroPhase: 'BREAK',
            timerState: INITIAL_TIMER_STATE,
            logs: [newLog, ...state.logs].slice(0, 200),
            statusMessage: `Pomodoro concluído! +${earnedRes.earnedMinutes}m de lazer. Inicie o descanso de 5m.`,
          });
          void storageService.saveState(extractPersistedSlice(get()));
          return;
        } else {
          // Fim do bloco de 5m de descanso -> não debita nem credita lazer
          set({
            pomodoroPhase: 'FOCUS',
            timerState: INITIAL_TIMER_STATE,
            statusMessage: 'Descanso de 5m concluído! Pronto para novo ciclo de foco (25m).',
          });
          void storageService.saveState(extractPersistedSlice(get()));
          return;
        }
      }
    }

    set({
      timerState: {
        ...state.timerState,
        elapsedSeconds,
      },
    });
  },

  addManualEntry: (payload: ManualEntryPayload): ManualEntryResult => {
    const now = Date.now();
    get().checkWeeklyReset(now);
    const state = get();

    const duration = roundMinutes(payload.durationMinutes);
    if (duration <= 0) {
      return {
        success: false,
        message: 'Informe uma duração válida maior que zero.',
        appliedMinutes: 0,
      };
    }

    const dateKey = getLocalDateKey(now);

    if (payload.direction === 'SPEND') {
      if (state.balanceMinutes <= BUSINESS_RULES.MIN_BALANCE_FLOOR_MINUTES) {
        return {
          success: false,
          message: 'Saldo no limite de -01h00! Bloqueado novo débito de lazer.',
          appliedMinutes: 0,
        };
      }

      const spendRes = calculateSpendMinutes(duration, state.balanceMinutes);
      const newLog: TimeLog = {
        id: createLogId(now),
        timestamp: now,
        dateKey,
        direction: 'SPEND',
        category: 'LEISURE',
        durationMinutes: spendRes.allowedSpendMinutes,
        balanceDeltaMinutes: -spendRes.allowedSpendMinutes,
        source: 'MANUAL',
      };

      const msg = spendRes.hitFloorLimit
        ? `Debitados -${spendRes.allowedSpendMinutes}m (travado no limite de -01h00).`
        : `Lançamento manual: -${spendRes.allowedSpendMinutes}m de lazer debitados.`;

      set({
        balanceMinutes: spendRes.updatedBalanceMinutes,
        logs: [newLog, ...state.logs].slice(0, 200),
        statusMessage: msg,
      });
      void storageService.saveState(extractPersistedSlice(get()));

      return {
        success: true,
        message: msg,
        appliedMinutes: -spendRes.allowedSpendMinutes,
      };
    }

    // Direção EARN (Ganhar Lazer via Foco)
    const earnedRes = calculateEarnedMinutes(
      payload.category,
      duration,
      state.dailyWorkEarnedMinutes
    );

    const newBalance = roundMinutes(state.balanceMinutes + earnedRes.earnedMinutes);
    const newLog: TimeLog = {
      id: createLogId(now),
      timestamp: now,
      dateKey,
      direction: 'EARN',
      category: payload.category,
      durationMinutes: duration,
      balanceDeltaMinutes: earnedRes.earnedMinutes,
      source: 'MANUAL',
    };

    const msg = earnedRes.cappedByWorkLimit
      ? `Lançado! +${earnedRes.earnedMinutes}m creditados (Teto diário de Trabalho 2h00 atingido).`
      : `Lançamento manual: +${earnedRes.earnedMinutes}m de lazer adicionados.`;

    set({
      balanceMinutes: newBalance,
      dailyWorkEarnedMinutes: earnedRes.updatedDailyWorkMinutes,
      lastWorkDateKey: dateKey,
      logs: [newLog, ...state.logs].slice(0, 200),
      statusMessage: msg,
    });
    void storageService.saveState(extractPersistedSlice(get()));

    return {
      success: true,
      message: msg,
      appliedMinutes: earnedRes.earnedMinutes,
    };
  },

  setActiveMode: (mode: TimerMode): void => {
    const state = get();
    if (state.timerState.status !== 'IDLE') {
      return; // Evita trocar de modo com cronômetro em andamento
    }

    // Se ativar Pomodoro enquanto estava em "Gastar Lazer", muda categoria para Estudo
    const adjustedCategory: ActivityCategory =
      mode === 'POMODORO' && state.activeCategory === 'LEISURE'
        ? 'STUDY'
        : state.activeCategory;

    set({
      activeMode: mode,
      activeCategory: adjustedCategory,
      pomodoroPhase: 'FOCUS',
      statusMessage: null,
    });
    void storageService.saveState(extractPersistedSlice(get()));
  },

  setActiveCategory: (category: ActivityCategory): void => {
    const state = get();
    if (state.timerState.status !== 'IDLE') {
      return; // Evita trocar de categoria com cronômetro em andamento
    }

    // Consumo de Lazer opera sempre em Cronômetro Livre (1:1)
    const adjustedMode: TimerMode = category === 'LEISURE' ? 'FREE' : state.activeMode;

    set({
      activeCategory: category,
      activeMode: adjustedMode,
      pomodoroPhase: 'FOCUS',
      statusMessage: null,
    });
    void storageService.saveState(extractPersistedSlice(get()));
  },

  setScreenMode: (screenMode: ScreenMode): void => {
    set({ screenMode });
  },

  setManualModalOpen: (isOpen: boolean): void => {
    set({ isManualModalOpen: isOpen });
  },

  clearStatusMessage: (): void => {
    set({ statusMessage: null });
  },

  skipPomodoroPhase: (): void => {
    const state = get();
    if (state.activeMode !== 'POMODORO') {
      return;
    }
    const nextPhase: PomodoroPhase = state.pomodoroPhase === 'FOCUS' ? 'BREAK' : 'FOCUS';
    set({
      pomodoroPhase: nextPhase,
      timerState: INITIAL_TIMER_STATE,
      statusMessage:
        nextPhase === 'BREAK'
          ? 'Modo Descanso (5m) selecionado.'
          : 'Modo Foco (25m) selecionado.',
    });
    void storageService.saveState(extractPersistedSlice(get()));
  },
}));
