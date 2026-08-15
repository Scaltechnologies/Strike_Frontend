import {
  Manrope_200ExtraLight,
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

export const MANROPE_FONTS = {
  Manrope_200ExtraLight,
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
};

export const DEFAULT_FONT_FAMILY = 'Manrope_400Regular';

const FONT_FAMILY_BY_WEIGHT: Record<string, string> = {
  '100': 'Manrope_200ExtraLight',
  '200': 'Manrope_200ExtraLight',
  '300': 'Manrope_300Light',
  '400': 'Manrope_400Regular',
  normal: 'Manrope_400Regular',
  '500': 'Manrope_500Medium',
  '600': 'Manrope_600SemiBold',
  '700': 'Manrope_700Bold',
  bold: 'Manrope_700Bold',
  '800': 'Manrope_800ExtraBold',
  '900': 'Manrope_800ExtraBold',
};

export function getFontFamilyForWeight(fontWeight?: string | number | null): string {
  if (fontWeight == null) return DEFAULT_FONT_FAMILY;
  return FONT_FAMILY_BY_WEIGHT[String(fontWeight)] ?? DEFAULT_FONT_FAMILY;
}
