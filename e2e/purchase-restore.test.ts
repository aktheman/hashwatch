import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://localhost:4000/api';

test.describe('Purchase / restore', () => {
  test('POST /api/receipt/validate handles auth receipt', async ({ request }) => {
    const email = `test.${Date.now()}@example.com`;
    const password = 'TestPassw0rd!';
    const res = await request.post(`${API}/auth/register`, {
      data: { email, password },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.token).toBeTruthy();
    const token = body.token;

    const receiptRes = await request.post(`${API}/receipt/validate`, {
      headers: { Authorization: 'Bearer ' + token },
      data: {
        receipt: 'dGVzdC1yZWNpcHlfdmFsaWRhdGlvbg==',
        productId: 'com.hashwatch.pro',
      },
    });

    expect([200, 400, 500]).toContain(receiptRes.status());
    const receiptBody = await receiptRes.json();
    if (receiptRes.status() === 200) {
      expect(receiptBody).toHaveProperty('valid');
      expect(typeof receiptBody.valid).toBe('boolean');
      expect(receiptBody).toHaveProperty('expiresDate');
    } else {
      expect(receiptBody).toHaveProperty('error');
      expect(typeof receiptBody.error).toBe('string');
    }
  });
});
