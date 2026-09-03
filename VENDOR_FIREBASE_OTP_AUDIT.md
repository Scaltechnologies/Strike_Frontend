# Vendor App — Firebase OTP Readiness Audit

**Scope:** Read-only inspection. No files were modified, created (other than this report), or deleted. No packages installed. No config changed.
**Repo:** `strike_frontend` (Vendor App only — the "User App" referenced in the task is a separate repository and was not inspected).
**Date:** 2026-08-27

---

## 1. Vendor App Structure & Component Responsibilities

| Area | File | Responsibility |
|---|---|---|
| Auth screens | [src/app/(auth)/welcome.tsx](src/app/(auth)/welcome.tsx) | Static landing screen, single CTA → `/(auth)/login` |
| | [src/app/(auth)/login.tsx](src/app/(auth)/login.tsx) | Phone number entry (10-digit, +91 fixed prefix). Calls `useSendOtp`. Links to signup. |
| | [src/app/(auth)/signup.tsx](src/app/(auth)/signup.tsx) | Vendor registration form (business info, contact, geo-location). Calls `useRegister`. |
| | [src/app/(auth)/otp.tsx](src/app/(auth)/otp.tsx) | 6-digit OTP entry (segmented boxes). Calls `useVerifyOtp`. Has a "Resend OTP" link with **no `onPress` handler wired** — currently dead. |
| | [src/app/(auth)/pending-approval.tsx](src/app/(auth)/pending-approval.tsx) | Terminal screen for any non-ACTIVE vendor status post-verification. Only action is logout. |
| | [src/app/(auth)/_layout.tsx](src/app/(auth)/_layout.tsx) | `Stack` navigator wiring the 5 screens above (headers hidden). |
| Auth hooks | [src/modules/auth/hooks/useAuth.ts](src/modules/auth/hooks/useAuth.ts) | Three hooks: `useSendOtp`, `useVerifyOtp`, `useRegister`. Each owns its own `loading`/`error` local state (no shared context) and drives navigation directly via `expo-router`'s `router`. |
| Auth API layer | [src/modules/auth/services/authService.ts](src/modules/auth/services/authService.ts) | Thin axios wrappers: `sendOtp`, `verifyOtp`, `registerVendor`. No Firebase code anywhere in this module. |
| Auth types | [src/modules/auth/types/auth.types.ts](src/modules/auth/types/auth.types.ts) | `VendorAuthResponse`, `RegisterVendorRequest`, `AuthTokens`, etc. |
| Vendor profile | [src/modules/vendor/services/vendorProfileService.ts](src/modules/vendor/services/vendorProfileService.ts) + [vendor.types.ts](src/modules/vendor/types/vendor.types.ts) | `getVendorProfile`, `getVendorProfileStatus` (GET `/api/vendor/profile`, `/api/vendor/profile/status`). Called only from the Profile screens, not from the auth/boot flow. |
| API client | [src/core/api/axiosInstance.ts](src/core/api/axiosInstance.ts) | Single shared axios instance. Request interceptor attaches `Authorization: Bearer <token>`. Response interceptor: handles 503 (maintenance), 401 (refresh-then-retry, one queue for concurrent 401s), network/timeout retry for idempotent GETs, and normalizes all errors to `Error` with `.status`/`.code`. |
| Endpoint constants | [src/core/api/endpoints.ts](src/core/api/endpoints.ts) | Central map of every backend path. Vendor auth block currently has `register`, `login`, `verify` only — **no `firebase-verify` entry yet**. |
| Token storage | [src/core/storage/secureStorage.ts](src/core/storage/secureStorage.ts) | `expo-secure-store` on native, `window.localStorage` on web. Keys: `access_token`, `refresh_token`, `auth_user`. Exposes `saveTokens`, `getAccessToken`, `getRefreshToken`, `clearTokens`, `saveUser`/`getUser`/`clearUser`, `clearAll`. |
| Navigation / routing | [src/app/_layout.tsx](src/app/_layout.tsx), [src/app/index.tsx](src/app/index.tsx) | `expo-router` file-based routing. Root stack has only `index` and `(auth)`; `(main)` is reached via `router.replace` from `index.tsx`/`useVerifyOtp`, not declared as a sibling `Stack.Screen` in the root layout. |
| Protected routes | — | **No dedicated guard component/HOC exists.** Gating is purely: (a) `index.tsx` checks token presence once at cold start, (b) `axiosInstance`'s 401 interceptor reactively redirects to `/(auth)/login` if a refresh fails. There is no route-level check preventing a deep link straight into a `(main)` screen. |
| Logout | [src/app/(main)/(tabs)/profile.tsx](src/app/(main)/(tabs)/profile.tsx) (`handleLogout`), [src/app/(auth)/pending-approval.tsx](src/app/(auth)/pending-approval.tsx) | Both call `clearAll()` then `router.replace('/(auth)/welcome')`. Profile screen additionally best-effort deregisters the push token and resets the notification store first. |
| Refresh-token handling | [src/core/api/axiosInstance.ts:66-117](src/core/api/axiosInstance.ts#L66-L117) | Lives entirely inside the response interceptor — not a separate module/hook. On 401 (excluding `/api/auth/*` calls themselves) it calls `POST /api/auth/refresh` with the stored refresh token, saves the new pair, retries the original request once, and queues any other concurrent 401s behind the same refresh call. |
| Firebase config | — | **None found anywhere in the repo.** See §5. |
| Environment config | [.env](.env) | Only `EXPO_PUBLIC_API_URL`. No Firebase env vars. Falls back to `https://api.strikeapp.in` if unset, with a `__DEV__` console warning. |

---

## 2. Current Vendor OTP Flow — Exact Trace

```
LOGIN (existing vendor):
login.tsx (phone entry, 10 digits)
  → useSendOtp.handleSendOtp(mobileNumber)
    → authService.sendOtp(mobileNumber)
      → POST /api/auth/vendor/login  { mobileNumber }   [endpoints.auth.vendor.login]
    → router.push('/(auth)/otp', { phoneNumber: mobileNumber })
otp.tsx (6-digit entry)
  → useVerifyOtp.handleVerifyOtp(mobileNumber, otp, bannerUri?)
    → authService.verifyOtp(mobileNumber, otp)
      → POST /api/auth/vendor/verify  { mobileNumber, otp }   [endpoints.auth.vendor.verify]
      ← VendorAuthResponse { token, refreshToken, expiresIn, vendorId, hotelName,
                              mobileNumber, email, address, status, message }
    if status === 'ACTIVE':
      → saveTokens({ accessToken: response.token, refreshToken: response.refreshToken })
        → secureStorage: SecureStore.setItemAsync('access_token'/'refresh_token', …)
      → (best-effort) uploadStoreBanner(bannerUri) if a banner was picked at signup
      → router.replace('/(main)/home')
    else (PENDING / VERIFIED / SUSPENDED / REJECTED):
      → router.replace('/(auth)/pending-approval')   [no token stored]
```

```
REGISTRATION (new vendor):
signup.tsx (business info form)
  → useRegister.handleRegister(payload, bannerUri?)
    → authService.registerVendor(payload)
      → POST /api/auth/vendor/register  { hotelName, address, mobileNumber, email?, latitude, longitude }
    → router.push('/(auth)/otp', { phoneNumber: payload.mobileNumber, bannerUri })
  ↓ (joins the OTP verification path above — same otp.tsx / useVerifyOtp / POST /api/auth/vendor/verify)
```

**Exact files/functions/state involved:**
- Functions: `sendOtp`, `verifyOtp`, `registerVendor` (authService.ts); `useSendOtp`, `useVerifyOtp`, `useRegister` (useAuth.ts).
- State: `phoneNumber` (login.tsx local state), `otp: string[]` (otp.tsx local state, 6 boxes), each hook's own `loading`/`error`.
- Storage: `saveTokens` writes `access_token` + `refresh_token` via `expo-secure-store` (native) / `localStorage` (web).
- Navigation: all via `expo-router`'s `router.push`/`router.replace`, no navigation library abstraction layer.

**OTP is currently 100% backend-driven** — the frontend never generates, displays, or validates an OTP value itself; it only forwards whatever 6 digits the user types to `POST /api/auth/vendor/verify` and reacts to the response.

---

## 3. Mock / Hardcoded OTP — Search Result

**No mock OTP, hardcoded OTP value, or development bypass exists anywhere in this frontend codebase.** Searched all of `src/` for OTP-adjacent hardcoding, test values, and dev-bypass patterns — none found in the auth module or elsewhere. The `MOCK_*` constants that do exist in the repo (`customer_history.tsx`, `notifications/mocks/mockNotifications.ts`) are unrelated (customer/transaction and notification test fixtures, gated by `USE_MOCK_NOTIFICATIONS`).

**Implication:** whatever "mock OTP" the task refers to must live in the **backend** (e.g., the vendor-service auth endpoint currently accepting a fixed test code instead of dispatching real SMS in non-prod). There is nothing in this repo to preserve or remove — the instruction "do not remove the existing mock OTP" has no corresponding frontend artifact. Flagging this explicitly rather than assuming.

---

## 4. Actual Vendor API Calls — As Implemented Today

| Purpose | Method | URL | Request Body | Headers | Response Handling | Error Handling |
|---|---|---|---|---|---|---|
| Vendor register | POST | `/api/auth/vendor/register` | `{ hotelName, address, mobileNumber, email?, latitude, longitude }` | `Content-Type: application/json` (no auth token needed — none exists yet) | Fire-and-forget (`void`); success → navigate to OTP screen | Thrown error caught in `useRegister`, message shown inline via `error` state |
| Vendor login (send OTP) | POST | `/api/auth/vendor/login` | `{ mobileNumber }` | same | Fire-and-forget; success → navigate to OTP screen | Same pattern in `useSendOtp` |
| Vendor OTP verify | POST | `/api/auth/vendor/verify` | `{ mobileNumber, otp }` | same | Returns `VendorAuthResponse` **directly** (not wrapped in the app's usual `ApiResponse<T>` envelope, per the comment in authService.ts) — branches on `response.status` | Same pattern in `useVerifyOtp` |
| Refresh | POST | `/api/auth/refresh` | `{ refreshToken }` | plain axios call (bypasses `axiosInstance`'s interceptors to avoid recursion) | Accepts either `{data:{token/accessToken, refreshToken}}` or unwrapped shape | On failure: clears session, redirects to `/(auth)/login` |
| Logout | — | `/api/auth/logout` exists in `endpoints.ts` | — | — | **Not actually called anywhere in the code.** Logout is purely local: `clearAll()` + redirect. The backend logout endpoint is defined but unused. |
| Vendor profile | GET | `/api/vendor/profile` | — | Bearer token (via interceptor) | `ApiResponse<VendorProfileResponse>`, unwrapped to `.data.data` | Standard axios interceptor error shaping |
| Vendor status | GET | `/api/vendor/profile/status` | — | Bearer token | `ApiResponse<VendorProfileStatus>` → `{ status, rejectionReason, commissionRate }` | Same |

**Comparison with the new backend endpoint `POST /api/auth/vendor/firebase-verify`:**
It slots in as a **direct sibling of `/api/auth/vendor/verify`** — same request pattern (no auth header needed pre-login), and per the task's own description it returns the same `VendorAuthResponse` shape that `verify` already returns and that `useVerifyOtp`/`secureStorage` already know how to consume. No new response-handling code is needed, only a new request body shape (`{ idToken }` instead of `{ mobileNumber, otp }`).

---

## 5. Firebase Setup Inspection

| Check | Result |
|---|---|
| `package.json` dependencies | **No Firebase package of any kind** — not `firebase`, not `@react-native-firebase/*`, not `expo-firebase-*`. |
| Firebase initialization code | None found anywhere in `src/`. |
| `google-services.json` / `GoogleService-Info.plist` | Not present anywhere in the repo. |
| `app.json` plugins | `expo-router`, `expo-font`, `expo-location`, `expo-secure-store`, `expo-status-bar`, `expo-image-picker`, `expo-notifications`, `expo-camera`. No Firebase/google-services config plugin. |
| Android application ID | `com.strike.frontend` ([app.json:17](app.json#L17)) — this is the identifier that would need to match a registered Firebase Android app. |
| iOS bundle ID | `com.strike.frontend` ([app.json:22](app.json#L22)) |
| Native `android`/`ios` folders | **Do not exist** — this is a pure managed Expo project (no prebuild output checked in). |
| `eas.json` | Only `preview` (APK) and `production` build profiles. **No `development` profile** (`developmentClient: true`) is configured. |
| Environment variables | Only `EXPO_PUBLIC_API_URL` in `.env`. No `EXPO_PUBLIC_FIREBASE_*` or equivalent. |
| Expo Go usage | The project currently runs in **Expo Go**, confirmed by project history (see §9/Risks) — `expo-dev-client` was previously added for push notifications and had to be reverted because its mere presence breaks Expo Go project-wide. |

**Conclusion: Firebase is entirely unwired in this repo — 0% present, not partially configured.** Nothing to "verify" for correctness; the audit is a from-scratch gap list, not a bug list.

---

## 6. Reuse vs. the User App's Firebase Implementation

The User App is confirmed to be **outside this repository** and was not inspected (per task scope and CLAUDE.md rules for this session). Because this repo has **zero** Firebase code, there is nothing here to diff against a working pattern — the comparison the task asks for cannot be performed from inside this repo alone.

### Reusable from Vendor App
- **Nothing Firebase-specific** (there is no Firebase code here to reuse).
- Non-Firebase pieces that *are* reusable as-is: `secureStorage.ts` (token persistence), `axiosInstance.ts` (Bearer header + refresh-on-401), the `VendorAuthResponse` type/status-branching logic in `useVerifyOtp`, and the OTP-entry UI (`otp.tsx`) as a shell — it can keep its 6-box UI and simply be re-driven by Firebase's `confirmationResult.confirm(code)` instead of an API call, if the design calls for client-side Firebase verification before hitting the backend.

### Missing from Vendor App
- Firebase SDK dependency (see §7 for which one).
- Firebase app initialization/config.
- `google-services.json` (Android) and any iOS equivalent.
- Phone Auth request flow (send-OTP-via-Firebase call, reCAPTCHA/App Check verifier if using the JS SDK, or native flow if using React Native Firebase).
- OTP confirmation call against Firebase (`confirmationResult.confirm(code)` equivalent).
- ID token retrieval (`getIdToken()` equivalent) after Firebase sign-in succeeds.
- The new `firebase-verify` endpoint call and its wiring into `authService.ts`/`endpoints.ts`.
- Resend-OTP logic (the UI stub exists but has never been wired to anything, Firebase or otherwise).

### Different from User App
- Cannot be determined without access to that repository. Flagging as unknown rather than guessing.

### Must NOT be copied blindly
- Whatever native-module-based Firebase integration (e.g., `@react-native-firebase/auth`) the User App may use **cannot** be dropped into this repo unchanged, because this Vendor App has no native `android`/`ios` project and runs on Expo Go — see §9 Risks. If the User App relies on React Native Firebase, this repo would need an EAS dev-client build first, which is a materially bigger step than "add a package."

---

## 7. Token / Session Handling

| Behavior | Current implementation |
|---|---|
| Access token storage | `SecureStore` (native) / `localStorage` (web), key `access_token` |
| Refresh token storage | Same mechanism, key `refresh_token` |
| Expiration handling | No client-side expiry tracking (`expiresIn` from `VendorAuthResponse` is received but **never stored or used**) — the app relies entirely on the backend returning 401 when the token is actually expired. |
| Logout | `clearAll()` deletes both tokens + the `auth_user` key; no server-side logout call is made (`/api/auth/logout` exists in `endpoints.ts` but is unused) |
| Persistence across app restart | Yes — `index.tsx` reads `getAccessToken()` on boot and routes to `(main)/home` if present, `(auth)/welcome` otherwise. No validity check against the backend at boot (a stale/expired-but-present token still routes into the main app; the first failing API call is what triggers the 401→refresh→redirect cycle). |
| Axios Authorization header | Automatically attached by the request interceptor on every call, when a token exists |
| Refresh on 401/expiry | Yes, in `axiosInstance.ts` — single in-flight refresh with a queue for concurrent 401s, one retry per original request, hard redirect to login on refresh failure |

**Can `VendorAuthResponse` from the new Firebase endpoint plug in without changes?**
**Yes.** The type already matches exactly what the task describes the backend returning (`token`, `refreshToken`, `expiresIn`, `vendorId`, `hotelName`, `mobileNumber`, `email`, `address`, `status`, `message` — see [auth.types.ts:9-20](src/modules/auth/types/auth.types.ts#L9-L20)), and `useVerifyOtp`'s status-branch + `saveTokens` call requires zero modification to consume it. This was verified against the actual frontend code, not assumed.

---

## 8. Registration Flow — Current Behavior (Verified)

**The current sequence is (B): registration details → backend → OTP.**

Exact order:
1. `signup.tsx` collects `hotelName`, `address`, `email`, `mobileNumber`, `latitude`/`longitude` (plus an optional banner image, uploaded later).
2. `useRegister.handleRegister` calls `POST /api/auth/vendor/register` with the full payload — **this happens before any OTP is sent or verified.**
3. On success (regardless of what the backend returns — the response is not even read, `registerVendor` returns `void`), the app navigates straight to `otp.tsx`, carrying `phoneNumber` and `bannerUri` as route params.
4. From there it's identical to the login OTP path: `verifyOtp(mobileNumber, otp)` → `POST /api/auth/vendor/verify`.

So today, a vendor account is created in the backend **before** their phone number is ever proven via OTP. The OTP step currently only gates *login/session issuance*, not account creation. This matters for the Firebase redesign: if Firebase Phone Auth becomes the source of a verified phone number, it needs to decide whether to move *before* step 2 (verify-then-register) or stay after (register-then-verify) — the task explicitly says not to redesign this yet, so it's called out here as a decision point, not resolved.

---

## 9. Vendor Status Handling — Current Behavior (Verified)

| Question | Answer |
|---|---|
| Does the app already handle PENDING / VERIFIED / ACTIVE / REJECTED / SUSPENDED? | Partially. `VendorAuthResponse.status` and `VendorProfileStatus.status` both type all five values. |
| Which screen is shown for each? | Only a binary branch exists: `ACTIVE` → `(main)/home`; **every other status** (`PENDING`, `VERIFIED`, `SUSPENDED`, `REJECTED`) → the same generic `pending-approval.tsx` screen, which is worded only for the "awaiting first approval" case (see its copy: "Your store registration is under review"). A `SUSPENDED` or `REJECTED` vendor sees this same screen with copy that doesn't accurately describe their situation. |
| What happens when no JWT is returned? | Handled — the non-ACTIVE branch in `useVerifyOtp` never calls `saveTokens`, so no token is stored and the vendor stays logged out, landing on `pending-approval.tsx` with no session. |
| What happens after login? | Vendor lands directly on `(main)/home` if `status === 'ACTIVE'` at verify time — no separate status re-check call is made immediately after. |
| What happens if an ACTIVE vendor gets suspended mid-session? | **Nothing proactively gates them.** There is no polling or push-driven re-check of vendor status. They keep using the app with their still-valid JWT until either (a) the backend itself starts rejecting their JWT/requests server-side, which would surface as a normal API error (not necessarily a 401 → could just be a generic error toast), or (b) they navigate to the Profile tab, which does call `getVendorProfileStatus()` and renders a "SUSPENDED"/"REJECTED" badge color — but this is informational only, it does not log them out or block navigation. |
| Is vendor profile/status fetched after authentication? | Only lazily, when the vendor opens `my-profile.tsx` or the Profile tab ([profile.tsx](src/app/(main)/(tabs)/profile.tsx)) — never automatically on login or app boot. |

---

## 10. Firebase Client SDK — Which One Applies Here

**Determined, not assumed:** this project uses **plain Expo managed workflow, running in Expo Go, with no native `android`/`ios` folders and no dev-client build profile configured.** This directly constrains the Firebase SDK choice:

- **React Native Firebase (`@react-native-firebase/app` + `/auth`)** — the most common choice for native Phone Auth — requires native modules (auto-linking + `google-services.json`), which means it **cannot run in Expo Go**. Using it would require reintroducing `expo-dev-client`, adding the `development` profile back to `eas.json`, and producing/installing a custom dev-client build. This is exactly the situation the project deliberately backed out of once already for `expo-notifications` (see Risks below) — Expo Go breaks project-wide (not just for the new feature) the moment a native-module package like this is added.
- **Firebase Web/JS SDK (`firebase` npm package, modular v9+)** — phone auth in React Native requires a reCAPTCHA-based verifier (historically `expo-firebase-recaptcha`, now largely unmaintained / not compatible with SDK 56-era Expo and React 19). This path is Expo-Go-friendly in principle but the recaptcha-verifier ecosystem for RN is thin and would need real evaluation before committing.
- **`expo-firebase-*` convenience packages** — do not exist as a maintained line for Phone Auth; not a real option.

No package is currently installed, so **nothing here is "wired correctly" or "incorrectly" — it is simply absent**, and the SDK choice is a decision this audit surfaces rather than makes.

---

## 11. Target Vendor Firebase Flow (Proposed — Not Implemented)

```
Vendor enters phone number (login.tsx, reused)
  ↓
Firebase Phone Auth sends OTP  [NEW — SDK TBD per §10]
  ↓
Vendor enters OTP (otp.tsx, reused UI)
  ↓
Firebase verifies OTP client-side  [NEW]
  ↓
Firebase User → ID Token (getIdToken())  [NEW]
  ↓
authService: POST /api/auth/vendor/firebase-verify { idToken }  [NEW — sibling of verifyOtp()]
  ↓
Backend returns VendorAuthResponse  [UNCHANGED SHAPE — already supported]
  ↓
saveTokens({ accessToken: response.token, refreshToken: response.refreshToken })  [UNCHANGED — reused as-is]
  ↓
status === 'ACTIVE' → router.replace('/(main)/home')     [UNCHANGED]
status !== 'ACTIVE' → router.replace('/(auth)/pending-approval')  [UNCHANGED]
```

---

## Files That Need Modification (once implementation is approved)

- [src/modules/auth/services/authService.ts](src/modules/auth/services/authService.ts) — add a `firebaseVerify(idToken)` function calling the new endpoint.
- [src/core/api/endpoints.ts](src/core/api/endpoints.ts) — add `auth.vendor.firebaseVerify: '/api/auth/vendor/firebase-verify'`.
- [src/modules/auth/hooks/useAuth.ts](src/modules/auth/hooks/useAuth.ts) — new hook (or extend `useVerifyOtp`) to drive the Firebase confirm → `firebaseVerify` → `saveTokens` sequence.
- [src/app/(auth)/login.tsx](src/app/(auth)/login.tsx) — swap `sendOtp` for a Firebase `signInWithPhoneNumber`-equivalent call; needs a reCAPTCHA/App-Check container if using the JS SDK.
- [src/app/(auth)/otp.tsx](src/app/(auth)/otp.tsx) — swap `handleVerifyOtp`'s target from the REST call to `confirmationResult.confirm(code)` → then the new `firebaseVerify` call; also where "Resend OTP" would finally get wired up, if in scope.
- `app.json` / `eas.json` — **only if** the React Native Firebase path is chosen (config plugin + dev-client profile). Not needed for the JS SDK path.
- `package.json` — new Firebase dependency (package choice per §10).
- New: a Firebase init module (e.g. `src/core/firebase/firebaseConfig.ts`) — does not exist today.

## Files That Must NOT Be Modified

- [src/core/storage/secureStorage.ts](src/core/storage/secureStorage.ts) — token storage contract is already compatible; no reason to touch.
- [src/core/api/axiosInstance.ts](src/core/api/axiosInstance.ts) — refresh/401 handling is orthogonal to how the initial token was obtained; unaffected by switching to Firebase.
- [src/modules/auth/services/authService.ts](src/modules/auth/services/authService.ts) existing exports `sendOtp`, `verifyOtp`, `registerVendor` — must remain for the legacy OTP path to keep working per the task's explicit requirement.
- [src/app/(auth)/pending-approval.tsx](src/app/(auth)/pending-approval.tsx), vendor profile/status services, dashboard, cards, redemption, ledger, notifications modules — all downstream of "already authenticated," unaffected.
- Anything under the (main) group — no changes needed there at all.

## Firebase Packages

No package is currently installed. Recommendation is a decision for the user/team, not this audit, but the two real options are laid out in §10 with the key constraint being: **this repo has no native folders and runs on Expo Go today; a native-module SDK (React Native Firebase) forces a dev-client build, which was explicitly deferred once already for the same underlying reason during the notifications feature.**

## Registration Strategy

The existing register-then-OTP sequence (§8) creates an account before phone ownership is proven. Introducing Firebase Phone Auth does not by itself require reordering this — Firebase verification could simply replace what happens on the OTP screen, keeping "register → navigate to OTP → verify via Firebase → firebase-verify call" as a drop-in swap of the *verification mechanism only*, leaving vendor-approval semantics (PENDING/VERIFIED/ACTIVE/etc., set server-side after admin review) completely untouched. Reordering to verify-before-register is a separate product decision, explicitly out of scope for this audit per the task instructions.

## Token Strategy

The Firebase ID token is a client-side proof of phone ownership only — it is never stored or treated as a session token. It is sent once to `POST /api/auth/vendor/firebase-verify`, the backend verifies it via Firebase Admin and performs the existing vendor lookup/status logic, and the response is the same `VendorAuthResponse` the app already fully supports. No new token type needs to be introduced into `secureStorage.ts`.

## Risks

1. **Expo Go vs. native modules** — the single biggest risk. If React Native Firebase is chosen, this project will lose Expo Go compatibility again, exactly as it did (and reverted from) during the notifications feature. That reversion broke an unrelated screen (`BannerPicker.tsx`/`expo-image-manipulator`) project-wide, not just the new feature — same blast-radius risk applies here.
2. **No `development` EAS profile exists** — one would need to be added and a dev-client APK built/distributed to every developer before native Firebase Phone Auth could even be tested locally.
3. **Registration-before-verification ordering** (§8) — worth a deliberate decision before wiring Firebase in, since Firebase could plausibly move phone verification earlier in the flow; the task says not to redesign this now, so it's a known open question, not a blocker today.
4. **Vendor status handling is coarse** (§9) — all non-ACTIVE statuses funnel into one generically-worded screen, and there's no active re-check if an ACTIVE vendor is later suspended. Not caused by the Firebase change, but worth knowing since the new endpoint will hit the exact same status branch.
5. **"Resend OTP" is currently a dead UI element** with no handler — if Firebase Phone Auth is wired up, this is a natural moment to either implement it (Firebase supports resend) or knowingly leave it non-functional; flagging so it's not assumed to already work.
6. **Backend mock OTP location is unverified from this repo** (§3) — since nothing mock-related exists on the frontend, confirm with backend what "existing mock OTP" refers to before assuming it's safe to leave alone from the frontend side (it already is, structurally — there's simply nothing here to remove).
7. **User App comparison is incomplete** (§6) — that repo wasn't available to inspect, so "reusable/different/must-not-copy" conclusions about its actual Firebase implementation are necessarily partial.

## Implementation Order (once approved — not started)

1. Confirm Firebase SDK choice with the team, explicitly weighing the Expo Go/dev-client tradeoff (§10, Risk 1–2).
2. Register `com.strike.frontend` as the Android (and iOS, if applicable) app in the Firebase console; obtain `google-services.json` only if the native SDK path is chosen.
3. Add the chosen Firebase dependency to `package.json`; add required env vars to `.env`/`.env.local` (mirroring the existing `EXPO_PUBLIC_API_URL` pattern).
4. Create a Firebase init module (new file, e.g. `src/core/firebase/firebaseConfig.ts`).
5. If native SDK: reintroduce `expo-dev-client` + `eas.json` `development` profile, build and distribute a dev-client APK to the team (this step alone is non-trivial and should be sequenced deliberately, not silently).
6. Add `auth.vendor.firebaseVerify` to `endpoints.ts` and `firebaseVerify(idToken)` to `authService.ts`.
7. Wire `login.tsx` to trigger Firebase's phone sign-in instead of `sendOtp`.
8. Wire `otp.tsx` to confirm via Firebase, then call `firebaseVerify`, reusing `useVerifyOtp`'s existing status-branch/`saveTokens`/navigation logic unchanged.
9. Decide and implement "Resend OTP" behavior on the OTP screen (currently unwired).
10. Manually test all five vendor statuses end-to-end through the new path, plus confirm the legacy `/api/auth/vendor/login` + `/verify` path still works unmodified side-by-side.
11. Only after the above is validated, revisit whether the mock OTP referenced in the task (backend-side, per §3) needs any backend-side change — out of scope for this frontend repo either way.

---

**End of audit. No implementation performed. Awaiting review before any code changes.**
