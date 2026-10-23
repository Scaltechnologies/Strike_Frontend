# STRIKE legal documents — internal verification checklist

**Internal. Do not publish.** Prepared 22 October 2026 for Strike Technologies Private Limited management and legal counsel. This is not a legal opinion; both documents need sign-off from qualified Indian counsel before publication.

Sources:
- Terms & Conditions: the revised text supplied in the release request (22 October 2026).
- Privacy Policy: `STRIKE_Privacy_Policy.pdf` (Effective/Last Updated 22 October 2026).
- `Strike_PP_TC_Draft_Review_Report.docx` (used as a checklist only).

The text shown in the app and in `legal-site/` / `legal-docs/` comes from `src/modules/legal/legalContent.ts`.

## 1. Verified facts

| Fact | Value used | Evidence |
|---|---|---|
| Legal entity | Strike Technologies Private Limited | Confirmed by management in the release request |
| Registered office | Flat No. 305, Tirumala Enclave Apartment, Chirala, Prakasam, Bapatla District, Andhra Pradesh, India – 523155 | Supplied Terms §31 |
| Support email | support.striketechnologies@gmail.com | Release request; supplied Terms §31; supplied Privacy Policy §16; strikeapp.in web bundle (9 references) |
| Support phone | 8143604709 | Release request; supplied Terms §31 |
| Website | https://www.strikeapp.in | HTTP 200 on 22 Oct 2026 (single-page app titled "strike-user") |
| Vendor-app sign-in | Google Firebase Authentication, phone OTP | `src/core/firebase/firebaseAuth.ts` |
| Push notifications | Firebase Cloud Messaging token + platform, device name, app version | `pushRegistration.ts`, `notification.types.ts` |
| Payout data | Bank account number, holder name, IFSC or UPI ID; last-used details saved | `wallet.types.ts` |
| Location | Foreground only, during signup auto-detect; manual entry possible | `signup.tsx` (only `expo-location` call site) |
| Camera | QR scanning only; no photo capture | `pay-at-store-scan.tsx` (`CameraView` barcode scanning) |
| Photos | Store banner from photo library, compressed before upload | `BannerPicker.tsx` |
| Microphone | Not used; `RECORD_AUDIO` stripped from the manifest | `app.json`; prebuild manifest shows `tools:node="remove"` |
| Session storage | Tokens in encrypted secure storage; cleared on sign-out | `secureStorage.ts` |
| Analytics / ads / crash SDKs | None in the vendor app | `package.json` dependencies |

## 2. Editorial corrections made

### Terms & Conditions
- Removed "subject to confirmation of the exact registered legal name below" (the entity name is now confirmed).
- **Renumbered sections.** The source skipped §11. Old §12–31 are now §11–30, and the cross-references were updated: "Section 26" → "Section 25", and §25 now points to §30 for contact details.
- Split the sections that ran together (§18/19 and §28/29 in the source).
- §5: added the lead-in "Membership-specific terms may include:" before the bullet list.
- §4: removed one sentence that repeated a bullet ("You must promptly notify STRIKE … unauthorised access or use").
- Fixed spacing: "Limited .Except" → "Limited. Except".
- §19 (old §20): removed "to the extent actually used" and replaced the drafting note "The Privacy Policy should identify…" with a statement.
- §24 (old §25): replaced the drafting note "should be accessible … kept consistent with actual app…" with a statement.
- §25 (old §26): corrected "within the manner and timelines" to "in the manner and within the timelines".
- Added "Last updated: 22 October 2026" (the date of this revision), because §26 refers to a "Last Updated" date.

### Privacy Policy
- "Strike Technologies" → "Strike Technologies Private Limited" (§1, §16).
- §2: the vendor bullet now explicitly includes users of the STRIKE Vendor app.
- **§3.5:** "scanning of vendor QR codes" → "vendor or customer QR codes". The vendor app scans customer QR codes.
- **New §3.9 "STRIKE Vendor App":** discloses the verified vendor-app data practices (section 1 above). The source did not mention bank/UPI payout details, photo-library access, push tokens or Firebase phone OTP.
- §4 item 13: added "process vendor payouts".
- **Removed internal drafting notes:**
  - §3.4: "The actual handling … depends on the payment integration implemented…"
  - §5: "This section does not imply that every cookie…"
  - §8: "The availability of an in-app deletion function … must be confirmed before the application is published."
- §6.3: replaced "The actual providers … will depend on its deployed technical infrastructure" with the providers verified in the vendor app (Firebase Authentication, Firebase Cloud Messaging).
- §8 Account Deletion: replaced the reference to an unspecified "deletion facility" and "external deletion-request mechanism" with the real channel. Requests go by email to the support address, and the vendor app has a Profile → Delete Account shortcut that prepares that email.
- §16: added the full legal name, registered office, phone and website, so contact details match the Terms.
- Omitted the cover-page tagline "Privacy, transparency and responsible use of personal information."

## 3. Unresolved — company must confirm (not stated in the public documents)
1. **Public URLs (Google Play blocker).** strikeapp.in has no legal pages. Its footer shows "Privacy Policy" and "Terms of Service" with no link targets, and every path returns the same app shell. Deploy `legal-site/privacy-policy.html`, `terms.html` and `account-deletion.html` to HTTPS URLs, then set `ACCOUNT_DELETION_URL` in `legalContent.ts`.
2. **Account deletion operations.** Requests arrive by email. Confirm that the support team can actually delete or anonymise a vendor's data in every backend service (vendor, store, menu, cards, notifications, withdrawals), and decide a target timeline. There is no deletion API in the vendor app, and the backend wasn't available to verify.
3. **Grievance Officer.** Neither document names one; Privacy Policy §16 says details will be published if an appointment is required. Counsel should confirm whether the IT Rules, 2011 (Rule 5(9)) and the Consumer Protection (E-Commerce) Rules, 2020 require a named officer now.
4. **Registered office.** The address names both "Prakasam" and "Bapatla District". Chirala was moved to Bapatla district in the 2022 reorganisation. Verify against the MCA record.
5. **Razorpay and Google sign-in** (Privacy Policy §3.1, §3.4, §6.2). Not present in the vendor app or in the strikeapp.in web bundle. Confirm the customer app uses them.
6. **"Applicable Cancellation and Refund Policy"** (Terms §29). No separate policy was supplied. Publish one or amend the reference.
7. **Vendor/Partner Agreement.** The Terms are customer-oriented. Commission, payouts, Pay-at-Store collection and settlement are not covered, as the review report also notes.
8. **Minimum age** (Terms §3). Confirm STRIKE's actual age policy, especially for vendors.
9. **Terms effective date.** Set "Last updated" to 22 October 2026; confirm, or provide a separate effective date.
10. **Play Store names.** Confirm the store listing app name ("Strike Vendor" in `app.json`) and developer name. The deletion page must match them.
11. **Consent records.** Login and signup show passive notice text linking to both documents. No acceptance is recorded, and the registration API has no consent field.
12. **Data safety form.** Declare the vendor-app data types in section 1. The final merged manifest should be checked for `AD_ID` once a build exists.

## 4. Items for legal review
- Terms §3 (minors), §12 (refunds), §21 (limitation of liability), §27 (jurisdiction: no seat specified).
- Privacy Policy §4 (lawful bases and consent), §12–13 (rights and DPDP Act commencement), §14 (cross-border transfers).
- Whether a vendor-specific agreement is required (item 7).
