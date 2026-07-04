import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const i18nDir = join(__dirname, '..', 'src', 'i18n');
const enPath = join(i18nDir, 'en.json');

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, prefix + k + '.'));
    } else {
      keys.push(prefix + k);
    }
  }
  return keys;
}

const en = JSON.parse(readFileSync(enPath, 'utf8'));
const enKeys = new Set(flattenKeys(en));
const files = readdirSync(i18nDir).filter(f => f.endsWith('.json') && f !== 'en.json');

let exitCode = 0;

for (const f of files) {
  const lang = JSON.parse(readFileSync(join(i18nDir, f), 'utf8'));
  const langKeys = new Set(flattenKeys(lang));
  const missing = [...enKeys].filter(k => !langKeys.has(k));
  const extra = [...langKeys].filter(k => !enKeys.has(k));

  if (missing.length > 0) {
    console.error(`\n  Missing in ${f}:`);
    missing.forEach(k => console.error('    - ' + k));
    exitCode = 1;
  }
  if (extra.length > 0) {
    console.error(`\n  Extra in ${f}:`);
    extra.forEach(k => console.error('    + ' + k));
    exitCode = 1;
  }
}

if (exitCode === 0) {
  console.log(`All ${files.length} locale files have complete key parity with en.json`);
}
process.exit(exitCode);
