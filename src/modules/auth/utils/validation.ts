// src/modules/auth/utils/validation.ts
//
// Client-side mirrors of the backend rules (VendorPhoneRegisterRequest,
// VendorPinService.validatePin) so errors show while typing. The backend
// remains the source of truth.

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export const isValidMobile = (mobile: string): boolean => INDIAN_MOBILE_REGEX.test(mobile.trim());

// Deliberately simple — "something@something.tld", no spaces. Same shape the
// backend's @Pattern accepts. Email is optional contact info only.
export const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const isValidEmail = (email: string): boolean =>
  email.trim().length <= 254 && EMAIL_REGEX.test(email.trim());

// ── 4-digit PIN ─────────────────────────────────────────────────────────

export const PIN_LENGTH = 4;

/** All the same digit (1111) or a straight run (1234 / 4321) — the backend rejects these. */
export const isTooSimplePin = (pin: string): boolean => {
  if (pin.length !== PIN_LENGTH) return false;
  let same = true, up = true, down = true;
  for (let i = 1; i < pin.length; i++) {
    const d = pin.charCodeAt(i) - pin.charCodeAt(i - 1);
    same = same && d === 0;
    up = up && d === 1;
    down = down && d === -1;
  }
  return same || up || down;
};

/** User-facing problem with a complete PIN, or null when it's fine. */
export const pinProblem = (pin: string): string | null => {
  if (!/^\d{4}$/.test(pin)) return 'PIN must be 4 digits.';
  if (isTooSimplePin(pin)) return 'This PIN is too easy to guess. Avoid PINs like 1111 or 1234.';
  return null;
};
