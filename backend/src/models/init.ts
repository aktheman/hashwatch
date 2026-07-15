import { query } from '../db';
import fs from 'fs';
import path from 'path';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  log.info('Running schema...');
  const statements = sql.split(';').filter((s) => s.trim());
  for (const stmt of statements) {
    try {
      await query(stmt);
    } catch (e) {
      log.error('Error running:', stmt.slice(0, 60), e);
    }
  }
  log.info('Schema initialized');
  process.exit(0);
}

init();
