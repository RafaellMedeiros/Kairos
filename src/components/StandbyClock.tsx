import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useClock } from '../hooks/useClock.ts';
import { useAppStore } from '../stores/useAppStore.ts';
import { KAIR_THEME } from './theme.ts';

/**
 * Modo Relógio de Bancada (Dock Standby) ultra-minimalista OLED.
 * Exibe exclusivamente:
 * - Hora atual gigante monoespaçada
 * - Data atual por extenso em pt-BR
 * - Botão inferior "Modo Foco" (retorna ao painel principal sem iniciar o cronômetro automaticamente)
 */
export const StandbyClock: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const { hoursMinutes, fullDatePtBr, pixelShiftOffset } = useClock();

  const setScreenMode = useAppStore((s) => s.setScreenMode);

  const [hoursPart, minutesPart] = hoursMinutes.split(':');
  const clockFontSize = Math.min(width * 0.22, height * 0.46, 230);

  const handleGoToFocusMode = (): void => {
    setScreenMode('MAIN');
  };

  return (
    <View
      style={[
        styles.standbyRoot,
        {
          transform: [
            { translateX: pixelShiftOffset.x },
            { translateY: pixelShiftOffset.y },
          ],
        },
      ]}
    >
      {/* Espaçador superior invisível para manter o relógio perfeitamente centralizado na tela */}
      <View style={styles.topSpacer} />

      {/* CENTRO DOMINANTE: Relógio Digital Gigante + Data Extensa */}
      <View style={styles.clockCenter}>
        <View style={styles.timeRow}>
          <Text
            style={[
              styles.giantClockText,
              { fontSize: clockFontSize, lineHeight: clockFontSize * 1.02 },
            ]}
          >
            {hoursPart}
          </Text>
          <Text
            style={[
              styles.giantClockColon,
              { fontSize: clockFontSize * 0.9, lineHeight: clockFontSize },
            ]}
          >
            :
          </Text>
          <Text
            style={[
              styles.giantClockText,
              { fontSize: clockFontSize, lineHeight: clockFontSize * 1.02 },
            ]}
          >
            {minutesPart}
          </Text>
        </View>

        <Text style={styles.dateText}>{fullDatePtBr}</Text>
      </View>

      {/* BASE MINIMALISTA: Botão "Modo Foco" (apenas navega para o painel de foco) */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleGoToFocusMode}
          style={({ pressed }) => [
            styles.focusModeButton,
            pressed && styles.pressedPill,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Ir para Modo Foco"
        >
          <Text style={styles.focusModeButtonText}>Modo Foco</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  standbyRoot: {
    flex: 1,
    width: '100%',
    backgroundColor: KAIR_THEME.colors.oledBlack,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  topSpacer: {
    height: 44,
  },
  clockCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  giantClockText: {
    color: KAIR_THEME.colors.textPrimary,
    fontFamily: KAIR_THEME.fonts.mono,
    fontWeight: '300',
    letterSpacing: -6,
    fontVariant: ['tabular-nums'],
  },
  giantClockColon: {
    color: KAIR_THEME.colors.surfaceBright,
    fontFamily: KAIR_THEME.fonts.mono,
    fontWeight: '200',
    marginHorizontal: 4,
  },
  dateText: {
    marginTop: 10,
    color: KAIR_THEME.colors.textSecondary,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 3.2,
    textTransform: 'uppercase',
  },
  bottomBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  focusModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
  focusModeButtonText: {
    color: KAIR_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  pressedPill: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
});
