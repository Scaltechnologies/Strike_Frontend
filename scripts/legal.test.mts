// scripts/legal.test.mts
// Guards for the legal deliverables. Run: node --test scripts/legal.test.mts
// Uses only Node built-ins (node:test + type stripping) — no test framework dependency.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TERMS, PRIVACY_POLICY, ACCOUNT_DELETION, ACCOUNT_DELETION_URL, ACCOUNT_DELETION_MAILTO,
  COMPANY, outstandingItems, parseInline, type LegalDocument,
} from '../src/modules/legal/legalContent.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const ALL_DOCS = [TERMS, PRIVACY_POLICY, ACCOUNT_DELETION];
const text = (d: LegalDocument) => JSON.stringify(d);
const numberedHeadings = (d: LegalDocument) =>
  d.sections.map(s => /^(\d+)\./.exec(s.heading)?.[1]).filter(Boolean).map(Number);
const subheadings = (d: LegalDocument) =>
  d.sections.flatMap(s => s.body.flatMap(b => (typeof b === 'object' && 'subheading' in b ? [b.subheading] : [])));

test('Terms sections are numbered 1–30 with no gaps, in order', () => {
  assert.deepEqual(numberedHeadings(TERMS), Array.from({ length: 30 }, (_, i) => i + 1));
});

test('Terms cross-references point at the right sections', () => {
  const heading = (n: number) => TERMS.sections.find(s => s.heading.startsWith(`${n}.`))!.heading;
  assert.match(heading(25), /Complaints and Grievance/);
  assert.match(heading(30), /Contact and Legal Information/);
  assert.match(text(TERMS), /support channel in Section 25/);
  assert.match(text(TERMS), /contact details in Section 30/);
});

test('Privacy Policy sections 1–17 and subsections are complete and ordered', () => {
  assert.deepEqual(numberedHeadings(PRIVACY_POLICY), Array.from({ length: 17 }, (_, i) => i + 1));
  const subs = subheadings(PRIVACY_POLICY).map(s => s.split(' ')[0]);
  assert.deepEqual(subs, ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9',
    '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', 'Account']);
  assert.match(text(PRIVACY_POLICY), /contact us using the details in Section 16/);
  assert.match(PRIVACY_POLICY.sections[15].heading, /^16\. Grievance Redressal and Contact/);
});

test('final documents contain no placeholders, drafts or internal drafting notes', () => {
  for (const doc of ALL_DOCS) {
    assert.equal(doc.isDraft, false, `${doc.title} is marked as a draft`);
    assert.deepEqual(outstandingItems(doc), [], `${doc.title} has unresolved placeholders`);
    for (const phrase of [
      'subject to confirmation', 'EXACT LEGAL', 'TODO', 'must be confirmed', 'should identify',
      'should be accessible', 'kept consistent with actual', 'to the extent actually used',
      'does not imply that every cookie', 'depends on the payment integration implemented',
    ]) {
      assert.ok(!text(doc).includes(phrase), `${doc.title} still contains “${phrase}”`);
    }
  }
});

test('company identity and contact details are consistent and verified', () => {
  for (const doc of [TERMS, PRIVACY_POLICY]) {
    const t = text(doc);
    assert.ok(t.includes(COMPANY.legalName), `${doc.title} does not name ${COMPANY.legalName}`);
    assert.ok(t.includes(COMPANY.registeredOffice), `${doc.title} lacks the registered office`);
    assert.ok(t.includes(COMPANY.supportPhone), `${doc.title} lacks the support phone`);
    assert.ok(!/Strike Technologies(?! Private Limited)/.test(t.replace(/STRIKE TECHNOLOGIES/g, '')),
      `${doc.title} uses a short form of the legal name`);
  }
  for (const doc of ALL_DOCS) {
    const emails = text(doc).match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
    for (const e of emails) assert.equal(e, COMPANY.supportEmail, `unexpected email ${e} in ${doc.title}`);
    const phones = text(doc).match(/\b\d{10}\b/g) ?? [];
    for (const p of phones) assert.equal(p, COMPANY.supportPhone, `unexpected phone ${p} in ${doc.title}`);
  }
});

test('privacy policy discloses each practice verified in the vendor app code', () => {
  const t = text(PRIVACY_POLICY);
  for (const w of [
    'Firebase Authentication', 'Firebase Cloud Messaging', 'bank account number', 'IFSC', 'UPI ID',
    'photo library', 'precise device location', 'camera permission', 'does not use your microphone',
  ]) assert.ok(t.includes(w), `Privacy Policy does not disclose “${w}”`);
});

