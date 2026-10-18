import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StandbyClock } from '../components/StandbyClock.tsx';
import { KAIR_THEME } from '../components/theme.ts';

/**
 * Tela de Descanso Relógio de Bancada (Dock Standby) conforme MCP Stitch.
 */
export const StandbyScreen: React.FC = () => {
  return (
    <View style={styles.standbyContainer}>
      <StandbyClock />
    </View>
  );
};

const styles = StyleSheet.create({
  standbyContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: KAIR_THEME.colors.oledBlack,
  },
});
