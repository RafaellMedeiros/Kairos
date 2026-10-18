import { useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore.ts';

/**
 * Hook que aciona o cálculo por diferença de timestamp (Date.now() - startTimestamp)
 * com frequência de 250ms para evitar drifting de setInterval.
 */
export function useTimerTick(): void {
  const status = useAppStore((s) => s.timerState.status);
  const tickTimer = useAppStore((s) => s.tickTimer);
  const checkWeeklyReset = useAppStore((s) => s.checkWeeklyReset);

  useEffect(() => {
    if (status !== 'RUNNING') {
      return;
    }

    const intervalId = setInterval(() => {
      tickTimer();
    }, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [status, tickTimer]);

  // Verificador periódico de virada de meia-noite / segunda-feira 00:00 (a cada 30s)
  useEffect(() => {
    const resetCheckId = setInterval(() => {
      checkWeeklyReset(Date.now());
    }, 30000);

    return () => {
      clearInterval(resetCheckId);
    };
  }, [checkWeeklyReset]);
}
