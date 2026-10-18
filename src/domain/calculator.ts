import {
  BUSINESS_RULES,
  type EarnedCalculationResult,
  type FocusCategory,
  type SpendCalculationResult,
  type WeeklyResetResult,
} from './types.ts';

/**
 * Arredonda minutos sempre para BAIXO (inteiro inferior) para garantir que o Saldo de Lazer
 * nunca arredonde frações de minuto para cima.
 */
export function roundMinutes(value: number): number {
  return Math.floor(value + 1e-9);
}

/**
 * Calcula os minutos de lazer ganhos a partir de uma sessão de foco (Estudo, Manutenção ou Trabalho),
 * arredondando sempre para baixo (Math.floor) e aplicando o teto diário de +2h00 (120 min) via Trabalho.
 */
export function calculateEarnedMinutes(
  category: FocusCategory,
  durationInMinutes: number,
  currentDailyWorkEarnedMinutes: number
): EarnedCalculationResult {
  const safeDuration = Math.max(0, durationInMinutes);
  const safeCurrentWorkEarned = Math.max(0, roundMinutes(currentDailyWorkEarnedMinutes));

  if (safeDuration === 0) {
    return {
      earnedMinutes: 0,
      updatedDailyWorkMinutes: safeCurrentWorkEarned,
      cappedByWorkLimit:
        category === 'WORK' &&
        safeCurrentWorkEarned >= BUSINESS_RULES.DAILY_WORK_EARNED_CAP_MINUTES,
    };
  }

  if (category === 'STUDY') {
    return {
      earnedMinutes: roundMinutes(safeDuration * BUSINESS_RULES.STUDY_RATE),
      updatedDailyWorkMinutes: safeCurrentWorkEarned,
      cappedByWorkLimit: false,
    };
  }

  if (category === 'MAINTENANCE') {
    return {
      earnedMinutes: roundMinutes(safeDuration * BUSINESS_RULES.MAINTENANCE_RATE),
      updatedDailyWorkMinutes: safeCurrentWorkEarned,
      cappedByWorkLimit: false,
    };
  }

  // Categoria WORK: 50% limitado ao teto diário de +120 minutos de lazer (arredondado para baixo)
  const rawWorkEarned = roundMinutes(safeDuration * BUSINESS_RULES.WORK_RATE);
  const remainingWorkCap = Math.max(
    0,
    BUSINESS_RULES.DAILY_WORK_EARNED_CAP_MINUTES - safeCurrentWorkEarned
  );

  if (rawWorkEarned >= remainingWorkCap) {
    return {
      earnedMinutes: remainingWorkCap,
      updatedDailyWorkMinutes: safeCurrentWorkEarned + remainingWorkCap,
      cappedByWorkLimit: true,
    };
  }

  return {
    earnedMinutes: rawWorkEarned,
    updatedDailyWorkMinutes: safeCurrentWorkEarned + rawWorkEarned,
    cappedByWorkLimit: false,
  };
}

/**
 * Calcula o consumo de lazer (1:1) respeitando o piso absoluto de cheque especial (-01h00 / -60 min).
 * O saldo resultante é sempre arredondado para baixo (Math.floor).
 */
export function calculateSpendMinutes(
  requestedSpendMinutes: number,
  currentBalanceMinutes: number
): SpendCalculationResult {
  const safeRequested = Math.max(0, requestedSpendMinutes);
  const floor = BUSINESS_RULES.MIN_BALANCE_FLOOR_MINUTES; // -60
  const currentFloored = roundMinutes(currentBalanceMinutes);

  if (currentFloored <= floor) {
    return {
      allowedSpendMinutes: 0,
      updatedBalanceMinutes: floor,
      hitFloorLimit: true,
    };
  }

  const maxAvailableToSpend = currentFloored - floor;

  if (safeRequested >= maxAvailableToSpend) {
    return {
      allowedSpendMinutes: maxAvailableToSpend,
      updatedBalanceMinutes: floor,
      hitFloorLimit: true,
    };
  }

  const rawNewBalance = currentFloored - safeRequested * BUSINESS_RULES.LEISURE_SPEND_RATE;
  const updatedBalanceMinutes = Math.max(floor, Math.floor(rawNewBalance + 1e-9));
  const actualSpend = currentFloored - updatedBalanceMinutes;

  return {
    allowedSpendMinutes: actualSpend,
    updatedBalanceMinutes,
    hitFloorLimit: updatedBalanceMinutes <= floor,
  };
}

