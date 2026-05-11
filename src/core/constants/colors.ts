// src/core/constants/colors.ts

const Colors = {
  primary: '#CC2200',
  accent: '#C17B2F',
  bgWarm: '#FEF0E6',
  bgCard: '#FFFFFF',
  bgInput: '#F2F2F2',
  textDark: '#1A1A1A',
  textMuted: '#888888',
  textPlaceholder: '#BBBBBB',
  borderPrimary: '#CC2200',
  white: '#FFFFFF',
  black: '#000000',
  circleLight: '#F9CDB8',
  circleMid: '#F2A98A',
} as const;

export type ColorKey = keyof typeof Colors;
export default Colors;