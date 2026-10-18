import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  calculateEarnedMinutes,
  calculateSpendMinutes,
  formatBalancePtBr,
} from '../domain/calculator.ts';
import {
  BUSINESS_RULES,
  type EntryDirection,
  type FocusCategory,
} from '../domain/types.ts';
import { useAppStore } from '../stores/useAppStore.ts';
import { KAIR_THEME } from './theme.ts';

interface ShortcutChip {
  readonly label: string;
  readonly minutes: number;
}

const SHORTCUT_CHIPS: ReadonlyArray<ShortcutChip> = [
  { label: '15m', minutes: 15 },
  { label: '25m', minutes: 25 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
];

const FOCUS_CATEGORIES: ReadonlyArray<{
  readonly id: FocusCategory;
  readonly label: string;
  readonly rate: string;
}> = [
  { id: 'STUDY', label: 'Estudo', rate: '+50%' },
  { id: 'MAINTENANCE', label: 'Manutenção', rate: '+25%' },
  { id: 'WORK', label: 'Trabalho', rate: '+50%' },
];

/**
 * Modal de Lançamento Manual (Retroativo) seguindo o design system "Nocturne Ambient Dock" do Stitch.
 */
export const ManualEntryModal: React.FC = () => {
  const isOpen = useAppStore((s) => s.isManualModalOpen);
  const balanceMinutes = useAppStore((s) => s.balanceMinutes);
  const dailyWorkEarnedMinutes = useAppStore((s) => s.dailyWorkEarnedMinutes);
  const setManualModalOpen = useAppStore((s) => s.setManualModalOpen);
  const addManualEntry = useAppStore((s) => s.addManualEntry);

  const [direction, setDirection] = useState<EntryDirection>('EARN');
  const [category, setCategory] = useState<FocusCategory>('STUDY');
  const [hoursInput, setHoursInput] = useState<string>('0');
  const [minutesInput, setMinutesInput] = useState<string>('25');

  const parsedHours = Math.max(0, parseInt(hoursInput || '0', 10) || 0);
  const parsedMinutes = Math.max(0, parseInt(minutesInput || '0', 10) || 0);
  const totalMinutes = parsedHours * 60 + parsedMinutes;

  const handleSelectChip = (chipMinutes: number): void => {
    const h = Math.floor(chipMinutes / 60);
    const m = chipMinutes % 60;
    setHoursInput(String(h));
    setMinutesInput(String(m));
  };

  // Cálculo dinâmico em tempo real da prévia antes da confirmação
  let previewDeltaText = '+0m';
  let projectedBalance = balanceMinutes;
  let warningNotice: string | null = null;
  let canSubmit = totalMinutes > 0;

  if (direction === 'EARN') {
    const earnRes = calculateEarnedMinutes(
      category,
      totalMinutes,
      dailyWorkEarnedMinutes
    );
    previewDeltaText = `+${earnRes.earnedMinutes}m de lazer`;
    projectedBalance = balanceMinutes + earnRes.earnedMinutes;

    if (earnRes.cappedByWorkLimit) {
      warningNotice =
        earnRes.earnedMinutes === 0
          ? 'Teto diário de Trabalho (+2h00 de lazer) já atingido hoje. Crédito será +0m.'
          : `Limitado pelo teto diário de Trabalho (+2h00 máx/dia).`;
    }
  } else {
    const isAlreadyAtFloor =
      balanceMinutes <= BUSINESS_RULES.MIN_BALANCE_FLOOR_MINUTES;
    if (isAlreadyAtFloor) {
      previewDeltaText = '0m (Bloqueado)';
      projectedBalance = BUSINESS_RULES.MIN_BALANCE_FLOOR_MINUTES;
      warningNotice =
        'Saldo no limite inferior absoluto de -01h00. Novos débitos estão bloqueados.';
      canSubmit = false;
    } else {
      const spendRes = calculateSpendMinutes(totalMinutes, balanceMinutes);
      previewDeltaText = `-${spendRes.allowedSpendMinutes}m de lazer`;
      projectedBalance = spendRes.updatedBalanceMinutes;
      if (spendRes.hitFloorLimit && totalMinutes > spendRes.allowedSpendMinutes) {
        warningNotice = `O débito será limitado a -${spendRes.allowedSpendMinutes}m para respeitar o piso de -01h00.`;
      }
    }
  }

  const handleConfirm = (): void => {
    if (!canSubmit) {
      return;
    }
    addManualEntry({
      direction,
      category,
      durationMinutes: totalMinutes,
    });
    setManualModalOpen(false);
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={() => setManualModalOpen(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Cabeçalho do Modal */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lançamento Manual Retroativo</Text>
            <Pressable
              onPress={() => setManualModalOpen(false)}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar Modal"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* 1. Seletor de Direção: Ganhar Lazer vs Gastar Lazer */}
          <View style={styles.directionSwitchRow}>
            <Pressable
              onPress={() => setDirection('EARN')}
              style={[
                styles.directionTab,
                direction === 'EARN' && styles.directionTabEarnActive,
              ]}
            >
              <Text
                style={[
                  styles.directionTabText,
                  direction === 'EARN' && styles.directionTabTextEarnActive,
                ]}
              >
                Ganhar Lazer (Foco)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDirection('SPEND')}
              style={[
                styles.directionTab,
                direction === 'SPEND' && styles.directionTabSpendActive,
              ]}
            >
              <Text
                style={[
                  styles.directionTabText,
                  direction === 'SPEND' && styles.directionTabTextSpendActive,
                ]}
              >
                Gastar Lazer (Consumo)
              </Text>
            </Pressable>
          </View>

          {/* 2. Seletor de Categoria (apenas quando Ganhar Lazer) */}
          {direction === 'EARN' && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>CATEGORIA DE FOCO</Text>
              <View style={styles.categoryRow}>
                {FOCUS_CATEGORIES.map((item) => {
                  const selected = category === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setCategory(item.id)}
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipLabel,
                          selected && styles.categoryChipLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.categoryChipRate,
                          selected && styles.categoryChipRateActive,
                        ]}
                      >
                        {item.rate}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* 3. Duração (Horas / Minutos + Atalhos Rápidos) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>DURAÇÃO DA ATIVIDADE</Text>
            <View style={styles.durationLayoutRow}>
              <View style={styles.inputsGroup}>
                <View style={styles.inputBoxWrapper}>
                  <TextInput
                    value={hoursInput}
                    onChangeText={(txt) =>
                      setHoursInput(txt.replace(/[^0-9]/g, ''))
                    }
                    keyboardType="number-pad"
                    maxLength={2}
                    style={styles.numericInput}
                    selectTextOnFocus
                  />
                  <Text style={styles.unitSuffix}>h</Text>
                </View>

                <View style={styles.inputBoxWrapper}>
                  <TextInput
                    value={minutesInput}
                    onChangeText={(txt) =>
                      setMinutesInput(txt.replace(/[^0-9]/g, ''))
                    }
                    keyboardType="number-pad"
                    maxLength={3}
                    style={styles.numericInput}
                    selectTextOnFocus
                  />
                  <Text style={styles.unitSuffix}>min</Text>
                </View>
              </View>

              <View style={styles.shortcutChipsRow}>
                {SHORTCUT_CHIPS.map((chip) => {
                  const isChipActive = totalMinutes === chip.minutes;
                  return (
                    <Pressable
                      key={chip.label}
                      onPress={() => handleSelectChip(chip.minutes)}
                      style={[
                        styles.shortcutChip,
                        isChipActive && styles.shortcutChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.shortcutChipText,
                          isChipActive && styles.shortcutChipTextActive,
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 4. Prévia Dinâmica em Tempo Real */}
          <View style={styles.previewBox}>
            <View style={styles.previewMainRow}>
              <View>
                <Text style={styles.previewHeading}>IMPACTO NO SALDO</Text>
                <Text
                  style={[
                    styles.previewDeltaValue,
                    {
                      color:
                        direction === 'EARN'
                          ? KAIR_THEME.colors.emeraldBright
                          : KAIR_THEME.colors.indigoBright,
                    },
                  ]}
                >
                  {previewDeltaText}
                </Text>
              </View>

              <View style={styles.previewRightCol}>
                <Text style={styles.previewHeading}>SALDO PROJETADO</Text>
                <Text
                  style={[
                    styles.previewProjectedValue,
                    projectedBalance < 0 && {
                      color: KAIR_THEME.colors.dangerPrimary,
                    },
                  ]}
                >
                  {formatBalancePtBr(projectedBalance)}
                </Text>
              </View>
            </View>

            {warningNotice !== null && (
              <Text style={styles.warningText}>{warningNotice}</Text>
            )}
          </View>

          {/* 5. Botões de Confirmação / Cancelamento */}
          <View style={styles.footerButtons}>
            <Pressable
              onPress={() => setManualModalOpen(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              disabled={!canSubmit}
              onPress={handleConfirm}
              style={[
                styles.confirmButton,
                direction === 'SPEND' && styles.confirmButtonSpend,
                !canSubmit && styles.confirmButtonDisabled,
              ]}
            >
              <Text style={styles.confirmButtonText}>Confirmar Lançamento</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    backgroundColor: KAIR_THEME.colors.surfaceLowest,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: KAIR_THEME.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: KAIR_THEME.colors.textSecondary,
    fontSize: 14,
  },
  directionSwitchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  directionTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
    alignItems: 'center',
  },
  directionTabEarnActive: {
    backgroundColor: KAIR_THEME.colors.emeraldBg,
    borderColor: KAIR_THEME.colors.emeraldBorder,
  },
  directionTabSpendActive: {
    backgroundColor: KAIR_THEME.colors.indigoBg,
    borderColor: KAIR_THEME.colors.indigoBorder,
  },
  directionTabText: {
    color: KAIR_THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  directionTabTextEarnActive: {
    color: KAIR_THEME.colors.emeraldBright,
  },
  directionTabTextSpendActive: {
    color: KAIR_THEME.colors.indigoBright,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    color: KAIR_THEME.colors.textMuted,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
  },
  categoryChipActive: {
    backgroundColor: KAIR_THEME.colors.emeraldBg,
    borderColor: KAIR_THEME.colors.emeraldBorder,
  },
  categoryChipLabel: {
    color: KAIR_THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipLabelActive: {
    color: KAIR_THEME.colors.textPrimary,
  },
  categoryChipRate: {
    color: KAIR_THEME.colors.textMuted,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 11,
  },
  categoryChipRateActive: {
    color: KAIR_THEME.colors.emeraldBright,
    fontWeight: '700',
  },
  durationLayoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputBoxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: KAIR_THEME.colors.oledBlack,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  numericInput: {
    color: KAIR_THEME.colors.textPrimary,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 18,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
    padding: 0,
  },
  unitSuffix: {
    color: KAIR_THEME.colors.textMuted,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 12,
  },
  shortcutChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  shortcutChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
  },
  shortcutChipActive: {
    borderColor: KAIR_THEME.colors.emeraldBorder,
    backgroundColor: KAIR_THEME.colors.emeraldBg,
  },
  shortcutChipText: {
    color: KAIR_THEME.colors.textSecondary,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 12,
    fontWeight: '600',
  },
  shortcutChipTextActive: {
    color: KAIR_THEME.colors.emeraldBright,
  },
  previewBox: {
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  previewMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewRightCol: {
    alignItems: 'flex-end',
  },
  previewHeading: {
    color: KAIR_THEME.colors.textMuted,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  previewDeltaValue: {
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  previewProjectedValue: {
    color: KAIR_THEME.colors.textPrimary,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  warningText: {
    color: KAIR_THEME.colors.amberPrimary,
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 11,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
  },
  cancelButtonText: {
    color: KAIR_THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmButton: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: KAIR_THEME.colors.emeraldPrimary,
  },
  confirmButtonSpend: {
    backgroundColor: KAIR_THEME.colors.indigoPrimary,
  },
  confirmButtonDisabled: {
    opacity: 0.35,
  },
  confirmButtonText: {
    color: KAIR_THEME.colors.oledBlack,
    fontSize: 13,
    fontWeight: '700',
  },
});
