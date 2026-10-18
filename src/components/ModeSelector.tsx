import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ActivityCategory } from '../domain/types.ts';
import { useAppStore } from '../stores/useAppStore.ts';
import { KAIR_THEME } from './theme.ts';

interface CategoryOption {
  readonly id: ActivityCategory;
  readonly label: string;
  readonly badge: string | null;
  readonly isLeisure?: boolean;
}

const CATEGORY_OPTIONS: ReadonlyArray<CategoryOption> = [
  { id: 'STUDY', label: 'Estudo', badge: '+50%' },
  { id: 'MAINTENANCE', label: 'Manutenção', badge: '+25%' },
  { id: 'WORK', label: 'Trabalho', badge: '+50%' },
  { id: 'LEISURE', label: 'Gastar Lazer', badge: null, isLeisure: true },
];

/**
 * Barra inferior discreta (~10% da altura) com as 4 pílulas de atividade,
 * fiel ao rodapé da tela "Dashboard Dock Tablet OLED Paisagem" do Stitch.
 */
export const ModeSelector: React.FC = () => {
  const activeCategory = useAppStore((s) => s.activeCategory);
  const timerStatus = useAppStore((s) => s.timerState.status);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);

  const isLocked = timerStatus !== 'IDLE';

  return (
    <View style={styles.footerContainer}>
      <View style={[styles.pillNavBar, isLocked && styles.pillNavBarLocked]}>
        {CATEGORY_OPTIONS.map((option) => {
          const isSelected = activeCategory === option.id;
          const isLeisure = Boolean(option.isLeisure);

          return (
            <Pressable
              key={option.id}
              disabled={isLocked}
              onPress={() => setActiveCategory(option.id)}
              style={({ pressed }) => [
                styles.pillButton,
                isLeisure && !isSelected && styles.pillButtonLeisureIdle,
                isSelected &&
                  (isLeisure
                    ? styles.pillButtonLeisureActive
                    : styles.pillButtonFocusActive),
                pressed && !isLocked && styles.pillPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isLocked }}
              accessibilityLabel={`${option.label}${option.badge ? ` ${option.badge}` : ''}`}
            >
              <View
                style={[
                  styles.pillDot,
                  isSelected
                    ? {
                        backgroundColor: isLeisure
                          ? KAIR_THEME.colors.indigoBright
                          : KAIR_THEME.colors.emeraldBright,
                      }
                    : isLeisure
                      ? { backgroundColor: KAIR_THEME.colors.indigoPrimary }
                      : { backgroundColor: KAIR_THEME.colors.textMuted },
                ]}
              />

              <Text
                style={[
                  styles.pillLabel,
                  isLeisure && !isSelected && styles.pillLabelLeisureIdle,
                  isSelected &&
                    (isLeisure
                      ? styles.pillLabelLeisureActive
                      : styles.pillLabelFocusActive),
                ]}
              >
                {option.label}
              </Text>

              {option.badge !== null && (
                <Text
                  style={[
                    styles.pillBadge,
                    isSelected && styles.pillBadgeActive,
                  ]}
                >
                  {option.badge}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 14,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  pillNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    padding: 6,
    borderRadius: 999,
    backgroundColor: KAIR_THEME.colors.surfaceLowest,
    borderWidth: 1,
    borderColor: KAIR_THEME.colors.borderSubtle,
  },
  pillNavBarLocked: {
    opacity: 0.6,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillButtonFocusActive: {
    backgroundColor: KAIR_THEME.colors.surfaceLow,
    borderColor: KAIR_THEME.colors.emeraldBorder,
  },
  pillButtonLeisureIdle: {
    borderColor: 'rgba(99, 102, 241, 0.22)',
  },
  pillButtonLeisureActive: {
    backgroundColor: KAIR_THEME.colors.indigoBg,
    borderColor: KAIR_THEME.colors.indigoBorder,
  },
  pillPressed: {
    transform: [{ scale: 0.96 }],
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillLabel: {
    color: KAIR_THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pillLabelFocusActive: {
    color: KAIR_THEME.colors.emeraldBright,
  },
  pillLabelLeisureIdle: {
    color: KAIR_THEME.colors.indigoBright,
  },
  pillLabelLeisureActive: {
    color: KAIR_THEME.colors.textPrimary,
  },
  pillBadge: {
    fontFamily: KAIR_THEME.fonts.mono,
    fontSize: 11,
    color: KAIR_THEME.colors.textMuted,
    fontWeight: '600',
  },
  pillBadgeActive: {
    color: KAIR_THEME.colors.emeraldPrimary,
  },
});
