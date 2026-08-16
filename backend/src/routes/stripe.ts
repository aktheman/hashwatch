import express, { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';
import { query } from '../db';

function getStripeKey(): string {
  return process.env.STRIPE_SECRET_KEY || '';
}

function getWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
}

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_USER_EMAILS || '';
  const normalized = email.trim().toLowerCase();
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

const WEBHOOK_EVENTS_HANDLED = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
] as const;

const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    try {
      const stripeKey = getStripeKey();
      const webhookSecret = getWebhookSecret();
      if (!stripeKey || !webhookSecret) {
        return res.status(503).json({ error: 'Stripe not configured' });
      }

      const sig = req.headers['stripe-signature'];
      if (!sig || typeof sig !== 'string') {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      const payload = req.body;

      const parts: Record<string, string> = {};
      for (const pair of sig.split(',')) {
        const [k, v] = pair.split('=', 2);
        if (k && v) parts[k] = v;
      }

      if (!parts.t || !parts.v1) {
        return res.status(400).json({ error: 'Invalid signature format' });
      }

      const signedPayload = `${parts.t}.${payload}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
      const expectedSig = Array.from(new Uint8Array(sigBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (expectedSig !== parts.v1) {
        log.warn('Stripe webhook signature mismatch');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const event = JSON.parse(typeof payload === 'string' ? payload : payload.toString());
      const eventType = event.type as string;

      if (!WEBHOOK_EVENTS_HANDLED.includes(eventType as (typeof WEBHOOK_EVENTS_HANDLED)[number])) {
        log.info(`Stripe webhook: unhandled event type ${eventType}`);
        return res.json({ received: true });
      }

      const data = event.data.object;
      const userId = data.metadata?.userId || data.metadata?.user_id;

      if (!userId) {
        log.warn('Stripe webhook: no userId in metadata', { eventType });
        return res.json({ received: true });
      }

      if (eventType === 'checkout.session.completed') {
        const subscriptionId = data.subscription;
        const customerId = data.customer;
        const priceId = data.line_items?.data?.[0]?.price?.id || null;

        // The checkout session's `expires_at` is the payment-link expiry
        // (~24h), NOT the subscription period end. Fetch the subscription for
        // accurate `current_period_end` / `trial_end`.
        let expiresAt = new Date();
        let trialEndsAt: string | null = null;
        if (subscriptionId && getStripeKey()) {
          try {
            const subRes = await fetch(
              `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
              { headers: { Authorization: `Bearer ${getStripeKey()}` } },
            );
            if (subRes.ok) {
              const sub = await subRes.json();
              if (sub.current_period_end) {
                expiresAt = new Date(sub.current_period_end * 1000);
              }
              if (sub.trial_end) {
                trialEndsAt = new Date(sub.trial_end * 1000).toISOString();
              }
            }
          } catch (err: unknown) {
            log.warn('Stripe: failed to fetch subscription period end', {
              subscriptionId,
              error: err instanceof Error ? err.message : err,
            });
          }
        }

        await query(
          `INSERT INTO user_subscriptions (userId, platform, productId, expiresAt, "stripeSubscriptionId", "stripeCustomerId", "priceId", "trialEndsAt")
         VALUES ($1, 'stripe', $2, $3, $4, $5, $6, $7)
         ON CONFLICT (userId) DO UPDATE SET
           platform = 'stripe',
           productId = EXCLUDED.productId,
           expiresAt = EXCLUDED.expiresAt,
           "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId",
           "stripeCustomerId" = EXCLUDED."stripeCustomerId",
           "priceId" = EXCLUDED."priceId",
           "trialEndsAt" = EXCLUDED."trialEndsAt"`,
          [
            userId,
            subscriptionId || 'stripe_pro',
            expiresAt.toISOString(),
            subscriptionId,
            customerId,
            priceId,
            trialEndsAt,
          ],
        );

        log.info('Stripe checkout completed', { userId, subscriptionId });
      } else if (
        eventType === 'customer.subscription.created' ||
        eventType === 'customer.subscription.updated'
      ) {
        const status = data.status;
        const subscriptionId = data.id;
        const currentPeriodEnd = new Date(data.current_period_end * 1000).toISOString();

        if (status === 'active') {
          const trialEnd = data.trial_end;
          const trialEndsAt = trialEnd ? new Date(trialEnd * 1000).toISOString() : null;
          if (trialEndsAt) {
            await query(
              `UPDATE user_subscriptions SET expiresAt = $1, "trialEndsAt" = $2 WHERE "stripeSubscriptionId" = $3`,
              [currentPeriodEnd, trialEndsAt, subscriptionId],
            );
          } else {
            await query(
              `UPDATE user_subscriptions SET expiresAt = $1, "trialEndsAt" = NULL WHERE "stripeSubscriptionId" = $2`,
              [currentPeriodEnd, subscriptionId],
            );
          }
          log.info('Stripe subscription updated (active)', { subscriptionId });
        } else if (status === 'past_due' || status === 'canceled' || status === 'unpaid') {
          await query(
            `UPDATE user_subscriptions SET expiresAt = NOW() WHERE "stripeSubscriptionId" = $1`,
            [subscriptionId],
          );
          log.info('Stripe subscription updated (expired)', { subscriptionId, status });
        }
      } else if (eventType === 'customer.subscription.trial_will_end') {
        const subscriptionId = data.id;
        log.info('Stripe trial will end soon', { subscriptionId });
      } else if (eventType === 'customer.subscription.deleted') {
        const subscriptionId = data.id;
        await query(
          `UPDATE user_subscriptions SET expiresAt = NOW() WHERE "stripeSubscriptionId" = $1`,
          [subscriptionId],
        );
        log.info('Stripe subscription deleted', { subscriptionId });
      }

      res.json({ received: true });
    } catch (err: unknown) {
      log.error('Stripe webhook error:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'internal server error' });
    }
  },
);

