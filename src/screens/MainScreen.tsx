import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HeaderStatus } from '../components/HeaderStatus.tsx';
import { ManualEntryModal } from '../components/ManualEntryModal.tsx';
import { ModeSelector } from '../components/ModeSelector.tsx';
import { TimerDisplay } from '../components/TimerDisplay.tsx';
import { KAIR_THEME } from '../components/theme.ts';
import { useClock } from '../hooks/useClock.ts';

/**
 * Tela Principal (Painel de Foco e Consumo de Lazer) estruturada na proporção 10% / 80% / 10%
 * conforme a tela "Dashboard Dock Tablet OLED Paisagem" do MCP Stitch.
 */
export const MainScreen: React.FC = () => {
  const { pixelShiftOffset } = useClock();

  return (
    <View
      style={[
        styles.mainRoot,
        {
          transform: [
            { translateX: pixelShiftOffset.x },
            { translateY: pixelShiftOffset.y },
          ],
        },
      ]}
    >
      {/* 10% Topo: Saldo, Trabalho Diário e Atalhos */}
      <HeaderStatus />

      {/* 80% Centro: Dígitos Gigantes e Controles Circulares */}
      <TimerDisplay />

      {/* 10% Base: Seletor de Pílulas das Atividades */}
      <ModeSelector />

      {/* Modal de Lançamento Manual Retroativo */}
      <ManualEntryModal />
    </View>
  );
};

const styles = StyleSheet.create({
  mainRoot: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: KAIR_THEME.colors.oledBlack,
    justifyContent: 'space-between',
  },
});
