import { test, expect } from '@playwright/test';
import { probeApi, isApiAvailable } from './helpers';

const API = process.env.E2E_API_URL || 'http://localhost:4000/api';

test.beforeAll(async ({ request }) => {
  await probeApi(request, API);
});

test('GET /api/health returns ok', async ({ request }) => {
  test.skip(!isApiAvailable(), 'Backend not available — set E2E_API_URL or start backend on :4000');
  const res = await request.get(`${API}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
  expect(body.db).toBe('connected');
});