/**
 * Retorna o timestamp (epoch ms) correspondente à segunda-feira às 00:00:00.000 (horário local)
 * da semana à qual pertence `referenceTimestamp`.
 */
export function getMostRecentMondayMidnightTimestamp(referenceTimestamp: number): number {
  const date = new Date(referenceTimestamp);
  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - daysSinceMonday,
    0,
    0,
    0,
    0
  );
  return monday.getTime();
}

/**
 * Verifica se houve transição de ciclo semanal (segunda-feira 00:00 local).
 * Regra:
 * - Se mudou de semana e o saldo era positivo (>= 0), reseta para 00h00 (0 min).
 * - Se mudou de semana e o saldo era negativo (< 0), mantém a dívida intacta.
 */
export function evaluateWeeklyReset(
  currentBalanceMinutes: number,
  lastResetMondayTimestamp: number | null,
  nowTimestamp: number
): WeeklyResetResult {
  const currentMondayTimestamp = getMostRecentMondayMidnightTimestamp(nowTimestamp);

  if (lastResetMondayTimestamp === null) {
    return {
      shouldReset: false,
      updatedBalanceMinutes: roundMinutes(currentBalanceMinutes),
      lastResetMondayTimestamp: currentMondayTimestamp,
    };
  }

  if (currentMondayTimestamp > lastResetMondayTimestamp) {
    const newBalance = currentBalanceMinutes >= 0 ? 0 : roundMinutes(currentBalanceMinutes);
    return {
      shouldReset: true,
      updatedBalanceMinutes: newBalance,
      lastResetMondayTimestamp: currentMondayTimestamp,
    };
  }

  return {
    shouldReset: false,
    updatedBalanceMinutes: roundMinutes(currentBalanceMinutes),
    lastResetMondayTimestamp,
  };
}

/**
 * Retorna a chave do dia civil local no formato YYYY-MM-DD.
 */
export function getLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Verifica se mudou o dia civil (00:00 local) para zerar a contagem diária do teto de trabalho.
 */
export function evaluateDailyWorkReset(
  currentDailyWorkEarnedMinutes: number,
  lastWorkDateKey: string | null,
  nowTimestamp: number
): { dailyWorkEarnedMinutes: number; currentDateKey: string; didReset: boolean } {
  const todayKey = getLocalDateKey(nowTimestamp);
  if (lastWorkDateKey === null || lastWorkDateKey !== todayKey) {
    return {
      dailyWorkEarnedMinutes: 0,
      currentDateKey: todayKey,
      didReset: lastWorkDateKey !== null,
    };
  }
  return {
    dailyWorkEarnedMinutes: roundMinutes(currentDailyWorkEarnedMinutes),
    currentDateKey: todayKey,
    didReset: false,
  };
}

/**
 * Formata o saldo em minutos para o padrão visual do Kairos: "+02h 45m" ou "-00h 30m",
 * arredondando sempre para baixo (Math.floor).
 */
export function formatBalancePtBr(balanceMinutes: number): string {
  const totalWholeMinutes = Math.floor(balanceMinutes + 1e-9);
  const sign = totalWholeMinutes < 0 ? '-' : '+';
  const absMinutes = Math.abs(totalWholeMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `${sign}${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Formata o indicador do teto de trabalho diário: "1h15 / 2h00" (arredondado para baixo).
 */
export function formatWorkCapPtBr(dailyWorkEarnedMinutes: number): string {
  const clamped = Math.min(
    BUSINESS_RULES.DAILY_WORK_EARNED_CAP_MINUTES,
    Math.max(0, Math.floor(dailyWorkEarnedMinutes + 1e-9))
  );
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${hours}h${String(minutes).padStart(2, '0')} / 2h00`;
}

/**
 * Formata segundos em dígitos monoespaçados HH:MM:SS ou MM:SS.
 */
export function formatSecondsToDisplay(totalSeconds: number, forceHours = true): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (forceHours || hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
