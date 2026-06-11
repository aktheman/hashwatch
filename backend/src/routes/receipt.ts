import { Router } from 'express';
import axios from 'axios';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { query } from '../db';

export const receiptRouter = Router();
receiptRouter.use(authMiddleware);

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY || '';

receiptRouter.post('/validate', async (req: AuthRequest, res) => {
  const { receipt, productId } = req.body;
  if (!receipt || !productId) {
    return res.status(400).json({ error: 'receipt and productId are required' });
  }

  if (!REVENUECAT_API_KEY) {
    return res.status(500).json({ error: 'RevenueCat not configured' });
  }

  try {
    const platform = req.headers['x-platform'] || 'ios';
    const rcResponse = await axios.post(
      'https://api.revenuecat.com/v1/receipts',
      {
        product_id: productId,
        receipt,
        platform: platform === 'android' ? 'google_play' : 'app_store',
      },
      {
        headers: {
          Authorization: `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const isPro =
      rcResponse.data?.entitlements?.pro?.expires_date &&
      new Date(rcResponse.data.entitlements.pro.expires_date).getTime() > Date.now();

    if (isPro) {
      await query(
        `INSERT INTO user_subscriptions (userId, platform, productId, expiresAt)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (userId) DO UPDATE SET
           platform = EXCLUDED.platform,
           productId = EXCLUDED.productId,
           expiresAt = EXCLUDED.expiresAt`,
        [req.userId, platform, productId, rcResponse.data.entitlements.pro.expires_date],
      );
    }

    res.json({
      valid: !!isPro,
      ...rcResponse.data,
    });
  } catch (e: any) {
    res.status(400).json({
      error: 'receipt validation failed',
      detail: e.response?.data || e.message,
    });
  }
});
