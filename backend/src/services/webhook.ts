import axios from 'axios';
import { query } from '../db';
import { captureException } from './sentry';
import { isAllowedUrl } from '../utils/ssrf';

interface WebhookPayload {
  event: string;
  minerId: string;
  minerName: string;
  title: string;
  body: string;
  timestamp: number;
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

    const response = await axios.post(webhookUrl, payload, {
      timeout: 10_000,
      headers: { 'Content-Type': 'application/json' },
    });

    await query(
      `INSERT INTO webhook_logs (userId, event, url, status, responseCode)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, payload.event, webhookUrl, 'delivered', response.status],
    );
  } catch (error: unknown) {
    const status = error instanceof axios.AxiosError ? (error.response?.status ?? 0) : 0;
    if (webhookUrl) {
      await query(
        `INSERT INTO webhook_logs (userId, event, url, status, responseCode)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, payload.event, webhookUrl, 'failed', status],
      ).catch(() => {});
    }
    captureException(error);
  }
}

export async function deleteWebhookLogsForUser(userId: string): Promise<void> {
  await query('DELETE FROM webhook_logs WHERE userId = $1', [userId]);
}
