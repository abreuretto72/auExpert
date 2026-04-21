/**
 * check-i18n-keys.ts
 *
 * Validates that every i18n key referenced by the achievements catalog
 * (titleKey / descKey) exists in BOTH pt-BR.json and en-US.json.
 *
 * Fails with exit code 1 if any key is missing — wire into CI to catch
 * missing translations before they ship.
 *
 * How to run:
 *   npx tsx scripts/check-i18n-keys.ts          (if tsx is installed)
 *   node --experimental-strip-types scripts/check-i18n-keys.ts  (Node 22+)
 *
 * Alternatively, transpile once: `npx tsc scripts/check-i18n-keys.ts`
 * then `node scripts/check-i18n-keys.js`.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── 1. Parse titleKey / descKey from the catalog source ──────────────────────
// We read lib/achievements.ts as text (not import) to avoid needing a
// TypeScript runtime or resolving React Native / Supabase deps.

const catalogSource = readFileSync(
  resolve(ROOT, 'lib/achievements.ts'),
  'utf8',
);

const keyRe = /\b(titleKey|descKey)\s*:\s*['"]([^'"]+)['"]/g;
const referencedKeys = new Set<string>();
let match: RegExpExecArray | null;
while ((match = keyRe.exec(catalogSource)) !== null) {
  referencedKeys.add(match[2]);
}

if (referencedKeys.size === 0) {
  console.error('[check-i18n-keys] ERROR: no titleKey/descKey found in lib/achievements.ts');
  process.exit(1);
}

// ── 2. Load both locale files ────────────────────────────────────────────────

const locales: Record<string, unknown> = {
  'pt-BR': JSON.parse(readFileSync(resolve(ROOT, 'i18n/pt-BR.json'), 'utf8')),
  'en-US': JSON.parse(readFileSync(resolve(ROOT, 'i18n/en-US.json'), 'utf8')),
};

// ── 3. Resolve dotted key paths ──────────────────────────────────────────────

function hasKey(tree: unknown, dottedPath: string): boolean {
  const segments = dottedPath.split('.');
  let node: unknown = tree;
  for (const seg of segments) {
    if (node === null || typeof node !== 'object' || !(seg in (node as Record<string, unknown>))) {
      return false;
    }
    node = (node as Record<string, unknown>)[seg];
  }
  return typeof node === 'string' && node.length > 0;
}

// ── 4. Check every referenced key against every locale ───────────────────────

const missing: Array<{ locale: string; key: string }> = [];
for (const key of referencedKeys) {
  for (const [locale, tree] of Object.entries(locales)) {
    if (!hasKey(tree, key)) {
      missing.push({ locale, key });
    }
  }
}

// ── 5. Report ────────────────────────────────────────────────────────────────

const total = referencedKeys.size;
if (missing.length === 0) {
  console.log(`[check-i18n-keys] OK — all ${total} catalog keys present in both locales.`);
  process.exit(0);
}

console.error(`[check-i18n-keys] FAIL — ${missing.length} missing entries (of ${total} referenced keys):`);
for (const { locale, key } of missing) {
  console.error(`  [${locale}] ${key}`);
}
process.exit(1);
