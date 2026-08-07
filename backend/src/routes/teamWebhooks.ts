import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';
import { query } from '../db';
import { getMembership } from './teams';
import { TEAM_WEBHOOK_EVENT_TYPES, testTeamWebhook } from '../services/teamWebhooks';
import { generateWebhookSecret } from '../utils/webhookSigning';

export const teamWebhooksRouter = Router();
teamWebhooksRouter.use(authMiddleware);

const MAX_WEBHOOKS_PER_TEAM = 20;

const EVENT_TYPES_SET = new Set<string>(TEAM_WEBHOOK_EVENT_TYPES);

const eventTypesField = z
  .array(z.string())
  .max(50)
  .refine((value) => value.every((event) => EVENT_TYPES_SET.has(event)), {
    message: 'Unknown event type',
  })
  .optional();

const createWebhookSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  url: z
    .string()
    .max(2048)
    .refine((value) => /^https?:\/\//i.test(value), {
      message: 'URL must start with http:// or https://',
    }),
  eventTypes: eventTypesField,
  active: z.boolean().optional(),
});

const updateWebhookSchema = createWebhookSchema.partial();

function mapWebhook(row: Record<string, unknown>, includeSecret = false) {
  const webhook = {
    id: row.id,
    teamId: row.teamid,
    name: row.name,
    url: row.url,
    eventTypes: row.eventTypes ?? [],
    active: row.active,
    createdAt: row.createdat,
    updatedAt: row.updatedat,
  };
  if (includeSecret) {
    return { ...webhook, secret: row.secret };
  }
  return webhook;
}

async function getTeamWebhook(teamId: string, webhookId: string) {
  const result = await query(
    `SELECT id, teamId, name, url, secret, "eventTypes", active, createdAt, updatedAt
     FROM team_webhooks
     WHERE id = $1 AND teamId = $2`,
    [webhookId, teamId],
  );
  return result.rows[0] as Record<string, unknown> | undefined;
}

async function requireAdmin(
  teamId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const membership = await getMembership(teamId, userId);
  if (!membership) {
    return { ok: false, status: 404, message: 'Team not found' };
  }
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { ok: false, status: 403, message: 'Only owners and admins can manage webhooks' };
  }
  return { ok: true };
}

