import { tokens } from './tokens';

export const lightTheme = {
  background: tokens.color.bg,
  backgroundHover: tokens.color.surfaceHover,
  backgroundPress: tokens.color.surfacePressed,
  backgroundFocus: tokens.color.surfaceHover,

  color: tokens.color.textPrimary,
  colorHover: tokens.color.textPrimary,
  colorPress: tokens.color.textPrimary,

  borderColor: tokens.color.border,
  borderColorHover: tokens.color.border,
  borderColorPress: tokens.color.border,
  borderColorFocus: tokens.color.ring,

  placeholderColor: tokens.color.mutedForeground,
  shadowColor: 'rgba(26,26,26,0.08)',

  // Custom semantic tokens
  colorSecondary: tokens.color.textSecondary,
  colorTertiary: tokens.color.textTertiary,
  backgroundElevated: tokens.color.bgElevated,
  backgroundNested: tokens.color.bgNested,
  primaryColor: tokens.color.primary,
  primaryForeground: tokens.color.primaryForeground,
  secondaryColor: tokens.color.secondary,
  accentColor: tokens.color.accent,
  accentColorSubtle: tokens.color.muted,
  accentColorPress: tokens.color.primary,
  accentColorDisabled: tokens.color.mutedForeground,
  separatorColor: tokens.color.separator,
  negativeColor: tokens.color.destructive,
  positiveColor: tokens.color.success,
  warningColor: tokens.color.warning,
} as const;

export const darkTheme = {
  background: tokens.color.bgDark,
  backgroundHover: tokens.color.surfaceHoverDark,
  backgroundPress: tokens.color.surfacePressedDark,
  backgroundFocus: tokens.color.surfaceHoverDark,

  color: tokens.color.textPrimaryDark,
  colorHover: tokens.color.textPrimaryDark,
  colorPress: tokens.color.textPrimaryDark,

  borderColor: tokens.color.borderDark,
  borderColorHover: tokens.color.borderDark,
  borderColorPress: tokens.color.borderDark,
  borderColorFocus: tokens.color.bg,

  placeholderColor: tokens.color.textSecondaryDark,
  shadowColor: 'rgba(0,0,0,0.3)',

  // Custom semantic tokens
  colorSecondary: tokens.color.textSecondaryDark,
  colorTertiary: tokens.color.textTertiaryDark,
  backgroundElevated: tokens.color.bgElevatedDark,
  backgroundNested: tokens.color.bgNestedDark,
  primaryColor: tokens.color.primaryForeground,
  primaryForeground: tokens.color.primary,
  secondaryColor: tokens.color.bgNestedDark,
  accentColor: tokens.color.bgNestedDark,
  accentColorSubtle: tokens.color.bgElevatedDark,
  accentColorPress: tokens.color.bg,
  accentColorDisabled: tokens.color.textSecondaryDark,
  separatorColor: tokens.color.separatorDark,
  negativeColor: tokens.color.destructive,
  positiveColor: tokens.color.success,
  warningColor: tokens.color.warning,
} as const;
