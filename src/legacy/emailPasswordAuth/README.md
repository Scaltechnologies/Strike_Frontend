# Legacy: email + password sign-in — disabled

From Nov 2026 the vendor app briefly signed vendors in with **email + password**
(generated password emailed on approval, forced change, email OTP via Brevo).
It was replaced by **mobile number + 4-digit PIN** (Firebase phone OTP at
registration and for "Forgot PIN"), which is easier for vendors who don't use email.

The old code is kept here, fully commented out. Nothing in this folder is
imported or bundled.

| File | Original location |
|---|---|
| `login.emailPassword.screen.tsx` | `src/app/(auth)/login.tsx` |
| `signup.emailPassword.screen.tsx` | `src/app/(auth)/signup.tsx` |
| `forgot-password.screen.tsx` | `src/app/(auth)/forgot-password.tsx` |
| `change-password.screen.tsx` | `src/app/change-password.tsx` |
| `change-email.screen.tsx` | `src/app/change-email.tsx` |
| `PasswordField.tsx` | `src/modules/auth/components/PasswordField.tsx` |
| `EmailVerification.tsx` | `src/modules/auth/components/EmailVerification.tsx` |
| `useAuth.emailPassword.ts` | `src/modules/auth/hooks/useAuth.ts` |
| `authService.emailPassword.ts` | `src/modules/auth/services/authService.ts` |

## Still in place

- Backend endpoints `/api/auth/vendor/register`, `/signin`, `/forgot-password`,
  `/change-password`, `/email-otp/*`, `/change-email/*` (auth-service) and the
  Brevo mail path — still live, but the app no longer calls them.
- Vendors who already have a password have no PIN yet: on sign-in they get
  `PIN_NOT_SET` and set one via **Forgot PIN?** (phone OTP).

## To re-enable

Copy each file back to its original location, drop the 5-line header and remove
the leading `// ` on every line (e.g. `tail -n +6 f | sed 's|^// \{0,1\}||'`).
Then restore the endpoints in `src/core/api/endpoints.ts`, the types in
`auth.types.ts`, the storage helpers (`setMustChangePassword`, `saveSignInEmail`)
and the routes in the layouts and Profile.
