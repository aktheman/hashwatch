import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';

const stripeRouter = Router();
stripeRouter.use(authMiddleware);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

stripeRouter.post('/create-checkout-session', async (req: AuthRequest, res) => {
  try {
    if (!STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const userId = req.userId as string;
    const { priceId } = req.body;

    if (!priceId || typeof priceId !== 'string') {
      return res.status(400).json({ error: 'priceId is required' });
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        success_url: `${req.headers.origin || 'https://hashwatch.vercel.app'}/app?upgraded=true`,
        cancel_url: `${req.headers.origin || 'https://hashwatch.vercel.app'}/app`,
        'metadata[userId]': userId,
        'subscription_data[metadata][userId]': userId,
      }).toString(),
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

export { stripeRouter };
