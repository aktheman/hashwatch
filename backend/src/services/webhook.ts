import axios from 'axios';
import { URL } from 'url';
import { query } from '../db';
import { captureException } from './sentry';

interface WebhookPayload {
  event: string;
  minerId: string;
  minerName: string;
  title: string;
  body: string;
  timestamp: number;
}

function isPrivateHost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return true;
    if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.')) {
      const second = parseInt(host.split('.')[1] || '0', 10);
      if (host.startsWith('172.') && (second < 16 || second > 31)) return false;
      return true;
    }
    if (host === '169.254.169.254') return true;
    if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) return true;
    return false;
  } catch {
    return true;
  }
}

export async function sendWebhook(
  userId: string,
  payload: WebhookPayload,
): Promise<void> {
  let webhookUrl = '';
  try {
    const result = await query(
      'SELECT value FROM user_settings WHERE userId = $1 AND key = $2',
      [userId, 'webhook_url'],
    );
    if (result.rows.length === 0) return;
    webhookUrl = (result.rows[0] as { value: string }).value;
    if (!webhookUrl || !webhookUrl.startsWith('http')) return;
    if (isPrivateHost(webhookUrl)) return;

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
    const status = error instanceof axios.AxiosError ? error.response?.status ?? 0 : 0;
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
