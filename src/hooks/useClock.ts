import { useEffect, useState } from 'react';

const DAYS_PT_BR = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

const MONTHS_PT_BR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export interface ClockState {
  readonly hoursMinutes: string;
  readonly seconds: string;
  readonly fullDatePtBr: string;
  readonly pixelShiftOffset: { readonly x: number; readonly y: number };
}

function computeClockState(now: Date): ClockState {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const dayName = DAYS_PT_BR[now.getDay()] ?? 'Hoje';
  const dayNumber = now.getDate();
  const monthName = MONTHS_PT_BR[now.getMonth()] ?? '';

  // Prevenção de Burn-In OLED: deslocamento sutil periódico de pixels a cada minuto
  const minuteCycle = now.getMinutes() % 4;
  const shifts: ReadonlyArray<{ readonly x: number; readonly y: number }> = [
    { x: 0, y: 0 },
    { x: 2, y: 1 },
    { x: 0, y: 2 },
    { x: -2, y: 1 },
  ];
  const pixelShiftOffset = shifts[minuteCycle] ?? { x: 0, y: 0 };

  return {
    hoursMinutes: `${hh}:${mm}`,
    seconds: ss,
    fullDatePtBr: `${dayName}, ${dayNumber} de ${monthName}`,
    pixelShiftOffset,
  };
}

/**
 * Hook de relógio em tempo real com data por extenso em pt-BR e proteção anti burn-in OLED.
 */
export function useClock(): ClockState {
  const [clock, setClock] = useState<ClockState>(() => computeClockState(new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      setClock(computeClockState(new Date()));
    }, 1000);

    return () => {
      clearInterval(id);
    };
  }, []);

  return clock;
}
