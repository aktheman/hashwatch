import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

interface PublicDashboardEntry {
  token: string;
  minerId: string;
  userId: string;
  createdAt: number;
}

const MAX_ENTRIES = 500;
const TOKEN_LENGTH = 8;
const TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

const store = new Map<string, PublicDashboardEntry>();

function generateToken(): string {
  let token = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_CHARS.charAt(Math.floor(Math.random() * TOKEN_CHARS.length));
  }
  return token;
}

export const publicDashboardRouter = Router();

// POST /api/public-dashboards — create share token (auth required)
publicDashboardRouter.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { minerId } = req.body;
    if (!minerId || typeof minerId !== 'string') {
      return res.status(400).json({ error: 'minerId is required' });
    }

    const userId = req.userId as string;

    // Check if a token already exists for this miner+user
    for (const entry of store.values()) {
      if (entry.minerId === minerId && entry.userId === userId) {
        return res.json({ token: entry.token, createdAt: entry.createdAt });
      }
    }

    if (store.size >= MAX_ENTRIES) {
      return res
        .status(503)
        .json({ error: 'Share limit reached. Revoke an existing share first.' });
    }

    const token = generateToken();
    const entry: PublicDashboardEntry = {
      token,
      minerId,
      userId,
      createdAt: Date.now(),
    };
    store.set(token, entry);

    log.info('Public dashboard created', { userId, minerId, token });
    res.status(201).json({ token, createdAt: entry.createdAt });
  } catch (err: unknown) {
    log.error('Error creating public dashboard:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// GET /api/public-dashboards/:token — get miner snapshot (no auth)
publicDashboardRouter.get('/:token', async (req, res) => {
  try {
    const token = String(req.params.token);
    const entry = store.get(token);
    if (!entry) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const minerResult = await query('SELECT name FROM miners WHERE id = $1 AND "userId" = $2', [
      entry.minerId,
      entry.userId,
    ]);

    const minerName = minerResult.rows.length > 0 ? minerResult.rows[0].name : 'Unknown Miner';

    const snapshotResult = await query(
      `SELECT "minerId", "timestamp", "hashRate", "hashRateUnit", "temperature",
              "voltage", "current", "power", "sharesAccepted", "sharesRejected",
              "uptimeSeconds", "frequency", "fanSpeed", "fanRpm", "coreVoltage"
       FROM miner_snapshots
       WHERE "minerId" = $1
       ORDER BY "timestamp" DESC
       LIMIT 1`,
      [entry.minerId],
    );

    const snapshot = snapshotResult.rows.length > 0 ? snapshotResult.rows[0] : null;

    res.json({
      minerName,
      minerId: entry.minerId,
      snapshot,
      createdAt: entry.createdAt,
    });
  } catch (err: unknown) {
    log.error('Error fetching public dashboard:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// DELETE /api/public-dashboards/:token — revoke share (auth required, must own)
publicDashboardRouter.delete('/:token', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const token = String(req.params.token);
    const entry = store.get(token);
    if (!entry) {
      return res.status(404).json({ error: 'Share not found' });
    }
    if (entry.userId !== req.userId) {
      return res.status(403).json({ error: 'not authorized' });
    }

    store.delete(token);
    log.info('Public dashboard revoked', { userId: req.userId, token });
    res.json({ deleted: true });
  } catch (err: unknown) {
    log.error('Error revoking public dashboard:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'internal server error' });
  }
});
