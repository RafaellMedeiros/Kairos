import { Platform } from 'react-native';

/**
 * Sistema de Design "Nocturne Ambient Dock" extraído do MCP Stitch (Projeto Kairos).
 * Calibrado para telas OLED (#000000 puro) em modo Paisagem (Landscape) para leitura a 1m+.
 */
export const KAIR_THEME = {
  colors: {
    oledBlack: '#000000',
    surfaceLowest: '#0A0A0A',
    surfaceLow: '#141414',
    surfaceContainer: '#1F1F1F',
    surfaceBright: '#2E2E2E',
    borderSubtle: '#262626',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textMuted: '#737373',
    emeraldPrimary: '#10B981',
    emeraldBright: '#34D399',
    emeraldBg: 'rgba(16, 185, 129, 0.14)',
    emeraldBorder: 'rgba(16, 185, 129, 0.35)',
    indigoPrimary: '#6366F1',
    indigoBright: '#818CF8',
    indigoBg: 'rgba(99, 102, 241, 0.14)',
    indigoBorder: 'rgba(99, 102, 241, 0.35)',
    amberPrimary: '#F59E0B',
    amberBg: 'rgba(245, 158, 11, 0.14)',
    amberBorder: 'rgba(245, 158, 11, 0.35)',
    dangerPrimary: '#EF4444',
    dangerBg: 'rgba(239, 68, 68, 0.14)',
    dangerBorder: 'rgba(239, 68, 68, 0.38)',
  },
  fonts: {
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    sans: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
} as const;
