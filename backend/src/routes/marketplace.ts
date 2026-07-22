import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';

interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  model: string;
  condition: string;
  location: string;
  sellerId: string;
  createdAt: number;
}

const MAX_LISTINGS = 1000;
const MAX_PER_PAGE = 20;
const listingIdCounter = { next: 1 };

const store: MarketplaceListing[] = [];

const listingSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  price: z.number().positive(),
  currency: z.string().min(1).max(10),
  model: z.string().min(1).max(100),
  condition: z.enum(['like_new', 'good', 'fair']),
  location: z.string().min(1).max(100),
});

export const marketplaceRouter = Router();

// GET /api/marketplace — list active listings (no auth, public)
marketplaceRouter.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(
      MAX_PER_PAGE,
      Math.max(1, parseInt(String(req.query.limit || '20'), 10)),
    );
    const offset = (page - 1) * limit;

    const sorted = [...store].sort((a, b) => b.createdAt - a.createdAt);
    const paginated = sorted.slice(offset, offset + limit).map(({ sellerId, ...rest }) => ({
      ...rest,
      sellerId: `user_${sellerId.slice(0, 8)}`,
    }));

    res.json({
      listings: paginated,
      total: store.length,
      page,
      limit,
    });
  } catch (err: unknown) {
    log.error('Error listing marketplace:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// GET /api/marketplace/mine — user's own listings (auth required)
marketplaceRouter.get('/mine', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const mine = store
      .filter((l) => l.sellerId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json(mine);
  } catch (err: unknown) {
    log.error('Error fetching my listings:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/marketplace — create listing (auth required)
marketplaceRouter.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = listingSchema.parse(req.body);
    const userId = req.userId as string;

    if (store.length >= MAX_LISTINGS) {
      return res.status(503).json({ error: 'Marketplace is full' });
    }

    const id = String(listingIdCounter.next++);
    const listing: MarketplaceListing = {
      id,
      title: data.title,
      description: data.description,
      price: data.price,
      currency: data.currency,
      model: data.model,
      condition: data.condition,
      location: data.location,
      sellerId: userId,
      createdAt: Date.now(),
    };

    store.push(listing);
    log.info('Marketplace listing created', { userId, id, title: data.title });

    const { sellerId, ...safe } = listing;
    res.status(201).json({ ...safe, sellerId: `user_${sellerId.slice(0, 8)}` });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: e.errors });
    }
    log.error('Error creating listing:', e instanceof Error ? e.message : e);
    res.status(500).json({ error: 'internal server error' });
  }
});

// DELETE /api/marketplace/:id — delete own listing (auth required)
marketplaceRouter.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId as string;
    const idx = store.findIndex((l) => l.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (store[idx].sellerId !== userId) {
      return res.status(403).json({ error: 'not authorized' });
    }

    store.splice(idx, 1);
    log.info('Marketplace listing deleted', { userId, id });
    res.json({ deleted: true });
  } catch (err: unknown) {
    log.error('Error deleting listing:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'internal server error' });
  }
});
