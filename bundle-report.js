#!/usr/bin/env node
/**
 * Bundle analysis report for HashWatch2.
 *
 * Usage:
 *   node bundle-report.js [path/to/bundle.js]
 *
 * If no path is given the script looks for dist/bundle.js (Expo web output).
 * It scans the source tree to report module counts per category, lazy vs eager
 * screen breakdown, and a concise summary line.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

// ---------------------------------------------------------------------------
// 1. Source-tree scan – count modules per category
// ---------------------------------------------------------------------------
function countFiles(dir, ext) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).length;
}

const screens = countFiles(path.join(SRC, 'screens'), '.tsx');
const components = countFiles(path.join(SRC, 'components'), '.tsx');
const stores = countFiles(path.join(SRC, 'store'), '.ts');
const utils = countFiles(path.join(SRC, 'utils'), '.ts');

// ---------------------------------------------------------------------------
// 2. Lazy vs eager screen analysis (reads AppNavigator.tsx)
// ---------------------------------------------------------------------------
const navPath = path.join(SRC, 'navigation', 'AppNavigator.tsx');
const navSrc = fs.readFileSync(navPath, 'utf-8');

// Lazy screens: lines matching  `const XxxScreen = lazy(() =>`
const lazyMatches = navSrc.match(/^const \w+Screen\s*=\s*lazy\(/gm) || [];
const lazyCount = lazyMatches.length;

// Eager screens: direct imports like  `import { XxxScreen } from '../screens/...'`
const eagerImportMatches = navSrc.match(/^import\s*\{[^}]*\}\s*from\s*['"]\.\.\/screens\//gm) || [];
const eagerCount = eagerImportMatches.length;

const totalScreens = screens;
const lazyScreenPercent = totalScreens > 0 ? ((lazyCount / totalScreens) * 100).toFixed(0) : 0;

// ---------------------------------------------------------------------------
// 3. Optional: parse an actual bundle for byte-size info
// ---------------------------------------------------------------------------
const bundleArg = process.argv[2];
let bundleSize = null;
let bundleModules = null;

if (bundleArg && fs.existsSync(bundleArg)) {
  const content = fs.readFileSync(bundleArg);
  bundleSize = content.length;
  // Rough module count: count occurrences of "__d(function" (Metro format)
  const dMatches = content.toString().match(/__d\(function/g);
  bundleModules = dMatches ? dMatches.length : null;
}

// ---------------------------------------------------------------------------
// 4. Print report
// ---------------------------------------------------------------------------
const line = '-'.repeat(56);

console.log('');
console.log('  HashWatch2 — Bundle Report');
console.log(line);

console.log('\n  Module counts (src/)');
console.log(`    Screens .............. ${screens}`);
console.log(`    Components ........... ${components}`);
console.log(`    Stores ............... ${stores}`);
console.log(`    Utils ................ ${utils}`);
console.log(`    Total (categories) ... ${screens + components + stores + utils}`);

console.log('\n  Screen loading strategy');
console.log(`    Eagerly loaded ....... ${eagerCount}  (initial route)`);
console.log(`    Lazy-loaded .......... ${lazyCount}  (${lazyScreenPercent}% of screens)`);
console.log(`    Total screens ........ ${totalScreens}`);

if (bundleSize !== null) {
  const kb = (bundleSize / 1024).toFixed(1);
  const mb = (bundleSize / (1024 * 1024)).toFixed(2);
  console.log(`\n  Bundle size ........... ${kb} kB (${mb} MB)`);
}
if (bundleModules !== null) {
  console.log(`  Bundle modules ........ ${bundleModules}`);
}

console.log(`\n${line}`);
const parts = [];
parts.push(`${screens + components + stores + utils} src modules`);
parts.push(`${eagerCount} eager + ${lazyCount} lazy screens`);
if (bundleSize !== null) parts.push(`${(bundleSize / 1024).toFixed(0)} kB`);
console.log(`  Summary: ${parts.join(' | ')}`);
console.log(line);
console.log('');
