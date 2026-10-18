import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  calculateEarnedMinutes,
  calculateSpendMinutes,
  formatSecondsToDisplay,
  roundMinutes,
} from '../domain/calculator.ts';
import { BUSINESS_RULES, type ActivityCategory } from '../domain/types.ts';
import { useAppStore } from '../stores/useAppStore.ts';
import { KAIR_THEME } from './theme.ts';

function getCategoryMeta(category: ActivityCategory): {
  readonly label: string;
  readonly rateText: string;
  readonly accentColor: string;
} {
  switch (category) {
    case 'STUDY':
      return {
        label: 'Estudo',
        rateText: '+50%',
        accentColor: KAIR_THEME.colors.emeraldBright,
      };
    case 'MAINTENANCE':
      return {
        label: 'Manutenção',
        rateText: '+25%',
        accentColor: KAIR_THEME.colors.emeraldBright,
      };
    case 'WORK':
      return {
        label: 'Trabalho',
        rateText: '+50%',
        accentColor: KAIR_THEME.colors.emeraldBright,
      };
    case 'LEISURE':
      return {
        label: 'Gastar Lazer',
        rateText: '-100%',
        accentColor: KAIR_THEME.colors.indigoBright,
      };
  }
}

/**
 * Componente central dominante (~80% da tela) baseado na tela "Dashboard Dock Tablet OLED Paisagem" do Stitch.
 * Exibe:
 * - Seletor minimalista [Cronômetro Livre] | [Pomodoro 25/5]
 * - Dígitos gigantes monoespaçados legíveis a 1 metro de distância
 * - Botões circulares táteis de Parar/Salvar e Play/Pause
 */