teamWebhooksRouter.get('/:teamId/webhooks', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.teamId as string;
    const membership = await getMembership(teamId, req.userId as string);
    if (!membership) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const result = await query(
      `SELECT id, teamId, name, url, "eventTypes", active, createdAt, updatedAt
       FROM team_webhooks
       WHERE teamId = $1
       ORDER BY createdAt ASC`,
      [teamId],
    );
    const webhooks = result.rows.map((row: Record<string, unknown>) => mapWebhook(row));
    res.json({ webhooks });
  } catch (err: unknown) {
    log.error('Error listing team webhooks:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamWebhooksRouter.post('/:teamId/webhooks', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.teamId as string;
    const adminCheck = await requireAdmin(teamId, req.userId as string);
    if (!adminCheck.ok) {
      return res.status(adminCheck.status).json({ error: adminCheck.message });
    }

    const parsed = createWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' });
    }

    const countResult = await query(
      'SELECT COUNT(*)::int AS count FROM team_webhooks WHERE teamId = $1',
      [teamId],
    );
    if ((countResult.rows[0] as { count: number }).count >= MAX_WEBHOOKS_PER_TEAM) {
      return res.status(400).json({ error: 'Webhook limit reached for this team' });
    }

    const secret = generateWebhookSecret();
    const result = await query(
      `INSERT INTO team_webhooks (teamId, name, url, secret, "eventTypes", active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, teamId, name, url, secret, "eventTypes", active, createdAt, updatedAt`,
      [
        teamId,
        parsed.data.name?.trim() || 'Webhook',
        parsed.data.url,
        secret,
        parsed.data.eventTypes ?? [],
        parsed.data.active ?? true,
      ],
    );
    const webhook = mapWebhook(result.rows[0] as Record<string, unknown>, true);
    res.status(201).json({ webhook });
  } catch (err: unknown) {
    log.error('Error creating team webhook:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamWebhooksRouter.patch('/:teamId/webhooks/:webhookId', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.teamId as string;
    const webhookId = req.params.webhookId as string;
    const adminCheck = await requireAdmin(teamId, req.userId as string);
    if (!adminCheck.ok) {
      return res.status(adminCheck.status).json({ error: adminCheck.message });
    }

    const existing = await getTeamWebhook(teamId, webhookId);
    if (!existing) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const parsed = updateWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' });
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    if (parsed.data.name !== undefined) {
      params.push(parsed.data.name.trim() || 'Webhook');
      updates.push(`name = $${params.length}`);
    }
    if (parsed.data.url !== undefined) {
      params.push(parsed.data.url);
      updates.push(`url = $${params.length}`);
    }
    if (parsed.data.eventTypes !== undefined) {
      params.push(parsed.data.eventTypes);
      updates.push(`"eventTypes" = $${params.length}`);
    }
    if (parsed.data.active !== undefined) {
      params.push(parsed.data.active);
      updates.push(`active = $${params.length}`);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(webhookId, teamId);
    const result = await query(
      `UPDATE team_webhooks
       SET ${updates.join(', ')}, "updatedAt" = NOW()
       WHERE id = $${params.length - 1} AND teamId = $${params.length}
       RETURNING id, teamId, name, url, secret, "eventTypes", active, createdAt, updatedAt`,
      params,
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json({ webhook: mapWebhook(result.rows[0] as Record<string, unknown>) });
  } catch (err: unknown) {
    log.error('Error updating team webhook:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamWebhooksRouter.delete('/:teamId/webhooks/:webhookId', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.teamId as string;
    const webhookId = req.params.webhookId as string;
    const adminCheck = await requireAdmin(teamId, req.userId as string);
    if (!adminCheck.ok) {
      return res.status(adminCheck.status).json({ error: adminCheck.message });
    }

    const result = await query('DELETE FROM team_webhooks WHERE id = $1 AND teamId = $2', [
      webhookId,
      teamId,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json({ deleted: true });
  } catch (err: unknown) {
    log.error('Error deleting team webhook:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamWebhooksRouter.post('/:teamId/webhooks/:webhookId/test', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.teamId as string;
    const webhookId = req.params.webhookId as string;
    const adminCheck = await requireAdmin(teamId, req.userId as string);
    if (!adminCheck.ok) {
      return res.status(adminCheck.status).json({ error: adminCheck.message });
    }

    const result = await testTeamWebhook(teamId, webhookId);
    if (result.status === 0 && !result.ok) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json(result);
  } catch (err: unknown) {
    log.error('Error testing team webhook:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamWebhooksRouter.post('/:teamId/webhooks/:webhookId/rotate', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.teamId as string;
    const webhookId = req.params.webhookId as string;
    const adminCheck = await requireAdmin(teamId, req.userId as string);
    if (!adminCheck.ok) {
      return res.status(adminCheck.status).json({ error: adminCheck.message });
    }

    const secret = generateWebhookSecret();
    const result = await query(
      `UPDATE team_webhooks
       SET secret = $1, "updatedAt" = NOW()
       WHERE id = $2 AND teamId = $3
       RETURNING id, secret`,
      [secret, webhookId, teamId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json({ id: (result.rows[0] as { id: string }).id, secret });
  } catch (err: unknown) {
    log.error('Error rotating team webhook secret:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamWebhooksRouter.get('/:teamId/webhooks/logs', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.teamId as string;
    const membership = await getMembership(teamId, req.userId as string);
    if (!membership) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    const countResult = await query(
      'SELECT COUNT(*)::int AS total FROM webhook_logs WHERE teamId = $1',
      [teamId],
    );
    const total = (countResult.rows[0] as { total: number }).total;

    const result = await query(
      `SELECT id, event, url, status, "responseCode", "sentAt", attempts, "nextRetryAt"
       FROM webhook_logs
       WHERE teamId = $1
       ORDER BY "sentAt" DESC
       LIMIT $2 OFFSET $3`,
      [teamId, limit, offset],
    );
    const logs = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      event: row.event,
      url: row.url,
      status: row.status,
      responseCode: row.responseCode,
      sentAt: row.sentAt,
      attempts: row.attempts,
      nextRetryAt: row.nextRetryAt,
    }));
    res.json({ logs, total, limit, offset });
  } catch (err: unknown) {
    log.error('Error fetching team webhook logs:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
