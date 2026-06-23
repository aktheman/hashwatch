import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://localhost:4000/api';

test.describe('API baseline', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
  });

  test('POST /api/auth/login rejects invalid credentials', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'invalid@example.com', password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('invalid credentials');
  });

  test('GET /api/miners requires authentication', async ({ request }) => {
    const res = await request.get(`${API}/miners`);
    expect(res.status()).toBe(401);
  });
});
