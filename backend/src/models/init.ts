import { query } from '../db';
import fs from 'fs';
import path from 'path';

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Running schema...');
  const statements = sql.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    try {
      await query(stmt);
    } catch (e) {
      console.error('Error running:', stmt.slice(0, 60), e);
    }
  }
  console.log('Schema initialized');
  process.exit(0);
}

init();
