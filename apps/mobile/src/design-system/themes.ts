import { tokens } from './tokens';

export const darkTheme = {
  background: tokens.color.bg,
  backgroundHover: tokens.color.surfaceHover,
  backgroundPress: tokens.color.surfacePressed,
  backgroundFocus: tokens.color.surfaceHover,

  color: tokens.color.textPrimary,
  colorHover: tokens.color.textPrimary,
  colorPress: tokens.color.textPrimary,

  borderColor: tokens.color.separator,
  borderColorHover: tokens.color.separatorOpaque,
  borderColorPress: tokens.color.separatorOpaque,
  borderColorFocus: tokens.color.accent,

  placeholderColor: tokens.color.textTertiary,
  shadowColor: 'rgba(0,0,0,0.5)',

  // Custom semantic tokens
  colorSecondary: tokens.color.textSecondary,
  colorTertiary: tokens.color.textTertiary,
  backgroundElevated: tokens.color.bgElevated,
  backgroundNested: tokens.color.bgNested,
  accentColor: tokens.color.accent,
  accentColorSubtle: tokens.color.accentSubtle,
  accentColorPress: tokens.color.accentPressed,
  accentColorDisabled: tokens.color.accentDisabled,
  separatorColor: tokens.color.separator,
  negativeColor: tokens.color.negative,
  positiveColor: tokens.color.positive,
  warningColor: tokens.color.warning,
} as const;

export const lightTheme = {
  background: tokens.color.bgLight,
  backgroundHover: tokens.color.surfaceHoverLight,
  backgroundPress: tokens.color.surfacePressedLight,
  backgroundFocus: tokens.color.surfaceHoverLight,

  color: tokens.color.textPrimaryLight,
  colorHover: tokens.color.textPrimaryLight,
  colorPress: tokens.color.textPrimaryLight,

  borderColor: tokens.color.separatorLight,
  borderColorHover: tokens.color.separatorLight,
  borderColorPress: tokens.color.separatorLight,
  borderColorFocus: tokens.color.accentLight,

  placeholderColor: tokens.color.textTertiaryLight,
  shadowColor: 'rgba(0,0,0,0.1)',

  // Custom semantic tokens
  colorSecondary: tokens.color.textSecondaryLight,
  colorTertiary: tokens.color.textTertiaryLight,
  backgroundElevated: tokens.color.bgElevatedLight,
  backgroundNested: tokens.color.bgNestedLight,
  accentColor: tokens.color.accentLight,
  accentColorSubtle: tokens.color.accentSubtleLight,
  accentColorPress: tokens.color.accentPressedLight,
  accentColorDisabled: tokens.color.accentDisabledLight,
  separatorColor: tokens.color.separatorLight,
  negativeColor: tokens.color.negative,
  positiveColor: tokens.color.positive,
  warningColor: tokens.color.warning,
} as const;
