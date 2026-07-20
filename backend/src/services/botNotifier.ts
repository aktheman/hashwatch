import axios from 'axios';
import { captureException } from './sentry';

const log = {
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

export interface BotChannel {
  id: string;
  userId: string;
  type: 'discord' | 'telegram';
  webhookUrl: string;
  name: string;
  createdAt: number;
}

function isPrivateHost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0')
      return true;
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

export async function sendDiscordAlert(
  webhookUrl: string,
  title: string,
  message: string,
): Promise<void> {
  if (isPrivateHost(webhookUrl)) return;
  await axios.post(
    webhookUrl,
    {
      embeds: [
        {
          title,
          description: message,
          color: 0xff6b35,
          footer: { text: 'HashWatch Alert' },
          timestamp: new Date().toISOString(),
        },
      ],
    },
    {
      timeout: 10_000,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export async function sendTelegramBotAlert(webhookUrl: string, message: string): Promise<void> {
  if (isPrivateHost(webhookUrl)) return;
  await axios.post(
    webhookUrl,
    {
      text: message,
      parse_mode: 'HTML',
    },
    {
      timeout: 10_000,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export async function sendBotAlert(
  channel: BotChannel,
  title: string,
  message: string,
): Promise<void> {
  try {
    if (channel.type === 'discord') {
      await sendDiscordAlert(channel.webhookUrl, title, message);
    } else if (channel.type === 'telegram') {
      await sendTelegramBotAlert(channel.webhookUrl, `<b>${title}</b>\n${message}`);
    }
  } catch (error) {
    log.error('Bot alert failed:', error instanceof Error ? error.message : error);
    captureException(error);
  }
}