test('inline parser produces bold text and actionable email, phone and web links', () => {
  const segs = parseInline(`**Email:** ${COMPANY.supportEmail} or call ${COMPANY.supportPhone}, see www.strikeapp.in.`);
  assert.deepEqual(segs.filter(s => s.kind === 'link').map(s => s.kind === 'link' && s.href), [
    `mailto:${COMPANY.supportEmail}`, `tel:${COMPANY.supportPhoneE164}`, 'https://www.strikeapp.in',
  ]);
  assert.equal(segs[0].bold, true);
  assert.equal(segs.at(-1)!.text, '.');
});

test('account deletion: real request channel, honest page, no unverified URL', () => {
  assert.ok(ACCOUNT_DELETION_MAILTO.startsWith(`mailto:${COMPANY.supportEmail}?subject=`));
  if (ACCOUNT_DELETION_URL !== null) assert.match(ACCOUNT_DELETION_URL, /^https:\/\/[^\s[\]]+$/);
  const t = text(ACCOUNT_DELETION);
  assert.ok(t.includes('Strike Vendor') && t.includes(COMPANY.legalName));
  assert.ok(t.includes('do not need the app installed'), 'must not require reinstalling the app');
  assert.ok(t.includes('may be retained'), 'must disclose retained data');
  assert.ok(text(PRIVACY_POLICY).includes('Profile → Delete Account'), 'policy must describe the in-app path');
});

test('legal routes exist, are registered, and are linked from login, signup and profile', () => {
  for (const r of ['terms', 'privacy-policy', 'account-deletion']) {
    assert.ok(existsSync(join(ROOT, `src/app/${r}.tsx`)), `missing route ${r}`);
    assert.match(read('src/app/_layout.tsx'), new RegExp(`<Stack\\.Screen name="${r}" />`));
  }
  for (const f of ['src/app/(auth)/login.tsx', 'src/app/(auth)/signup.tsx', 'src/app/(main)/(tabs)/profile.tsx']) {
    const src = read(f);
    assert.match(src, /router\.push\('\/terms'\)/, `${f} does not link to /terms`);
    assert.match(src, /router\.push\('\/privacy-policy'\)/, `${f} does not link to /privacy-policy`);
  }
  for (const f of ['src/app/(main)/(tabs)/profile.tsx', 'src/app/(auth)/pending-approval.tsx']) {
    assert.match(read(f), /router\.push\('\/account-deletion'\)/, `${f} does not link to /account-deletion`);
  }
});

test('no stale support address remains in the app', () => {
  assert.ok(!read('src/app/(auth)/pending-approval.tsx').includes('support@strike.in'));
  assert.ok(read('src/app/(auth)/pending-approval.tsx').includes(COMPANY.supportEmail));
});

test('microphone permission is not requested anywhere in the Expo config', () => {
  const cfg = JSON.parse(read('app.json')).expo;
  assert.equal(cfg.android.permissions.includes('android.permission.RECORD_AUDIO'), false);
  const plugin = (name: string) => cfg.plugins.find((p: unknown) => Array.isArray(p) && p[0] === name)[1];
  assert.equal(plugin('expo-camera').recordAudioAndroid, false);
  assert.equal(plugin('expo-image-picker').microphonePermission, false);
  assert.equal('usesCleartextTraffic' in cfg.android, false);
});

test('EAS production profile builds an Android App Bundle; preview stays an APK', () => {
  const eas = JSON.parse(read('eas.json'));
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.build.preview.android.buildType, 'apk');
});

test('app.json wires the icon assets, keeps the package ID and Firebase config', () => {
  const cfg = JSON.parse(read('app.json')).expo;
  const notif = cfg.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-notifications')[1];
  for (const p of [cfg.icon, cfg.android.adaptiveIcon.foregroundImage, cfg.android.adaptiveIcon.monochromeImage, notif.icon]) {
    assert.ok(p && existsSync(join(ROOT, p)), `missing asset ${p}`);
  }
  assert.equal(cfg.android.adaptiveIcon.backgroundColor, '#FFFFFF');
  assert.equal(cfg.android.package, 'com.strike.frontend');
  assert.equal(cfg.android.googleServicesFile, './google-services.json');
  assert.equal(cfg.extra.eas.projectId, '208fbff4-8198-43ba-b48d-f85c9c3f5353');
});
