import axios from 'axios';
import { query } from '../db';
import { captureException } from './sentry';
import { isAllowedUrl } from '../utils/ssrf';
import { buildWebhookSignatureHeader, generateWebhookSecret } from '../utils/webhookSigning';

interface WebhookPayload {
  event: string;
  minerId: string;
  minerName: string;
  title: string;
  body: string;
  timestamp: number;
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

async function getWebhookSecret(userId: string): Promise<string> {
  const result = await query('SELECT value FROM user_settings WHERE userId = $1 AND key = $2', [
    userId,
    'webhook_secret',
  ]);
  if (result.rows.length > 0) {
    return (result.rows[0] as { value: string }).value;
  }
  const secret = generateWebhookSecret();
  await query(
    `INSERT INTO user_settings (userId, key, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (userId, key) DO UPDATE SET value = EXCLUDED.value`,
    [userId, 'webhook_secret', secret],
  );
  return secret;
}

export async function sendWebhook(userId: string, payload: WebhookPayload): Promise<void> {
  let webhookUrl = '';
  try {
    const result = await query('SELECT value FROM user_settings WHERE userId = $1 AND key = $2', [
      userId,
      'webhook_url',
    ]);
    if (result.rows.length === 0) return;
    webhookUrl = (result.rows[0] as { value: string }).value;
    if (!webhookUrl || !webhookUrl.startsWith('http')) return;
    if (!(await isAllowedUrl(webhookUrl))) return;

    const secret = await getWebhookSecret(userId);
    const rawBody = JSON.stringify(payload);
    const response = await axios.post(webhookUrl, rawBody, {
      timeout: 10_000,
      headers: signatureHeaders(secret, rawBody, payload.event),
    });

    await query(
      `INSERT INTO webhook_logs (userId, event, url, status, responseCode, payload, attempts)
       VALUES ($1, $2, $3, $4, $5, $6, 1)`,
      [userId, payload.event, webhookUrl, 'delivered', response.status, rawBody],
    );
  } catch (error: unknown) {
    const status = error instanceof axios.AxiosError ? (error.response?.status ?? 0) : 0;
    if (webhookUrl) {
      await query(
        `INSERT INTO webhook_logs (userId, event, url, status, responseCode, payload, attempts)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [userId, payload.event, webhookUrl, 'failed', status, JSON.stringify(payload)],
      ).catch(() => {});
    }
    captureException(error);
  }
}

export async function deleteWebhookLogsForUser(userId: string): Promise<void> {
  await query('DELETE FROM webhook_logs WHERE userId = $1', [userId]);
}
