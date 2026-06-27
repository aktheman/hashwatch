import { Pool } from 'pg';

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'hashwatch',
      user: process.env.DB_USER || 'hashwatch',
      password: process.env.DB_PASSWORD || 'hashwatch',
    });

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}

export { pool };
