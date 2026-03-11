import { createTokens } from 'tamagui';

export const tokens = createTokens({
  color: {
    // Background layers (Apple dark mode)
    bg: '#000000',
    bgElevated: '#1C1C1E',
    bgNested: '#2C2C2E',

    // Background layers (Light mode)
    bgLight: '#FFFFFF',
    bgElevatedLight: '#F2F2F7',
    bgNestedLight: '#E5E5EA',

    // Text (Dark)
    textPrimary: 'rgba(255,255,255,0.92)',
    textSecondary: 'rgba(255,255,255,0.60)',
    textTertiary: 'rgba(255,255,255,0.32)',

    // Text (Light)
    textPrimaryLight: 'rgba(0,0,0,0.88)',
    textSecondaryLight: 'rgba(0,0,0,0.56)',
    textTertiaryLight: 'rgba(0,0,0,0.36)', // 0.28 → 0.36 for WCAG AA (3:1 대형 텍스트)

    // Accent (Gold)
    accent: '#F5A623',
    accentSubtle: 'rgba(245,166,35,0.14)',
    accentPressed: '#D48E1F',
    accentDisabled: 'rgba(245,166,35,0.32)',
    accentLight: '#D4910E',

    // Accent (Gold - Light mode variants)
    accentSubtleLight: 'rgba(212,145,14,0.10)',
    accentPressedLight: '#B87A0A',
    accentDisabledLight: 'rgba(212,145,14,0.32)',

    // Interactive surfaces
    surfacePressed: 'rgba(255,255,255,0.06)',
    surfaceHover: 'rgba(255,255,255,0.04)',
    surfacePressedLight: 'rgba(0,0,0,0.04)',
    surfaceHoverLight: 'rgba(0,0,0,0.02)',

    // Separators
    separator: 'rgba(255,255,255,0.08)',
    separatorOpaque: '#38383A',
    separatorLight: 'rgba(0,0,0,0.08)',

    // Semantic
    negative: '#FF453A',
    positive: '#30D158',
    warning: '#FFD60A',

    // Utility
    transparent: 'transparent',
  },

  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    true: 16, // default spacing
  },

  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    touchMinHeight: 44,
    buttonHeight: 50,
    inputHeight: 48,
    true: 44, // default size
  },

  radius: {
    0: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
    true: 12, // default radius
  },

  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    5: 500,
  },
});
