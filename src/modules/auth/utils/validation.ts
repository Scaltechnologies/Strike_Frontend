// src/modules/auth/utils/validation.ts
//
// Client-side mirrors of the backend rules (RegisterVendorRequest,
// VendorCredentialService.validateNewPassword) so errors show while typing.
// The backend remains the source of truth.

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

// Deliberately simple — "something@something.tld", no spaces. Same shape the
// backend's @Email(regexp=…) accepts.
export const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const isValidEmail = (email: string): boolean =>
  email.trim().length <= 254 && EMAIL_REGEX.test(email.trim());

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;

export interface PasswordRule {
  id: 'length' | 'letter' | 'number';
  label: string;
  met: boolean;
}

export const passwordRules = (password: string): PasswordRule[] => [
  {
    id: 'length',
    label: `${PASSWORD_MIN}–${PASSWORD_MAX} characters`,
    met: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
  },
  { id: 'letter', label: 'At least one letter', met: /[A-Za-z]/.test(password) },
  { id: 'number', label: 'At least one number', met: /\d/.test(password) },
];

export const isStrongPassword = (password: string): boolean =>
  passwordRules(password).every(r => r.met);
