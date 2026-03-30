import { createFont, createTamagui } from 'tamagui';
import { tokens } from './tokens';
import { darkTheme, lightTheme } from './themes';

const pretendardFont = createFont({
  family: 'Pretendard',
  size: {
    caption: 13,
    subhead: 15,
    body: 17,
    headline: 17,
    title: 22,
    largeTitle: 34,
    true: 17, // default
  },
  weight: {
    caption: '400',
    subhead: '400',
    body: '400',
    headline: '600',
    title: '700',
    largeTitle: '700',
    true: '400', // default
  },
  lineHeight: {
    caption: 18,
    subhead: 20,
    body: 22,
    headline: 22,
    title: 28,
    largeTitle: 41,
    true: 22,
  },
  letterSpacing: {
    caption: 0,
    subhead: 0,
    body: 0,
    headline: 0,
    title: 0.35,
    largeTitle: 0.37,
    true: 0,
  },
  face: {
    400: { normal: 'Pretendard-Regular' },
    500: { normal: 'Pretendard-Medium' },
    600: { normal: 'Pretendard-SemiBold' },
    700: { normal: 'Pretendard-Bold' },
  },
});

const config = createTamagui({
  tokens,
  themes: {
    dark: darkTheme,
    light: lightTheme,
  },
  fonts: {
    body: pretendardFont,
    heading: pretendardFont,
  },
  defaultFont: 'body',
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
