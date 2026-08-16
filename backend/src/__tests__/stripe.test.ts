import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { stripeRouter, stripeWebhookRouter } from '../routes/stripe';
import request from 'supertest';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

jest.mock('../logger', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { query: mockQuery } = jest.requireMock('../db') as { query: jest.Mock };
const JWT_SECRET = 'test-secret-for-testing';

function authHeader(): string {
  const token = jwt.sign({ userId: 'user-123', email: 'test@test.com' }, JWT_SECRET, {
    expiresIn: '1h',
  });
  return `Bearer ${token}`;
}

function createStripeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/stripe', stripeRouter);
  return app;
}

function createWebhookApp() {
  const app = express();
  app.use('/api/stripe', stripeWebhookRouter);
  return app;
}

describe('stripeRouter', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /create-checkout-session', () => {
    it('returns 503 when STRIPE_SECRET_KEY not set', async () => {
      const orig = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const res = await request(createStripeApp())
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', authHeader())
        .send({ priceId: 'price_123' });

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('Stripe not configured');
      process.env.STRIPE_SECRET_KEY = orig;
    });

    it('returns 400 when priceId missing', async () => {
      const orig = process.env.STRIPE_SECRET_KEY;
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';

      const res = await request(createStripeApp())
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', authHeader())
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priceId is required');
      process.env.STRIPE_SECRET_KEY = orig;
    });

    it('returns 401 without auth token', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      const res = await request(createStripeApp())
        .post('/api/stripe/create-checkout-session')
        .send({ priceId: 'price_123' });

      expect(res.status).toBe(401);
    });

    it('ignores client-controlled trialPeriodDays', async () => {
      const origSecret = process.env.STRIPE_SECRET_KEY;
      const origTrial = process.env.STRIPE_TRIAL_DAYS;
      const origFetch = global.fetch;
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      delete process.env.STRIPE_TRIAL_DAYS;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/c/pay/test' }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await request(createStripeApp())
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', authHeader())
        .send({ priceId: 'price_123', trialPeriodDays: 365 });

      const [, init] = fetchMock.mock.calls[0];
      const body = new URLSearchParams(init.body);
      expect(body.get('subscription_data[trial_period_days]')).toBeNull();

      process.env.STRIPE_SECRET_KEY = origSecret;
      if (origTrial === undefined) delete process.env.STRIPE_TRIAL_DAYS;
      else process.env.STRIPE_TRIAL_DAYS = origTrial;
      global.fetch = origFetch;
    });

    it('applies server-side STRIPE_TRIAL_DAYS when configured', async () => {
      const origSecret = process.env.STRIPE_SECRET_KEY;
      const origTrial = process.env.STRIPE_TRIAL_DAYS;
      const origFetch = global.fetch;
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_TRIAL_DAYS = '7';
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/c/pay/test' }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await request(createStripeApp())
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', authHeader())
        .send({ priceId: 'price_123' });

      const [, init] = fetchMock.mock.calls[0];
      const body = new URLSearchParams(init.body);
      expect(body.get('subscription_data[trial_period_days]')).toBe('7');

      process.env.STRIPE_SECRET_KEY = origSecret;
      if (origTrial === undefined) delete process.env.STRIPE_TRIAL_DAYS;
      else process.env.STRIPE_TRIAL_DAYS = origTrial;
      global.fetch = origFetch;
    });
  });

  describe('GET /subscription', () => {
    it('returns active: false when no subscription', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(createStripeApp())
        .get('/api/stripe/subscription')
        .set('Authorization', authHeader());
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ active: false, inTrial: false });
    });

    it('returns active: true for valid subscription', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      mockQuery.mockResolvedValueOnce({
        rows: [
          { platform: 'stripe', productId: 'sub_123', expiresAt: futureDate, trialEndsAt: null },
        ],
      });
      const res = await request(createStripeApp())
        .get('/api/stripe/subscription')
        .set('Authorization', authHeader());
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        active: true,
        inTrial: false,
        trialEndsAt: null,
        platform: 'stripe',
        productId: 'sub_123',
        expiresAt: futureDate,
      });
    });

    it('returns active: false for expired subscription', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      mockQuery.mockResolvedValueOnce({
        rows: [
          { platform: 'stripe', productId: 'sub_123', expiresAt: pastDate, trialEndsAt: null },
        ],
      });
      const res = await request(createStripeApp())
        .get('/api/stripe/subscription')
        .set('Authorization', authHeader());
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        active: false,
        inTrial: false,
        trialEndsAt: null,
        platform: 'stripe',
        productId: 'sub_123',
        expiresAt: pastDate,
      });
    });

    it('returns inTrial: true when trial is active', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
      const trialEnd = new Date(Date.now() + 86400000 * 5).toISOString();
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            platform: 'stripe',
            productId: 'sub_123',
            expiresAt: futureDate,
            trialEndsAt: trialEnd,
          },
        ],
      });
      const res = await request(createStripeApp())
        .get('/api/stripe/subscription')
        .set('Authorization', authHeader());
      expect(res.status).toBe(200);
      expect(res.body.inTrial).toBe(true);
      expect(res.body.trialEndsAt).toBe(trialEnd);
    });
  });
});

