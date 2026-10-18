import {
  calculateEarnedMinutes,
  calculateSpendMinutes,
  evaluateDailyWorkReset,
  evaluateWeeklyReset,
  formatBalancePtBr,
  formatWorkCapPtBr,
  getMostRecentMondayMidnightTimestamp,
} from './calculator.ts';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `[FALHA NO TESTE] ${message}: esperado ${String(expected)}, obtido ${String(actual)}`
    );
  }
}

export function runDomainTests(): void {
  // 1. Estudo (+50%, 2:1)
  const studyRes = calculateEarnedMinutes('STUDY', 60, 0);
  assertEqual(studyRes.earnedMinutes, 30, 'Estudo 60m deve gerar +30m de lazer');
  assertEqual(studyRes.updatedDailyWorkMinutes, 0, 'Estudo não altera teto de trabalho');
  assertEqual(studyRes.cappedByWorkLimit, false, 'Estudo não possui teto diário');

  // 2. Manutenção (+25%, 4:1)
  const maintRes = calculateEarnedMinutes('MAINTENANCE', 60, 15);
  assertEqual(maintRes.earnedMinutes, 15, 'Manutenção 60m deve gerar +15m de lazer');
  assertEqual(maintRes.updatedDailyWorkMinutes, 15, 'Manutenção preserva trabalho diário');
  assertEqual(maintRes.cappedByWorkLimit, false, 'Manutenção não possui teto diário');

  // 3. Trabalho (+50% limitado ao teto diário de +120m / +02h00 de lazer)
  const workBlock1 = calculateEarnedMinutes('WORK', 120, 0);
  assertEqual(workBlock1.earnedMinutes, 60, 'Trabalho 120m iniciais deve gerar +60m');
  assertEqual(workBlock1.updatedDailyWorkMinutes, 60, 'Acumulado de trabalho diário = 60m');
  assertEqual(workBlock1.cappedByWorkLimit, false, 'Ainda abaixo do teto de 120m');

  const workBlock2 = calculateEarnedMinutes('WORK', 180, workBlock1.updatedDailyWorkMinutes);
  assertEqual(workBlock2.earnedMinutes, 60, 'Trabalho adicional deve travar nos +60m restantes do teto');
  assertEqual(workBlock2.updatedDailyWorkMinutes, 120, 'Teto diário de 120m atingido');
  assertEqual(workBlock2.cappedByWorkLimit, true, 'Deve sinalizar que atingiu o teto diário');

  const workBlock3 = calculateEarnedMinutes('WORK', 60, workBlock2.updatedDailyWorkMinutes);
  assertEqual(workBlock3.earnedMinutes, 0, 'Trabalho após atingir 120m gera 0m de lazer');
  assertEqual(workBlock3.updatedDailyWorkMinutes, 120, 'Permanece em 120m');
  assertEqual(workBlock3.cappedByWorkLimit, true, 'Permanece travado pelo teto diário');

  // 4. Débito de Lazer (1:1 com piso absoluto de -01h00 / -60m)
  const spend1 = calculateSpendMinutes(45, 30);
  assertEqual(spend1.allowedSpendMinutes, 45, 'Consumo de 45m com saldo +30m é permitido integralmente');
  assertEqual(spend1.updatedBalanceMinutes, -15, 'Saldo atualizado para -15m');
  assertEqual(spend1.hitFloorLimit, false, 'Ainda não atingiu o piso de -60m');

  const spend2 = calculateSpendMinutes(60, spend1.updatedBalanceMinutes);
  assertEqual(spend2.allowedSpendMinutes, 45, 'Consumo de 60m a partir de -15m só permite 45m até -60m');
  assertEqual(spend2.updatedBalanceMinutes, -60, 'Saldo trava exatamente em -60m (-01h00)');
  assertEqual(spend2.hitFloorLimit, true, 'Sinaliza que atingiu o piso de -01h00');

  const spend3 = calculateSpendMinutes(15, -60);
  assertEqual(spend3.allowedSpendMinutes, 0, 'Consumo bloqueado quando saldo já está em -60m');
  assertEqual(spend3.updatedBalanceMinutes, -60, 'Saldo permanece em -60m');
  assertEqual(spend3.hitFloorLimit, true, 'Permanece travado no piso');

  // 5. Ciclo Semanal (Reset toda segunda-feira 00:00)
  const wednesday = new Date(2026, 9, 14, 15, 0, 0).getTime();
  const mondayWeek1 = getMostRecentMondayMidnightTimestamp(wednesday);
  const saturday = new Date(2026, 9, 17, 20, 0, 0).getTime();

  const sameWeekCheck = evaluateWeeklyReset(95, mondayWeek1, saturday);
  assertEqual(sameWeekCheck.shouldReset, false, 'Não deve resetar na mesma semana');
  assertEqual(sameWeekCheck.updatedBalanceMinutes, 95, 'Mantém saldo positivo na mesma semana');

  const nextMonday = new Date(2026, 9, 19, 0, 1, 0).getTime();
  const positiveReset = evaluateWeeklyReset(95, mondayWeek1, nextMonday);
  assertEqual(positiveReset.shouldReset, true, 'Deve resetar ao passar de segunda-feira 00:00');
  assertEqual(positiveReset.updatedBalanceMinutes, 0, 'Saldo positivo expira e zera para 00h00');

  const negativeReset = evaluateWeeklyReset(-35, mondayWeek1, nextMonday);
  assertEqual(negativeReset.shouldReset, true, 'Detecta virada de semana para saldo negativo');
  assertEqual(negativeReset.updatedBalanceMinutes, -35, 'Dívida negativa (-35m) transita intacta');

  // 6. Reset diário do teto de trabalho
  const day1 = new Date(2026, 9, 17, 23, 50, 0).getTime();
  const day2 = new Date(2026, 9, 18, 0, 5, 0).getTime();
  const stateDay1 = evaluateDailyWorkReset(90, '2026-10-17', day1);
  assertEqual(stateDay1.didReset, false, 'Mesmo dia civil não zera trabalho');
  assertEqual(stateDay1.dailyWorkEarnedMinutes, 90, 'Mantém 90m no mesmo dia');

  const stateDay2 = evaluateDailyWorkReset(90, '2026-10-17', day2);
  assertEqual(stateDay2.didReset, true, 'Novo dia civil zera acumulado de trabalho');
  assertEqual(stateDay2.dailyWorkEarnedMinutes, 0, 'Zera acumulado para 0m no novo dia');

  // 7. Formatação pt-BR e arredondamento sempre para baixo (Math.floor)
  assertEqual(formatBalancePtBr(165), '+02h 45m', 'Formatação de saldo positivo');
  assertEqual(formatBalancePtBr(12.9), '+00h 12m', 'Saldo de lazer deve arredondar sempre para baixo');
  assertEqual(formatBalancePtBr(-30), '-00h 30m', 'Formatação de saldo negativo');
  assertEqual(formatBalancePtBr(0), '+00h 00m', 'Formatação de saldo zero');
  assertEqual(formatWorkCapPtBr(75.8), '1h15 / 2h00', 'Formatação do teto de trabalho arredondado para baixo');

  const oddPomodoroStudy = calculateEarnedMinutes('STUDY', 25, 0);
  assertEqual(oddPomodoroStudy.earnedMinutes, 12, '25m de Estudo (12.5m) deve arredondar para baixo (12m)');

  const oddPomodoroMaint = calculateEarnedMinutes('MAINTENANCE', 25, 0);
  assertEqual(oddPomodoroMaint.earnedMinutes, 6, '25m de Manutenção (6.25m) deve arredondar para baixo (6m)');

  // 8. Validação em tempo real do piso de -01h00 (-60m) travando consumo ativo (Item 5.2)
  const initialBalanceNearFloor = -58; // Restam apenas 2 minutos (120s) até -60m
  const maxAllowedSeconds = Math.floor((initialBalanceNearFloor - (-60)) * 60);
  assertEqual(maxAllowedSeconds, 120, 'Restam exatamente 120s até atingir o piso de -01h00');
  const autoStopSpend = calculateSpendMinutes(150 / 60, initialBalanceNearFloor);
  assertEqual(autoStopSpend.allowedSpendMinutes, 2, 'Trava o débito em 2m mesmo se o tick passar de 120s');
  assertEqual(autoStopSpend.updatedBalanceMinutes, -60, 'Trava o saldo exatamente em -60m (-01h00)');
  assertEqual(autoStopSpend.hitFloorLimit, true, 'Aciona bloqueio imediato no piso');

  console.log('✅ Todos os testes unitários e de integração do domínio Kairos passaram com sucesso!');
}

runDomainTests();
