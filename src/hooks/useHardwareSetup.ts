import { activateKeepAwakeAsync, useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAppStore } from '../stores/useAppStore.ts';

/**
 * Inicializa o hardware do tablet (bloqueio em LANDSCAPE + tela sempre ativa KeepAwake),
 * hidrata o estado persistido e revalida o ciclo semanal/diário ao retornar do background.
 */
export function useHardwareSetup(): void {
  useKeepAwake();

  const hydrate = useAppStore((s) => s.hydrate);
  const checkWeeklyReset = useAppStore((s) => s.checkWeeklyReset);
  const tickTimer = useAppStore((s) => s.tickTimer);

  useEffect(() => {
    void hydrate();

    async function configureTabletHardware(): Promise<void> {
      try {
        await activateKeepAwakeAsync();
      } catch {
        // Ignora caso não suportado no navegador web de desenvolvimento
      }

      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch {
        // Ignora em plataformas que não suportam bloqueio dinâmico de rotação
      }
    }

    void configureTabletHardware();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkWeeklyReset(Date.now());
        tickTimer();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hydrate, checkWeeklyReset, tickTimer]);
}
