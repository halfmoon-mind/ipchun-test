import { createTokens } from 'tamagui';

export const tokens = createTokens({
  color: {
    // Background layers (Light — editorial warm off-white)
    bg: '#FDFCF9',
    bgElevated: '#FFFFFF',
    bgNested: '#F5F2ED',

    // Background layers (Dark)
    bgDark: '#1A1A1A',
    bgElevatedDark: '#2A2A2A',
    bgNestedDark: '#333333',

    // Text (Light)
    textPrimary: '#1A1A1A',
    textSecondary: '#777777',
    textTertiary: '#E5E2DC',

    // Text (Dark)
    textPrimaryDark: '#FDFCF9',
    textSecondaryDark: 'rgba(253,252,249,0.60)',
    textTertiaryDark: 'rgba(253,252,249,0.32)',

    // Primary (Monochromatic black)
    primary: '#1A1A1A',
    primaryForeground: '#FFFFFF',

    // Secondary
    secondary: '#F5F2ED',
    secondaryForeground: '#1A1A1A',

    // Accent
    accent: '#E8E5DF',
    accentForeground: '#1A1A1A',

    // Muted
    muted: '#F5F2ED',
    mutedForeground: '#777777',

    // Border / Input
    border: '#E5E2DC',
    input: '#E5E2DC',
    ring: '#1A1A1A',

    // Dark mode borders
    borderDark: '#333333',
    inputDark: '#333333',

    // Interactive surfaces
    surfacePressed: 'rgba(26,26,26,0.04)',
    surfaceHover: 'rgba(26,26,26,0.02)',
    surfacePressedDark: 'rgba(255,255,255,0.06)',
    surfaceHoverDark: 'rgba(255,255,255,0.04)',

    // Separators
    separator: '#E5E2DC',
    separatorDark: '#333333',

    // Semantic
    destructive: '#DC2626',
    destructiveForeground: '#FFFFFF',
    success: '#22C55E',
    successForeground: '#FFFFFF',
    warning: '#F59E0B',
    warningForeground: '#FFFFFF',

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
    sm: 0,
    md: 0,
    lg: 0,
    xl: 0,
    full: 9999,
    true: 0, // default radius — editorial zero-radius
  },

  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    5: 500,
  },
});
