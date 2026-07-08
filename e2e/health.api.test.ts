import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://localhost:4000/api';

test('GET /api/health returns ok', async ({ request }) => {
  const res = await request.get(`${API}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
  expect(body.db).toBe('connected');
});
