// src/modules/cards/cardVisuals.ts
// Deterministic accent color per card so a vendor's cards read as distinct
// at a glance (same card id always maps to the same color). Flat, single
// solid colors — no gradients — pulled from the app's own default palette
// (see DS in cards.tsx) rather than arbitrary hues, so cards stay on-brand.

const CARD_ACCENTS: readonly string[] = [
  '#CC2200', // primary
  '#C17B2F', // accent (gold)
  '#991A00', // primary dark
  '#16A34A', // success
  '#D97706', // warning
  '#DC2626', // error
] as const;

export function getCardAccent(cardId: number): string {
  const index = Math.abs(cardId) % CARD_ACCENTS.length;
  return CARD_ACCENTS[index];
}
