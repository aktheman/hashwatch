import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';

const MAX_THEMES = 20;
const MAX_NAME_LENGTH = 100;
const MAX_COLORS_SIZE = 50000;

export const customThemesRouter = Router();
customThemesRouter.use(authMiddleware);

customThemesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, name, colors, createdAt, updatedAt FROM custom_themes WHERE userId = $1 ORDER BY updatedAt DESC',
      [req.userId],
    );
    res.json(result.rows);
  } catch (err: unknown) {
    log.error('Error listing custom themes:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

customThemesRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, name, colors, createdAt, updatedAt FROM custom_themes WHERE id = $1 AND userId = $2',
      [req.params.id, req.userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'theme not found' });
    }
    res.json(result.rows[0]);
  } catch (err: unknown) {
    log.error('Error getting custom theme:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

customThemesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, colors } = req.body;
    if (!colors || typeof colors !== 'object') {
      return res.status(400).json({ error: 'colors object is required' });
    }
    const colorsStr = JSON.stringify(colors);
    if (colorsStr.length > MAX_COLORS_SIZE) {
      return res.status(400).json({ error: 'colors too large' });
    }
    const themeName = String(name || 'Untitled').slice(0, MAX_NAME_LENGTH);

    const countResult = await query('SELECT COUNT(*) FROM custom_themes WHERE userId = $1', [
      req.userId,
    ]);
    if (parseInt((countResult.rows[0] as { count: string }).count) >= MAX_THEMES) {
      return res.status(409).json({ error: `maximum ${MAX_THEMES} custom themes` });
    }

    const result = await query(
      'INSERT INTO custom_themes (userId, name, colors) VALUES ($1, $2, $3) RETURNING id, name, colors, createdAt, updatedAt',
      [req.userId, themeName, colors],
    );
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    log.error('Error creating custom theme:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

customThemesRouter.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, colors } = req.body;
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(String(name).slice(0, MAX_NAME_LENGTH));
    }
    if (colors !== undefined) {
      if (typeof colors !== 'object') {
        return res.status(400).json({ error: 'colors must be an object' });
      }
      const colorsStr = JSON.stringify(colors);
      if (colorsStr.length > MAX_COLORS_SIZE) {
        return res.status(400).json({ error: 'colors too large' });
      }
      updates.push(`colors = $${idx++}`);
      values.push(colors);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'nothing to update' });
    }

    updates.push(`updatedAt = NOW()`);
    values.push(req.params.id, req.userId);

    const result = await query(
      `UPDATE custom_themes SET ${updates.join(', ')} WHERE id = $${idx++} AND userId = $${idx} RETURNING id, name, colors, createdAt, updatedAt`,
      values,
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'theme not found' });
    }
    res.json(result.rows[0]);
  } catch (err: unknown) {
    log.error('Error updating custom theme:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

customThemesRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'DELETE FROM custom_themes WHERE id = $1 AND userId = $2 RETURNING id',
      [req.params.id, req.userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'theme not found' });
    }
    res.json({ deleted: true });
  } catch (err: unknown) {
    log.error('Error deleting custom theme:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
