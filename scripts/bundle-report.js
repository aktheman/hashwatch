#!/usr/bin/env node

/**
 * Bundle Report — reads Metro stats JSON (from --stats-output) and prints a
 * human-readable top-20 modules table plus per-package rollup.
 *
 * Usage:
 *   npx expo export --platform web --stats-output dist/stats.json
 *   node scripts/bundle-report.js [dist/stats.json]
 *
 * If no path is given the script looks for dist/stats.json then dist/_expo/stats.json.
 */

const fs = require('fs');
const path = require('path');

// ── locate stats file ──────────────────────────────────────────────────────

const candidates = [
  process.argv[2],
  'dist/stats.json',
  'dist/_expo/stats.json',
].filter(Boolean);

const statsPath = candidates.find(p => fs.existsSync(p));

if (!statsPath) {
  console.error(
    'No stats JSON found. Generate one with:\n' +
      '  npx expo export --platform web --stats-output dist/stats.json\n' +
      'Then re-run this script.',
  );
  process.exit(1);
}

const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

// Metro stats may nest modules under `modules` or `dependencies`.
const modules = stats.modules ?? stats.dependencies ?? [];

if (!modules.length) {
  console.error('Stats file contains no modules. Check the format.');
  process.exit(1);
}

// ── helpers ────────────────────────────────────────────────────────────────

/** Normalise a source path into a readable name and a package key. */
function classify(name) {
  if (name.includes('node_modules')) {
    const after = name.slice(
      name.indexOf('node_modules') + 'node_modules/'.length,
    );
    const parts = after.split('/');
    return parts[0].startsWith('@')
      ? { pkg: parts[0] + '/' + parts[1], short: parts.slice(0, 2).join('/') }
      : { pkg: parts[0], short: parts[0] };
  }
  if (name.startsWith('src/') || name.includes('/src/')) {
    const idx = name.indexOf('src/');
    return { pkg: './src', short: name.slice(idx) };
  }
  return { pkg: '(other)', short: name };
}

/** Size of a module from the stats object (supports multiple shapes). */
function moduleSize(m) {
  if (typeof m.size === 'number') return m.size;
  if (m.output && Array.isArray(m.output)) {
    return m.output.reduce((sum, o) => sum + (o.size ?? 0), 0);
  }
  if (m.source?.size != null) return m.source.size;
  return 0;
}

// ── compute data ───────────────────────────────────────────────────────────

let totalSize = 0;
const byPkg = {};

const items = modules.map(m => {
  const rawName = m.name ?? m.moduleId ?? m.source ?? '(unknown)';
  const size = moduleSize(m);
  totalSize += size;
  const { pkg } = classify(rawName);
  byPkg[pkg] = (byPkg[pkg] || 0) + size;
  return { name: rawName, size };
});

items.sort((a, b) => b.size - a.size);

const top20 = items.slice(0, 20);
const topPkgs = Object.entries(byPkg)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

// ── output ─────────────────────────────────────────────────────────────────

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

console.log('\n=== Bundle Report ===');
console.log('Stats file : ' + statsPath);
console.log('Total size : ' + fmt(totalSize));
console.log('Modules    : ' + items.length);

console.log('\n--- Top 20 largest modules ---');
top20.forEach((m, i) => {
  const pct = totalSize > 0 ? ((m.size / totalSize) * 100).toFixed(1) : '0.0';
  console.log(
    `  ${String(i + 1).padStart(2)}. ${fmt(m.size).padStart(10)} (${pct.padStart(5)}%)  ${m.name}`,
  );
});

console.log('\n--- Top 20 packages by size ---');
topPkgs.forEach(([name, size], i) => {
  const pct = totalSize > 0 ? ((size / totalSize) * 100).toFixed(1) : '0.0';
  console.log(
    `  ${String(i + 1).padStart(2)}. ${fmt(size).padStart(10)} (${pct.padStart(5)}%)  ${name}`,
  );
});

console.log('');
