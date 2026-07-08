import { test, expect, APIRequestContext } from '@playwright/test';
import { probeApi, isApiAvailable } from './helpers';

const API = process.env.E2E_API_URL || 'http://localhost:4000/api';

test.beforeAll(async ({ request }) => {
  await probeApi(request, API);
});

async function registerTestUser(requestCtx: APIRequestContext) {
  const email = `test.${Date.now()}@example.com`;
  const password = 'TestPassw0rd!';
  const res = await requestCtx.post(`${API}/auth/register`, {
    data: { email, password },
  });
  expect([200, 201]).toContain(res.status());
  return res.json();
}

test.describe('User journey', () => {
  test('register + login returns token', async ({ request }) => {
    test.skip(
      !isApiAvailable(),
      'Backend not available — set E2E_API_URL or start backend on :4000',
    );
    const email = `test.${Date.now()}@example.com`;
    const password = 'TestPassw0rd!';

    const reg = await request.post(`${API}/auth/register`, {
      data: { email, password },
    });
    expect([200, 201]).toContain(reg.status());

    const login = await request.post(`${API}/auth/login`, {
      data: { email, password },
    });
    expect(login.status()).toBe(200);
    const body = await login.json();
    expect(body.token).toBeTruthy();
  });

  test('add miner succeeds after login', async ({ request }) => {
    test.skip(
      !isApiAvailable(),
      'Backend not available — set E2E_API_URL or start backend on :4000',
    );
    const body = await registerTestUser(request);
    const token = (body.token as string) || '';

    const res = await request.post(`${API}/miners`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `test-miner-${Date.now()}`,
        ip: '192.168.1.42',
        port: 80,
      },
    });
    expect([200, 201]).toContain(res.status());
    const miner = await res.json();
    expect(miner.id).toBeTruthy();
    expect(typeof miner.name).toBe('string');
  });
});
