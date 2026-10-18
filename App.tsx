import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { KAIR_THEME } from './src/components/theme.ts';
import { useHardwareSetup } from './src/hooks/useHardwareSetup.ts';
import { useTimerTick } from './src/hooks/useTimerTick.ts';
import { MainScreen } from './src/screens/MainScreen.tsx';
import { StandbyScreen } from './src/screens/StandbyScreen.tsx';
import { useAppStore } from './src/stores/useAppStore.ts';

const AppViewport: React.FC = () => {
  const insets = useSafeAreaInsets();
  const screenMode = useAppStore((s) => s.screenMode);

  // Garante respeito total à barra de status superior e à barra de navegação/taskbar nativa do tablet Android
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0
  );
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 52 : 12
  );
  const leftInset = Math.max(insets.left, 12);
  const rightInset = Math.max(insets.right, 12);

  return (
    <View
      style={[
        styles.appViewport,
        {
          paddingTop: topInset,
          paddingBottom: bottomInset,
          paddingLeft: leftInset,
          paddingRight: rightInset,
        },
      ]}
    >
      {screenMode === 'STANDBY' ? <StandbyScreen /> : <MainScreen />}
    </View>
  );
};

/**
 * Ponto de entrada da aplicação Kairos (TempoDock).
 * Utiliza SafeAreaProvider (react-native-safe-area-context) para posicionar toda a view
 * estritamente dentro da área útil, acima da barra de navegação nativa do tablet.
 */
export default function App(): React.JSX.Element {
  useHardwareSetup();
  useTimerTick();

  return (
    <SafeAreaProvider style={styles.rootProvider}>
      <StatusBar style="light" />
      <AppViewport />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootProvider: {
    flex: 1,
    backgroundColor: KAIR_THEME.colors.oledBlack,
  },
  appViewport: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: KAIR_THEME.colors.oledBlack,
  },
});