describe('stripeWebhookRouter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 503 when Stripe not configured', async () => {
    const origSecret = process.env.STRIPE_SECRET_KEY;
    const origWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const res = await request(createWebhookApp())
      .post('/api/stripe/webhook')
      .set('stripe-signature', 't=123,v1=abc')
      .set('stripe-timestamp', '123')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(503);
    process.env.STRIPE_SECRET_KEY = origSecret;
    process.env.STRIPE_WEBHOOK_SECRET = origWebhook;
  });

  it('returns 400 when stripe-signature header missing', async () => {
    const origSecret = process.env.STRIPE_SECRET_KEY;
    const origWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const res = await request(createWebhookApp())
      .post('/api/stripe/webhook')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing stripe-signature header');
    process.env.STRIPE_SECRET_KEY = origSecret;
    process.env.STRIPE_WEBHOOK_SECRET = origWebhook;
  });

  it('returns 400 when signature format invalid', async () => {
    const origSecret = process.env.STRIPE_SECRET_KEY;
    const origWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const res = await request(createWebhookApp())
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'bad')
      .set('stripe-timestamp', '123')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid signature format');
    process.env.STRIPE_SECRET_KEY = origSecret;
    process.env.STRIPE_WEBHOOK_SECRET = origWebhook;
  });

  it('accepts a validly signed checkout.session.completed webhook', async () => {
    const origSecret = process.env.STRIPE_SECRET_KEY;
    const origWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    const origFetch = global.fetch;
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ current_period_end: periodEnd, trial_end: null }),
    }) as unknown as typeof fetch;

    const t = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: 'user-123' },
          subscription: 'sub_123',
          customer: 'cus_123',
          expires_at: Math.floor(Date.now() / 1000) + 86400,
        },
      },
    });
    const signedPayload = `${t}.${body}`;
    const v1 = crypto.createHmac('sha256', 'whsec_test').update(signedPayload).digest('hex');

    const res = await request(createWebhookApp())
      .post('/api/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', `t=${t},v1=${v1}`)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/subscriptions/sub_123',
      expect.any(Object),
    );
    const [, , expiresAt] = mockQuery.mock.calls[0][1];
    expect(expiresAt).toBe(new Date(periodEnd * 1000).toISOString());
    process.env.STRIPE_SECRET_KEY = origSecret;
    process.env.STRIPE_WEBHOOK_SECRET = origWebhook;
    global.fetch = origFetch;
  });

  it('rejects a webhook with an invalid signature', async () => {
    const origSecret = process.env.STRIPE_SECRET_KEY;
    const origWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const res = await request(createWebhookApp())
      .post('/api/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=123,v1=wrongsignature')
      .send('{}');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid signature');
    process.env.STRIPE_SECRET_KEY = origSecret;
    process.env.STRIPE_WEBHOOK_SECRET = origWebhook;
  });
});