export const TimerDisplay: React.FC = () => {
  const { width, height } = useWindowDimensions();

  const activeMode = useAppStore((s) => s.activeMode);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const pomodoroPhase = useAppStore((s) => s.pomodoroPhase);
  const timerState = useAppStore((s) => s.timerState);
  const balanceMinutes = useAppStore((s) => s.balanceMinutes);
  const dailyWorkEarnedMinutes = useAppStore((s) => s.dailyWorkEarnedMinutes);
  const statusMessage = useAppStore((s) => s.statusMessage);

  const setActiveMode = useAppStore((s) => s.setActiveMode);
  const startTimer = useAppStore((s) => s.startTimer);
  const pauseTimer = useAppStore((s) => s.pauseTimer);
  const stopAndSave = useAppStore((s) => s.stopAndSave);
  const skipPomodoroPhase = useAppStore((s) => s.skipPomodoroPhase);
  const clearStatusMessage = useAppStore((s) => s.clearStatusMessage);

  const isRunning = timerState.status === 'RUNNING';
  const isIdle = timerState.status === 'IDLE';
  const isLeisure = activeCategory === 'LEISURE';
  const isFloorBlocked =
    isLeisure && balanceMinutes <= BUSINESS_RULES.MIN_BALANCE_FLOOR_MINUTES;

  // Cálculo dos segundos exibidos (progressivo no modo Livre, regressivo no Pomodoro)
  const targetPomodoroSeconds =
    pomodoroPhase === 'FOCUS'
      ? BUSINESS_RULES.POMODORO_FOCUS_MINUTES * 60
      : BUSINESS_RULES.POMODORO_BREAK_MINUTES * 60;

  const displayedSeconds =
    activeMode === 'POMODORO'
      ? Math.max(0, targetPomodoroSeconds - timerState.elapsedSeconds)
      : timerState.elapsedSeconds;

  const showHours = activeMode === 'FREE';
  const formattedDigits = formatSecondsToDisplay(displayedSeconds, showHours);

  // Dimensionamento responsivo dos dígitos gigantes para ocupar o centro em Landscape
  const dynamicFontSize = showHours
    ? Math.min(width * 0.145, height * 0.32, 165)
    : Math.min(width * 0.19, height * 0.36, 200);

  // Prévia em tempo real do ganho/consumo da sessão atual (arredondado para baixo)
  const elapsedMinutes = timerState.elapsedSeconds / 60;
  let liveSessionPreview = '';
  if (activeMode === 'POMODORO' && pomodoroPhase === 'BREAK') {
    liveSessionPreview = 'Bloco de Descanso (5m) • Não debita nem credita lazer';
  } else if (isLeisure) {
    const spendPreview = calculateSpendMinutes(elapsedMinutes, balanceMinutes);
    liveSessionPreview = `Sessão atual: -${spendPreview.allowedSpendMinutes}m de lazer`;
  } else {
    const earnPreview = calculateEarnedMinutes(
      activeCategory,
      elapsedMinutes,
      dailyWorkEarnedMinutes
    );
    liveSessionPreview = earnPreview.cappedByWorkLimit
      ? `Sessão atual: +${earnPreview.earnedMinutes}m (Teto diário de Trabalho atingido)`
      : `Sessão atual: +${earnPreview.earnedMinutes}m de lazer acumulado`;
  }

  const meta = getCategoryMeta(activeCategory);
  const primaryBtnColor = isLeisure
    ? KAIR_THEME.colors.indigoPrimary
    : KAIR_THEME.colors.emeraldPrimary;

  return (
    <View style={styles.centerContainer}>
      {/* Linha superior: Seletor de Modo [Cronômetro Livre] | [Pomodoro 25/5] + Categoria Ativa */}
      <View style={styles.modeHeaderRow}>
        <View style={styles.modeSwitchGroup}>
          <Pressable
            disabled={!isIdle}
            onPress={() => setActiveMode('FREE')}
            style={[
              styles.modeTextButton,
              activeMode === 'FREE' && styles.modeTextButtonActive,
              !isIdle && styles.disabledControl,
            ]}
          >
            <Text
              style={[
                styles.modeText,
                activeMode === 'FREE' && styles.modeTextActive,
              ]}
            >
              [Cronômetro Livre]
            </Text>
          </Pressable>

          <Text style={styles.modePipe}>|</Text>

          <Pressable
            disabled={!isIdle || isLeisure}
            onPress={() => setActiveMode('POMODORO')}
            style={[
              styles.modeTextButton,
              activeMode === 'POMODORO' && styles.modeTextButtonActive,
              (!isIdle || isLeisure) && styles.disabledControl,
            ]}
          >
            <Text
              style={[
                styles.modeText,
                activeMode === 'POMODORO' && styles.modeTextActive,
              ]}
            >
              [Pomodoro 25/5]
            </Text>
          </Pressable>
        </View>

        <View style={styles.dotSeparator} />

        <View style={styles.activeCategoryBadge}>
          <Text style={styles.activeCategoryLabel}>{meta.label}</Text>
          <Text style={styles.modePipe}>•</Text>
          <Text style={[styles.activeCategoryRate, { color: meta.accentColor }]}>
            {meta.rateText}
          </Text>
        </View>
      </View>

      {/* DÍGITOS GIGANTES MONOESPAÇADOS */}
      <View style={styles.digitsWrapper}>
        <Text
          style={[
            styles.giantDigits,
            {
              fontSize: dynamicFontSize,
              lineHeight: dynamicFontSize * 1.04,
            },
            isFloorBlocked && { color: KAIR_THEME.colors.dangerPrimary },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formattedDigits}
        </Text>
      </View>

      {/* Subtítulo de Status / Ciclo Pomodoro / Prévia em tempo real */}
      <View style={styles.subStatusRow}>
        {activeMode === 'POMODORO' ? (
          <View style={styles.pomodoroIndicatorRow}>
            <View
              style={[
                styles.phaseDot,
                pomodoroPhase === 'FOCUS'
                  ? { backgroundColor: KAIR_THEME.colors.emeraldBright }
                  : { backgroundColor: KAIR_THEME.colors.amberPrimary },
              ]}
            />
            <Text style={styles.subStatusText}>
              {pomodoroPhase === 'FOCUS'
                ? 'Ciclo Pomodoro: Foco 25m (gera crédito ao concluir ou salvar)'
                : 'Ciclo Pomodoro: Descanso 5m (pausa restauradora)'}
            </Text>
          </View>
        ) : (
          <Text style={styles.subStatusText}>{liveSessionPreview}</Text>
        )}
      </View>

      {/* Banner de aviso / feedback (ex: piso de -01h00 ou conclusão de bloco) */}
      {statusMessage !== null && (
        <Pressable onPress={clearStatusMessage} style={styles.feedbackBanner}>
          <Text style={styles.feedbackBannerText}>{statusMessage}</Text>
        </Pressable>
      )}

      {/* CONTROLES CIRCULARES ESSENCIAIS */}
      <View style={styles.controlsRow}>
        {/* Botão Secundário: Parar e Salvar */}
        <Pressable
          disabled={isIdle && timerState.elapsedSeconds === 0}
          onPress={stopAndSave}
          style={({ pressed }) => [
            styles.secondaryCircleButton,
            isIdle && timerState.elapsedSeconds === 0 && styles.disabledCircleButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Parar e Salvar Sessão"
        >
          <View style={styles.stopSquareIcon} />
        </Pressable>

        {/* Botão Principal: Play / Pause */}
        <Pressable
          disabled={isFloorBlocked && !isRunning}
          onPress={isRunning ? pauseTimer : startTimer}
          style={({ pressed }) => [
            styles.primaryCircleButton,
            { backgroundColor: primaryBtnColor },
            isFloorBlocked && !isRunning && styles.blockedPrimaryButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? 'Pausar Cronômetro' : 'Iniciar Cronômetro'}
        >
          {isRunning ? (
            <View style={styles.pauseBarsWrapper}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <Text style={styles.playTriangleIcon}>▶</Text>
          )}
        </Pressable>

        {/* Botão Secundário no modo Pomodoro: Alternar Fase (Foco / Descanso) */}
        {activeMode === 'POMODORO' && (
          <Pressable
            onPress={skipPomodoroPhase}
            style={({ pressed }) => [
              styles.secondaryCircleButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Alternar fase Foco ou Descanso"
          >
            <Text style={styles.skipIcon}>⏭</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  modeSwitchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeTextButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeTextButtonActive: {
    backgroundColor: KAIR_THEME.colors.emeraldBg,
    borderColor: KAIR_THEME.colors.emeraldBorder,
  },
  modeText: {
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 13,
    color: KAIR_THEME.colors.textMuted,
    fontWeight: '500',
  },
  modeTextActive: {
    color: KAIR_THEME.colors.emeraldBright,
    fontWeight: '700',
  },
  modePipe: {
    color: KAIR_THEME.colors.borderSubtle,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 13,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: KAIR_THEME.colors.surfaceBright,
  },
  activeCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeCategoryLabel: {
    color: KAIR_THEME.colors.textPrimary,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 13,
    fontWeight: '600',
  },
  activeCategoryRate: {
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 13,
    fontWeight: '700',
  },
  digitsWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  giantDigits: {
    color: KAIR_THEME.colors.textPrimary,
    fontFamily: KAIR_THEME.fonts.mono,
    fontWeight: '300',
    letterSpacing: -4,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  subStatusRow: {
    marginTop: 4,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pomodoroIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subStatusText: {
    color: KAIR_THEME.colors.textMuted,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 12,
  },
  feedbackBanner: {
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    borderColor: KAIR_THEME.colors.borderSubtle,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  feedbackBannerText: {
    color: KAIR_THEME.colors.textSecondary,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  secondaryCircleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledCircleButton: {
    opacity: 0.3,
  },
  disabledControl: {
    opacity: 0.45,
  },
  primaryCircleButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedPrimaryButton: {
    backgroundColor: KAIR_THEME.colors.dangerBg,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.dangerBorder,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
  stopSquareIcon: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: KAIR_THEME.colors.textSecondary,
  },
  playTriangleIcon: {
    color: KAIR_THEME.colors.oledBlack,
    fontSize: 28,
    fontWeight: '800',
    marginLeft: 4,
  },
  pauseBarsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pauseBar: {
    width: 6,
    height: 24,
    borderRadius: 2,
    backgroundColor: KAIR_THEME.colors.oledBlack,
  },
  skipIcon: {
    color: KAIR_THEME.colors.textSecondary,
    fontSize: 18,
  },
});