const stripeRouter = Router();
stripeRouter.use(authMiddleware);

stripeRouter.post('/create-checkout-session', async (req: AuthRequest, res) => {
  try {
    if (!getStripeKey()) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const userId = req.userId as string;
    const { priceId } = req.body;

    if (!priceId || typeof priceId !== 'string') {
      return res.status(400).json({ error: 'priceId is required' });
    }

    const origin = req.headers.origin || 'https://hashwatch2.vercel.app';
    const params: Record<string, string> = {
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${origin}/app?upgraded=true`,
      cancel_url: `${origin}/app`,
      'metadata[userId]': userId,
      'subscription_data[metadata][userId]': userId,
    };
    const trialDays = parseInt(process.env.STRIPE_TRIAL_DAYS || '', 10);
    if (Number.isFinite(trialDays) && trialDays > 0) {
      params['subscription_data[trial_period_days]'] = String(Math.min(trialDays, 30));
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getStripeKey()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });

    const session = await response.json();

    if (session.error) {
      log.error('Stripe checkout error:', session.error.message);
      return res.status(400).json({ error: session.error.message });
    }

    log.info('Checkout session created', { userId, sessionId: session.id });
    res.json({ url: session.url });
  } catch (err: unknown) {
    log.error('Error creating checkout session:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'internal server error' });
  }
});

stripeRouter.get('/subscription', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const result = await query(`SELECT * FROM user_subscriptions WHERE userId = $1`, [userId]);

    const sub = result.rows?.[0];
    const isAdmin = isAdminEmail(req.userEmail);
    if (!sub) {
      return res.json({ active: false, inTrial: false, isAdmin });
    }

    const now = new Date();
    const expiresAt = new Date(sub.expiresAt);
    const isExpired = expiresAt < now;
    const trialEndsAt = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;
    const inTrial = trialEndsAt !== null && trialEndsAt > now;

    res.json({
      active: !isExpired,
      inTrial,
      trialEndsAt: sub.trialEndsAt || null,
      platform: sub.platform,
      productId: sub.productId,
      expiresAt: sub.expiresAt,
      isAdmin,
    });
  } catch (err: unknown) {
    log.error('Error checking subscription:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export { stripeRouter, stripeWebhookRouter };
