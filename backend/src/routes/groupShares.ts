import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { invalidateCache } from '../middleware/cache';
import { log } from '../logger';

export const groupSharesRouter = Router();
groupSharesRouter.use(authMiddleware);

groupSharesRouter.post('/share', async (req: AuthRequest, res) => {
  try {
    const { groupId, email, accessLevel } = req.body;
    if (!groupId || !email) {
      return res.status(400).json({ error: 'groupId and email are required' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    const level = accessLevel === 'edit' ? 'edit' : 'view';
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const sharedWithUserId = userResult.rows[0].id;
    if (sharedWithUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot share with yourself' });
    }
    const existing = await query(
      'SELECT id FROM group_shares WHERE "ownerId" = $1 AND "groupId" = $2 AND "sharedWithUserId" = $3',
      [req.userId, groupId, sharedWithUserId],
    );
    if (existing.rows.length > 0) {
      await query('UPDATE group_shares SET "accessLevel" = $1 WHERE id = $2', [
        level,
        existing.rows[0].id,
      ]);
      invalidateCache('/api/groups');
      return res.json({ id: existing.rows[0].id, accessLevel: level, updated: true });
    }
    const result = await query(
      'INSERT INTO group_shares ("ownerId", "groupId", "sharedWithUserId", "sharedWithEmail", "accessLevel") VALUES ($1, $2, $3, $4, $5) RETURNING id, "accessLevel"',
      [req.userId, groupId, sharedWithUserId, email, level],
    );
    invalidateCache('/api/groups');
    res.status(201).json({ id: result.rows[0].id, accessLevel: result.rows[0].accessLevel });
  } catch (err: unknown) {
    log.error('Error sharing group:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

groupSharesRouter.get('/share', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT gs.id, gs."groupId", gs."accessLevel", gs."sharedWithEmail", gs."createdAt",
              u.email as "ownerEmail"
       FROM group_shares gs
       JOIN users u ON u.id = gs."ownerId"
       WHERE gs."sharedWithUserId" = $1
       ORDER BY gs."createdAt" DESC`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (err: unknown) {
    log.error('Error listing shared with me:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

groupSharesRouter.get('/shared-by-me', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT gs.id, gs."groupId", gs."accessLevel", gs."sharedWithEmail", gs."createdAt"
       FROM group_shares gs
       WHERE gs."ownerId" = $1
       ORDER BY gs."createdAt" DESC`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (err: unknown) {
    log.error('Error listing shared by me:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

groupSharesRouter.put('/share/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { accessLevel } = req.body;
    const level = accessLevel === 'edit' ? 'edit' : 'view';
    const result = await query(
      'UPDATE group_shares SET "accessLevel" = $1 WHERE id = $2 AND "ownerId" = $3 RETURNING id, "accessLevel"',
      [level, id, req.userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share not found' });
    }
    invalidateCache('/api/groups');
    res.json({ id: result.rows[0].id, accessLevel: result.rows[0].accessLevel });
  } catch (err: unknown) {
    log.error('Error updating share:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

groupSharesRouter.delete('/share/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM group_shares WHERE id = $1 AND ("ownerId" = $2 OR "sharedWithUserId" = $2)',
      [id, req.userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Share not found' });
    }
    invalidateCache('/api/groups');
    res.json({ deleted: true });
  } catch (err: unknown) {
    log.error('Error revoking share:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

groupSharesRouter.get('/shared-miners/:groupId', async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.params;
    const shareCheck = await query(
      'SELECT "accessLevel" FROM group_shares WHERE "groupId" = $1 AND "sharedWithUserId" = $2',
      [groupId, req.userId],
    );
    if (shareCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await query(
      `SELECT m.id, m.name, m.ip, m.port, m."lastSeen"
       FROM miners m
       WHERE m."userId" IN (
         SELECT "ownerId" FROM group_shares WHERE "groupId" = $1 AND "sharedWithUserId" = $2
       )
       AND (m.group = $1)
       ORDER BY m.name`,
      [groupId, req.userId],
    );
    res.json({ miners: result.rows, accessLevel: shareCheck.rows[0].accessLevel });
  } catch (err: unknown) {
    log.error('Error fetching shared miners:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
