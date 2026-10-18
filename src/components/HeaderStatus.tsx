import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatBalancePtBr, formatWorkCapPtBr } from '../domain/calculator.ts';
import { BUSINESS_RULES } from '../domain/types.ts';
import { useAppStore } from '../stores/useAppStore.ts';
import { KAIR_THEME } from './theme.ts';

/**
 * Topo sutil (~10% da altura) seguindo o layout "Dashboard Dock Tablet OLED Paisagem" do Stitch.
 * Exibe:
 * - Saldo de Lazer em destaque (+02h 45m ou -00h 30m)
 * - Indicador do teto de trabalho diário (Trabalho hoje: Xh / 2h00)
 * - Botão "Modo Relógio" e botão "+ Lançamento Manual"
 */
export const HeaderStatus: React.FC = () => {
  const balanceMinutes = useAppStore((s) => s.balanceMinutes);
  const dailyWorkEarnedMinutes = useAppStore((s) => s.dailyWorkEarnedMinutes);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const elapsedSeconds = useAppStore((s) => s.timerState.elapsedSeconds);
  const setScreenMode = useAppStore((s) => s.setScreenMode);
  const setManualModalOpen = useAppStore((s) => s.setManualModalOpen);

  // Em modo Gastar Lazer, exibe a dedução em tempo real travando visualmente em -01h00 (-60m)
  const liveBalanceMinutes =
    activeCategory === 'LEISURE' && elapsedSeconds > 0
      ? Math.max(
          BUSINESS_RULES.MIN_BALANCE_FLOOR_MINUTES,
          balanceMinutes - elapsedSeconds / 60
        )
      : balanceMinutes;

  const isNegative = liveBalanceMinutes < 0;
  const isAtFloor = liveBalanceMinutes <= BUSINESS_RULES.MIN_BALANCE_FLOOR_MINUTES;
  const isWorkCapped =
    dailyWorkEarnedMinutes >= BUSINESS_RULES.DAILY_WORK_EARNED_CAP_MINUTES;

  const balanceColor = isAtFloor
    ? KAIR_THEME.colors.dangerPrimary
    : isNegative
      ? KAIR_THEME.colors.amberPrimary
      : KAIR_THEME.colors.emeraldBright;

  return (
    <View style={styles.headerContainer}>
      {/* Canto Superior Esquerdo: Saldo de Lazer + Trabalho Hoje */}
      <View style={styles.leftMetrics}>
        <View style={styles.balanceBadge}>
          <View style={[styles.statusDot, { backgroundColor: balanceColor }]} />
          <Text style={styles.metricLabel}>SALDO DE LAZER:</Text>
          <Text style={[styles.balanceValue, { color: balanceColor }]}>
            {formatBalancePtBr(liveBalanceMinutes)}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.workCapContainer}>
          <Text style={styles.workLabel}>Trabalho hoje:</Text>
          <Text
            style={[
              styles.workValue,
              isWorkCapped && { color: KAIR_THEME.colors.amberPrimary },
            ]}
          >
            {formatWorkCapPtBr(dailyWorkEarnedMinutes)}
          </Text>
          {isWorkCapped && <Text style={styles.capBadge}>TETO</Text>}
        </View>
      </View>

      {/* Canto Superior Direito: Ações Rápidas */}
      <View style={styles.rightActions}>
        <Pressable
          onPress={() => setScreenMode('STANDBY')}
          style={({ pressed }) => [
            styles.actionPill,
            pressed && styles.actionPillPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Alternar para Modo Relógio de Bancada"
        >
          <Text style={styles.clockIcon}>◷</Text>
          <Text style={styles.actionPillText}>Modo Relógio</Text>
        </Pressable>

        <Pressable
          onPress={() => setManualModalOpen(true)}
          style={({ pressed }) => [
            styles.actionPill,
            styles.manualActionPill,
            pressed && styles.actionPillPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Abrir Lançamento Manual"
        >
          <Text style={styles.plusIcon}>＋</Text>
          <Text style={styles.actionPillText}>Lançamento Manual</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  leftMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricLabel: {
    color: KAIR_THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.1,
  },
  balanceValue: {
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  verticalDivider: {
    width: 1,
    height: 18,
    backgroundColor: KAIR_THEME.colors.borderSubtle,
  },
  workCapContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workLabel: {
    color: KAIR_THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  workValue: {
    color: KAIR_THEME.colors.textPrimary,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  capBadge: {
    backgroundColor: KAIR_THEME.colors.amberBg,
    color: KAIR_THEME.colors.amberPrimary,
    borderColor: KAIR_THEME.colors.amberBorder,
    borderWidth: 1,
    fontSize: 10,
    fontFamily: KAIR_THEME.fonts.mono,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
  },
  manualActionPill: {
    borderColor: KAIR_THEME.colors.emeraldBorder,
  },
  actionPillPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  clockIcon: {
    color: KAIR_THEME.colors.textSecondary,
    fontSize: 14,
  },
  plusIcon: {
    color: KAIR_THEME.colors.emeraldBright,
    fontSize: 14,
    fontWeight: '700',
  },
  actionPillText: {
    color: KAIR_THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
});
