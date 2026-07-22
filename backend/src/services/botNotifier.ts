import axios from 'axios';
import { captureException } from './sentry';
import { log } from '../logger';
import { isAllowedUrl } from '../utils/ssrf';

export interface BotChannel {
  id: string;
  userId: string;
  type: 'discord' | 'telegram';
  webhookUrl: string;
  name: string;
  createdAt: number;
}

export async function sendDiscordAlert(
  webhookUrl: string,
  title: string,
  message: string,
): Promise<void> {
  if (!(await isAllowedUrl(webhookUrl))) return;
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
  if (!(await isAllowedUrl(webhookUrl))) return;
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
