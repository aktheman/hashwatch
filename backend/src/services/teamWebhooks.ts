import axios from 'axios';
import { query } from '../db';
import { log } from '../logger';
import { captureException } from './sentry';
import { isAllowedUrl } from '../utils/ssrf';
import { buildWebhookSignatureHeader } from '../utils/webhookSigning';

export const TEAM_WEBHOOK_EVENT_TYPES = [
  'team_invite',
  'team_join',
  'team_leave',
  'miner_shared',
  'miner_unshared',
  'miner_offline',
  'miner_online',
  'miner_hot',
  'hashrate_drop',
  'pool_lost',
  'share_rejection',
  'test',
] as const;

export type TeamWebhookEventType = (typeof TEAM_WEBHOOK_EVENT_TYPES)[number];

export interface WebhookDeliveryPayload {
  event: string;
  title: string;
  body: string;
  severity?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface TeamWebhookRow {
  id: string;
  teamid: string;
  url: string;
  secret: string;
  eventTypes: string[];
  active: boolean;
}

interface RetryRow {
  logid: number;
  url: string;
  event: string;
  payload: string;
  secret: string;
  attempts: number;
}

const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 60_000;
const MAX_RETRIES_PER_SWEEP = 50;
const SWEEPER_INTERVAL_MS = 60_000;

function retryBackoffMs(attempt: number): number {
  const exponent = Math.min(attempt - 1, 6);
  return Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, exponent), 60 * 60_000);
}

function signatureHeaders(secret: string, rawBody: string, event: string): Record<string, string> {
  const { header, timestamp } = buildWebhookSignatureHeader(secret, rawBody);
  return {
    'Content-Type': 'application/json',
    'X-HashWatch-Signature': header,
    'X-HashWatch-Event': event,
    'X-HashWatch-Timestamp': timestamp,
    'X-HashWatch-Version': '1',
  };
}

async function deliverTeamWebhook(
  webhook: TeamWebhookRow,
  payload: WebhookDeliveryPayload,
): Promise<{ ok: boolean; status: number }> {
  const rawBody = JSON.stringify(payload);
  try {
    if (!webhook.url || !webhook.url.startsWith('http')) return { ok: false, status: 0 };
    if (!(await isAllowedUrl(webhook.url))) return { ok: false, status: 0 };

    const response = await axios.post(webhook.url, rawBody, {
      timeout: WEBHOOK_TIMEOUT_MS,
      headers: signatureHeaders(webhook.secret, rawBody, payload.event),
    });

    await query(
      `INSERT INTO webhook_logs (teamId, webhookId, event, url, status, responseCode, payload, attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
      [
        webhook.teamid,
        webhook.id,
        payload.event,
        webhook.url,
        'delivered',
        response.status,
        rawBody,
      ],
    );
    return { ok: true, status: response.status };
  } catch (error) {
    const status = error instanceof axios.AxiosError ? (error.response?.status ?? 0) : 0;
    await query(
      `INSERT INTO webhook_logs (teamId, webhookId, event, url, status, responseCode, payload, attempts, nextRetryAt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)`,
      [
        webhook.teamid,
        webhook.id,
        payload.event,
        webhook.url,
        'failed',
        status,
        rawBody,
        Date.now() + retryBackoffMs(1),
      ],
    ).catch(() => {});
    captureException(error);
    return { ok: false, status };
  }
}

export async function sendTeamWebhooks(
  teamId: string,
  eventType: string,
  payload: WebhookDeliveryPayload,
): Promise<void> {
  try {
    const result = await query(
      `SELECT id, teamId, url, secret, "eventTypes", active
       FROM team_webhooks
       WHERE teamId = $1 AND active = TRUE`,
      [teamId],
    );
    const webhooks = result.rows as TeamWebhookRow[];
    const matching = webhooks.filter(
      (w) => w.eventTypes.length === 0 || w.eventTypes.includes(eventType),
    );
    if (matching.length === 0) return;
    await Promise.allSettled(matching.map((w) => deliverTeamWebhook(w, payload)));
  } catch (err: unknown) {
    log.error('Error sending team webhooks:', err instanceof Error ? err.message : err);
  }
}

export async function testTeamWebhook(
  teamId: string,
  webhookId: string,
): Promise<{ ok: boolean; status: number }> {
  try {
    const result = await query(
      `SELECT id, teamId, url, secret, "eventTypes", active
       FROM team_webhooks
       WHERE id = $1 AND teamId = $2`,
      [webhookId, teamId],
    );
    if (result.rows.length === 0) return { ok: false, status: 0 };
    const webhook = result.rows[0] as TeamWebhookRow;

    const payload: WebhookDeliveryPayload = {
      event: 'test',
      title: 'HashWatch Webhook Test',
      body: 'Connection test — successful!',
      severity: 'info',
      data: { webhookId: webhook.id },
      timestamp: Date.now(),
    };
    return deliverTeamWebhook(webhook, payload);
  } catch (err: unknown) {
    log.error('Error testing team webhook:', err instanceof Error ? err.message : err);
    return { ok: false, status: 0 };
  }
}

export async function retryFailedTeamWebhooks(): Promise<void> {
  const now = Date.now();
  try {
    const result = await query(
      `SELECT wl.id AS logId, wl.url, wl.event, wl.payload, w.secret, wl.attempts
       FROM webhook_logs wl
       JOIN team_webhooks w ON w.id = wl.webhookId
       WHERE wl.status = 'failed'
         AND wl.webhookId IS NOT NULL
         AND wl.nextRetryAt IS NOT NULL
         AND wl.nextRetryAt <= $1
         AND wl.attempts < $2
         AND w.active = TRUE
       ORDER BY wl.nextRetryAt ASC
       LIMIT $3`,
      [now, MAX_RETRY_ATTEMPTS, MAX_RETRIES_PER_SWEEP],
    );
    const rows = result.rows as RetryRow[];

    for (const row of rows) {
      const rawBody = typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload);
      try {
        const response = await axios.post(row.url, rawBody, {
          timeout: WEBHOOK_TIMEOUT_MS,
          headers: signatureHeaders(row.secret, rawBody, row.event),
        });
        await query(
          `UPDATE webhook_logs
           SET status = 'delivered', responseCode = $2, nextRetryAt = NULL, attempts = attempts + 1
           WHERE id = $1`,
          [row.logid, response.status],
        );
      } catch (error) {
        const status = error instanceof axios.AxiosError ? (error.response?.status ?? 0) : 0;
        const attempts = row.attempts + 1;
        const nextRetryAt =
          attempts >= MAX_RETRY_ATTEMPTS ? null : Date.now() + retryBackoffMs(attempts + 1);
        await query(
          `UPDATE webhook_logs
           SET status = 'failed', responseCode = $2, attempts = $3, nextRetryAt = $4
           WHERE id = $1`,
          [row.logid, status, attempts, nextRetryAt],
        );
      }
    }
  } catch (err: unknown) {
    log.error('Error retrying team webhooks:', err instanceof Error ? err.message : err);
  }
}

let retryInterval: ReturnType<typeof setInterval> | null = null;

export function startTeamWebhookRetrySweeper(): void {
  if (retryInterval) return;
  void retryFailedTeamWebhooks();
  retryInterval = setInterval(() => {
    void retryFailedTeamWebhooks();
  }, SWEEPER_INTERVAL_MS).unref();
}

export function stopTeamWebhookRetrySweeper(): void {
  if (retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
  }
}
