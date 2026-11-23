# Legacy: Firebase Phone Auth (SMS OTP) — disabled

The vendor app used to sign vendors in with a Firebase Phone Auth SMS OTP.
It was replaced by **email + password** sign-in (with email OTP verification at
registration and when changing the sign-in email). The old code is kept here,
fully commented out, in case phone OTP is ever needed again. Nothing in this
folder is imported or bundled.

| File | Original location | What it was |
|---|---|---|
| `firebaseAuth.ts` | `src/core/firebase/firebaseAuth.ts` | `verifyPhoneNumber()` wrapper (send / auto-verify / confirm OTP) |
| `otp.screen.tsx` | `src/app/(auth)/otp.tsx` | 6-box OTP entry screen |
| `pending-approval.screen.tsx` | `src/app/(auth)/pending-approval.tsx` | "awaiting admin approval" screen shown after OTP |
| `useAuth.phoneOtp.ts` | `src/modules/auth/hooks/useAuth.ts` | `useSendOtp` / `useVerifyOtp` / `useResendOtp` / `useRegister` (OTP version) |

## Still in place (needed to re-enable)

- `@react-native-firebase/auth` dependency and its config plugin in `app.json`
  (kept so this change ships without a native rebuild).
- Backend `POST /api/auth/vendor/firebase-verify` (auth-service) — still live,
  because older app builds in the field call it.

## To re-enable

1. Copy each file back to its original location and remove the leading `// `
   on every line (e.g. `sed 's|^// \{0,1\}||'`), dropping the header block.
2. Restore the `otp` / `pending-approval` entries in `src/app/(auth)/_layout.tsx`
   and the `firebaseVerify` endpoint/service function.
3. Make sure the Play app-signing SHA-1/SHA-256 are registered in Firebase and the
   Android API key isn't restricted (see the `auth/app-not-authorized` history).
