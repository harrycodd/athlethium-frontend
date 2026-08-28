import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#09090b',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceMuted: '#f4f4f5',
    primary: '#16a34a',
    primaryGlow: 'rgba(22, 163, 74, 0.25)',
    textSecondary: '#71717a',
    border: 'rgba(0, 0, 0, 0.08)',
    borderHighlight: 'rgba(0, 0, 0, 0.35)',
    borderPrimary: 'rgba(22, 163, 74, 0.35)',
    glass: {
      background: 'rgba(255, 255, 255, 0.80)',
      backgroundElevated: 'rgba(255, 255, 255, 0.95)',
      border: 'rgba(0, 0, 0, 0.08)',
      borderHighlight: 'rgba(0, 0, 0, 0.16)',
      shadow: 'rgba(0, 0, 0, 0.04)',
    }
  },
  dark: {
    text: '#f8fafc',
    background: '#101012',
    surface: '#18181b',
    surfaceMuted: '#202024',
    primary: '#22c55e',
    primaryGlow: 'rgba(34, 197, 94, 0.30)',
    textSecondary: '#a1a1aa',
    border: 'rgba(255, 255, 255, 0.12)',
    borderHighlight: 'rgba(255, 255, 255, 0.35)',
    borderPrimary: 'rgba(34, 197, 94, 0.45)',
    glass: {
      background: 'rgba(24, 24, 28, 0.75)',
      backgroundElevated: 'rgba(32, 32, 36, 0.85)',
      border: 'rgba(255, 255, 255, 0.12)',
      borderHighlight: 'rgba(255, 255, 255, 0.24)',
      shadow: 'rgba(0, 0, 0, 0.6)',
    }
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Standardized Coggan Power & Intensity Zones
export interface IntensityZoneToken {
  name: string;
  shortName: string;
  zone: string;
  bg: string;
  border: string;
  text: string;
  glow: string;
}

export const IntensityZones: Record<number, IntensityZoneToken> = {
  [-1]: {
    name: 'Rest Day',
    shortName: 'Rest',
    zone: 'Z0',
    bg: 'rgba(100, 116, 139, 0.15)',
    border: 'rgba(100, 116, 139, 0.35)',
    text: '#94a3b8',
    glow: 'rgba(100, 116, 139, 0.2)',
  },
  1: {
    name: 'Active Recovery',
    shortName: 'Recovery',
    zone: 'Z1',
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.35)',
    text: '#22d3ee',
    glow: 'rgba(6, 182, 212, 0.25)',
  },
  2: {
    name: 'Endurance Base',
    shortName: 'Endurance',
    zone: 'Z2',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    text: '#34d399',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  3: {
    name: 'Tempo / Sweet Spot',
    shortName: 'Tempo',
    zone: 'Z3',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.35)',
    text: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
  4: {
    name: 'Threshold',
    shortName: 'Threshold',
    zone: 'Z4',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.35)',
    text: '#fb923c',
    glow: 'rgba(249, 115, 22, 0.25)',
  },
  5: {
    name: 'VO2 Max',
    shortName: 'VO2 Max',
    zone: 'Z5',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.35)',
    text: '#f87171',
    glow: 'rgba(239, 68, 68, 0.25)',
  },
  6: {
    name: 'Anaerobic Capacity',
    shortName: 'Anaerobic',
    zone: 'Z6',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.35)',
    text: '#c084fc',
    glow: 'rgba(168, 85, 247, 0.25)',
  },
  7: {
    name: 'Neuromuscular Sprint',
    shortName: 'Sprint',
    zone: 'Z7',
    bg: 'rgba(236, 72, 153, 0.15)',
    border: 'rgba(236, 72, 153, 0.35)',
    text: '#f472b6',
    glow: 'rgba(236, 72, 153, 0.25)',
  },
};

export const getIntensityZoneToken = (intensity?: number): IntensityZoneToken => {
  if (intensity === undefined || intensity === null) {
    return IntensityZones[2];
  }
  return IntensityZones[intensity] || IntensityZones[2];
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 20,
  xxl: 24,
  full: 9999,
  pill: 9999,
} as const;

export const BorderWidth = {
  hairline: 1,
  thin: 1.5,
  regular: 2,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
