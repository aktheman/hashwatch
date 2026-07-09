#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDB() {
  const dbPath = join(__dirname, 'data', 'miners.json');
  if (!existsSync(dbPath)) return [];
  try {
    return JSON.parse(readFileSync(dbPath, 'utf-8'));
  } catch {
    return [];
  }
}

function formatHashrate(v, unit) {
  if (!v) return '---';
  const units = { 'H/s': 0, 'KH/s': 1, 'MH/s': 2, 'GH/s': 3, 'TH/s': 4, 'PH/s': 5 };
  const idx = units[unit] ?? 0;
  const th = v / Math.pow(1000, 4 - idx);
  return `${th.toFixed(2)} TH/s`;
}

const cmd = process.argv[2];

if (cmd === 'status' || !cmd) {
  const miners = loadDB();
  if (miners.length === 0) {
    console.log('No miners configured');
    process.exit(0);
  }

  let totalHash = 0;
  let online = 0;
  let maintenance = 0;

  for (const m of miners) {
    const h = m.status?.hashRate ?? 0;
    const u = m.status?.hashRateUnit ?? 'GH/s';
    const th = h / Math.pow(1000, 4 - ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'].indexOf(u));
    totalHash += th;
    if (m.isOnline) online++;
    if (m.maintenanceMode) maintenance++;

    console.log(
      `${m.isOnline ? '🟢' : m.maintenanceMode ? '🔧' : '🔴'} ${m.name.padEnd(20)} ` +
      `${formatHashrate(h, u).padEnd(12)} ${m.ip}:${m.port}` +
      `${m.maintenanceMode ? ' [MAINTENANCE]' : ''}${!m.isOnline && !m.maintenanceMode ? ' [OFFLINE]' : ''}`,
    );
  }

  console.log('─'.repeat(50));
  console.log(`Total: ${miners.length} miners | ${online} online | ${maintenance} maintenance`);
  console.log(`Combined: ${totalHash.toFixed(2)} TH/s`);
} else if (cmd === '--help' || cmd === '-h') {
  console.log(`hashwatch CLI — Monitor your Bitcoin miners

Usage:
  node cli.mjs [command]

Commands:
  status    Show miner status summary (default)
  --help    Show this help`);
} else {
  console.error(`Unknown command: ${cmd}`);
  console.error('Run "node cli.mjs --help" for usage');
  process.exit(1);
}
