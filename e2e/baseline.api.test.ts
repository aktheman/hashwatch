import { test, expect } from '@playwright/test';
import { probeApi, isApiAvailable } from './helpers';

const API = process.env.E2E_API_URL || 'http://localhost:4000/api';

test.beforeAll(async ({ request }) => {
  await probeApi(request, API);
});

test.describe('API baseline', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    test.skip(
      !isApiAvailable(),
      'Backend not available — set E2E_API_URL or start backend on :4000',
    );
    const res = await request.get(`${API}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
  });

  test('POST /api/auth/login rejects invalid credentials', async ({ request }) => {
    test.skip(
      !isApiAvailable(),
      'Backend not available — set E2E_API_URL or start backend on :4000',
    );
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'invalid@example.com', password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('invalid credentials');
  });

  test('GET /api/miners requires authentication', async ({ request }) => {
    test.skip(
      !isApiAvailable(),
      'Backend not available — set E2E_API_URL or start backend on :4000',
    );
    const res = await request.get(`${API}/miners`);
    expect(res.status()).toBe(401);
  });
});
