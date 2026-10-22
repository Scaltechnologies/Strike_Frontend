// scripts/export-legal-html.mts
// Exports the in-app legal documents (src/modules/legal/legalContent.ts) to standalone,
// print-ready HTML pages for public hosting (Google Play needs a public Privacy Policy URL and
// an account-deletion URL), plus a JSON copy consumed by scripts/export-legal-docx.py.
//
//   node scripts/export-legal-html.mts           → writes legal-site/*.html and legal-docs/legal-documents.json
//   node scripts/export-legal-html.mts --final   → refuses to export while any document is a draft
//
// PDF: print each HTML page with a headless browser, e.g.
//   msedge --headless --no-pdf-header-footer --print-to-pdf=legal-docs/privacy-policy.pdf legal-site/privacy-policy.html
//
// Requires Node >= 22.18 / 23.6 (built-in TypeScript type stripping). No dependencies.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEGAL_DOCUMENTS, COMPANY, outstandingItems, parseInline,
  type LegalBlock, type LegalDocument,
} from '../src/modules/legal/legalContent.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_DIR = join(ROOT, 'legal-site');
const DOCS_DIR = join(ROOT, 'legal-docs');
const FILES = {
  terms: 'terms.html',
  privacy: 'privacy-policy.html',
  accountDeletion: 'account-deletion.html',
} as const;
const final = process.argv.includes('--final');

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inline = (s: string) =>
  parseInline(s).map(seg => {
    const body = esc(seg.text);
    const text = seg.bold ? `<strong>${body}</strong>` : body;
    return seg.kind === 'link' ? `<a href="${esc(seg.href)}">${text}</a>` : text;
  }).join('');

const block = (b: LegalBlock) => {
  if (typeof b === 'string') return `<p>${inline(b)}</p>`;
  if ('subheading' in b) return `<h3>${esc(b.subheading)}</h3>`;
  if ('numbered' in b) return `<ol>${b.numbered.map(x => `<li>${inline(x)}</li>`).join('')}</ol>`;
  return `<ul>${b.bullets.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`;
};

function render(doc: LegalDocument): string {
  const draft = doc.isDraft || outstandingItems(doc).length > 0;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>STRIKE — ${esc(doc.title)}</title>
${draft ? '<meta name="robots" content="noindex">\n' : ''}<style>
  :root { --text:#1A1A1A; --text2:#5A6272; --text3:#9BA3AF; --primary:#CC2200; --bg:#F6F7FA; --warn:#D97706; --warnSoft:#FFFBEB; }
  body { margin:0; background:var(--bg); color:var(--text2); font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { max-width:760px; margin:0 auto; padding:32px 16px 64px; background:#fff; min-height:100vh; box-sizing:border-box; }
  h1 { color:var(--text); font-size:28px; margin:0 0 4px; }
  h2 { color:var(--text); font-size:19px; margin:28px 0 8px; }
  h3 { color:var(--text); font-size:16px; margin:18px 0 6px; }
  strong { color:var(--text); }
  a { color:var(--primary); word-break:break-word; }
  .meta { color:var(--text3); font-size:14px; margin:0; }
  .draft { background:var(--warnSoft); border:1px solid #F3D19C; border-radius:10px; padding:12px 14px; margin:16px 0; font-weight:600; }
  li { margin-bottom:6px; } ul li::marker { color:var(--primary); }
  footer { margin-top:40px; padding-top:16px; border-top:1px solid #EAECEF; font-size:13px; color:var(--text3); }
  @media print {
    body { background:#fff; font-size:11pt; }
    main { max-width:none; padding:0; min-height:0; }
    h2, h3 { break-after:avoid; }
    li, p { break-inside:avoid; }
    a { color:var(--text); text-decoration:none; }
  }
</style>
</head>
<body>
<main>
<p class="meta">STRIKE · ${esc(COMPANY.legalName)}</p>
<h1>${esc(doc.title)}</h1>
${doc.effectiveDate ? `<p class="meta">Effective date: ${esc(doc.effectiveDate)}</p>\n` : ''}<p class="meta">Last updated: ${esc(doc.lastUpdated)}</p>
${draft ? '<div class="draft">DRAFT — pending confirmation. Do not publish.</div>\n' : ''}${doc.sections.map(s => `<h2>${esc(s.heading)}</h2>\n${s.body.map(block).join('\n')}`).join('\n')}
<footer>© 2026 ${esc(COMPANY.legalName)}</footer>
</main>
</body>
</html>
`;
}

let blocked = false;
mkdirSync(SITE_DIR, { recursive: true });
mkdirSync(DOCS_DIR, { recursive: true });
for (const [key, doc] of Object.entries(LEGAL_DOCUMENTS)) {
  const missing = outstandingItems(doc);
  if (final && (missing.length > 0 || doc.isDraft)) {
    blocked = true;
    console.error(`✖ ${doc.title}: not exportable as final — isDraft=${doc.isDraft}, ${missing.length} unresolved item(s)`);
    continue;
  }
  const file = join(SITE_DIR, FILES[key as keyof typeof FILES]);
  writeFileSync(file, render(doc), 'utf8');
  console.log(`✔ ${doc.title} → ${file}${doc.isDraft ? '  (DRAFT)' : ''}`);
}
// Structured copy for the DOCX generator (inline markup pre-parsed so Python needn't re-implement it).
const forDocx = Object.fromEntries(Object.entries(LEGAL_DOCUMENTS).map(([key, doc]) => [key, {
  ...doc,
  company: COMPANY,
  sections: doc.sections.map(s => ({
    heading: s.heading,
    body: s.body.map(b =>
      typeof b === 'string' ? { paragraph: parseInline(b) }
        : 'subheading' in b ? b
        : 'numbered' in b ? { numbered: b.numbered.map(parseInline) }
        : { bullets: b.bullets.map(parseInline) }),
  })),
}]));
writeFileSync(join(DOCS_DIR, 'legal-documents.json'), JSON.stringify(forDocx, null, 2), 'utf8');
process.exit(blocked ? 1 : 0);
