/**
 * Categorias produtivas que geram crédito de lazer.
 * - STUDY: Estudo / Foco Geral (+50%, 2:1)
 * - MAINTENANCE: Manutenção / Leitura leve / Operacional (+25%, 4:1)
 * - WORK: Trabalho (+50%, 2:1, limitado a +120 min de lazer ganhos por dia)
 */
export type FocusCategory = 'STUDY' | 'MAINTENANCE' | 'WORK';

/**
 * Categorias ativas selecionáveis na barra inferior (Foco ou Consumo de Lazer).
 */
export type ActivityCategory = FocusCategory | 'LEISURE';

/**
 * Modos operacionais do cronômetro.
 * - FREE: Cronômetro progressivo livre (00:00:00 -> ...)
 * - POMODORO: Ciclo fixo 25m foco / 5m descanso
 */
export type TimerMode = 'FREE' | 'POMODORO';

/**
 * Fases do ciclo Pomodoro.
 */
export type PomodoroPhase = 'FOCUS' | 'BREAK';

/**
 * Estado de execução do cronômetro.
 */
export type AppStatus = 'IDLE' | 'RUNNING' | 'PAUSED';

/**
 * Tela ativa no aplicativo.
 * - MAIN: Painel principal de foco/lazer
 * - STANDBY: Modo Relógio de Bancada (Dock Standby)
 */
export type ScreenMode = 'MAIN' | 'STANDBY';

/**
 * Direção de lançamento (Ganhar crédito vs Gastar saldo).
 */
export type EntryDirection = 'EARN' | 'SPEND';

/**
 * Registro histórico de uma sessão de tempo cronometrada ou lançada manualmente.
 */
export interface TimeLog {
  readonly id: string;
  readonly timestamp: number;
  readonly dateKey: string; // Formato YYYY-MM-DD no fuso local
  readonly direction: EntryDirection;
  readonly category: ActivityCategory;
  readonly durationMinutes: number;
  readonly balanceDeltaMinutes: number;
  readonly source: 'FREE_TIMER' | 'POMODORO' | 'MANUAL';
}

/**
 * Resultado do cálculo de ganho de lazer em atividades de foco.
 */
export interface EarnedCalculationResult {
  readonly earnedMinutes: number;
  readonly updatedDailyWorkMinutes: number;
  readonly cappedByWorkLimit: boolean;
}

/**
 * Resultado do cálculo de consumo (débito) de lazer.
 */
export interface SpendCalculationResult {
  readonly allowedSpendMinutes: number;
  readonly updatedBalanceMinutes: number;
  readonly hitFloorLimit: boolean;
}

/**
 * Resultado da verificação do ciclo semanal (reset de segunda-feira 00:00).
 */
export interface WeeklyResetResult {
  readonly shouldReset: boolean;
  readonly updatedBalanceMinutes: number;
  readonly lastResetMondayTimestamp: number;
}

/**
 * Constantes imutáveis das regras de negócio (Kairos / TempoDock).
 */
export const BUSINESS_RULES = {
  STUDY_RATE: 0.5,
  MAINTENANCE_RATE: 0.25,
  WORK_RATE: 0.5,
  LEISURE_SPEND_RATE: 1.0,
  DAILY_WORK_EARNED_CAP_MINUTES: 120, // +02h00 de lazer máximo por dia via Trabalho
  MIN_BALANCE_FLOOR_MINUTES: -60, // -01h00 limite absoluto de cheque especial
  POMODORO_FOCUS_MINUTES: 25,
  POMODORO_BREAK_MINUTES: 5,
} as const;
