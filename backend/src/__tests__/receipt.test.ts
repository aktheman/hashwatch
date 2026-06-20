import request from 'supertest';
import express from 'express';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
}));

const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  post: (...args: any[]) => mockAxiosPost(...args),
}));

import { receiptRouter } from '../routes/receipt';

const app = express();
app.use(express.json());
app.use('/api/receipt', receiptRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/receipt/validate', () => {
  it('returns 400 if receipt is missing', async () => {
    const res = await request(app)
      .post('/api/receipt/validate')
      .send({ productId: 'hashwatch_pro' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('receipt and productId are required');
  });

  it('returns 400 if productId is missing', async () => {
    const res = await request(app).post('/api/receipt/validate').send({ receipt: 'fake-receipt' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('receipt and productId are required');
  });

  it('validates a valid pro receipt', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    mockAxiosPost.mockResolvedValueOnce({
      data: {
        entitlements: {
          pro: { expires_date: futureDate },
        },
      },
    });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post('/api/receipt/validate')
      .send({ receipt: 'valid-receipt', productId: 'hashwatch_pro' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true, expiresDate: futureDate });
    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://api.revenuecat.com/v1/receipts',
      expect.objectContaining({ product_id: 'hashwatch_pro', receipt: 'valid-receipt' }),
      expect.any(Object),
    );
  });

  it('returns valid=false for expired pro', async () => {
    process.env.REVENUECAT_API_KEY = 'test-key';
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockAxiosPost.mockResolvedValueOnce({
      data: {
        entitlements: {
          pro: { expires_date: pastDate },
        },
      },
    });

    const res = await request(app)
      .post('/api/receipt/validate')
      .send({ receipt: 'expired-receipt', productId: 'hashwatch_pro' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: false, expiresDate: pastDate });
  });

  it('returns valid=false when no pro entitlement', async () => {
    process.env.REVENUECAT_API_KEY = 'test-key';
    mockAxiosPost.mockResolvedValueOnce({
      data: { entitlements: {} },
    });

    const res = await request(app)
      .post('/api/receipt/validate')
      .send({ receipt: 'no-entitlement', productId: 'hashwatch_pro' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: false, expiresDate: null });
  });

  it('returns 400 on RevenueCat API error', async () => {
    mockAxiosPost.mockRejectedValueOnce(new Error('RC API error'));

    const res = await request(app)
      .post('/api/receipt/validate')
      .send({ receipt: 'bad-receipt', productId: 'hashwatch_pro' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('receipt validation failed');
  });
});
