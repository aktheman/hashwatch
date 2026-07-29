import axios from 'axios';
import { Platform } from 'react-native';
import { getSetting, setSetting } from '../db/database';
import { sendTeamWebhook, type TeamWebhook } from './teamWebhooks';

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'push' | 'email' | 'sms' | 'telegram' | 'slack' | 'discord';
  enabled: boolean;
  config: Record<string, string>;
  events: string[];
}

export interface NotificationDelivery {
  channelId: string;
  channelType: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

const STORAGE_KEY = 'hashwatch_notification_channels';
const TIMEOUT_MS = 10_000;

let _channelCache: NotificationChannel[] | null = null;

function generateId(): string {
  return `nc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage(): NotificationChannel[] {
  if (_channelCache) return _channelCache;
  try {
    const raw = getSetting(STORAGE_KEY);
    if (raw && typeof raw === 'string') {
      _channelCache = JSON.parse(raw) as NotificationChannel[];
      return _channelCache!;
    }
  } catch {
    // fall through
  }
  _channelCache = [];
  return _channelCache!;
}

function saveToStorage(channels: NotificationChannel[]): void {
  _channelCache = channels;
  try {
    void setSetting(STORAGE_KEY, JSON.stringify(channels));
  } catch {
    // storage unavailable
  }
}

async function sendPush(
  channel: NotificationChannel,
  title: string,
  body: string,
): Promise<NotificationDelivery> {
  try {
    if (Platform.OS === 'web') {
      return {
        channelId: channel.id,
        channelType: 'push',
        success: false,
        error: 'Push notifications not supported on web',
        timestamp: Date.now(),
      };
    }

    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      return {
        channelId: channel.id,
        channelType: 'push',
        success: false,
        error: 'Permission denied',
        timestamp: Date.now(),
      };
    }

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });

    return { channelId: channel.id, channelType: 'push', success: true, timestamp: Date.now() };
  } catch (err) {
    return {
      channelId: channel.id,
      channelType: 'push',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown push error',
      timestamp: Date.now(),
    };
  }
}

async function sendEmail(
  channel: NotificationChannel,
  title: string,
  body: string,
): Promise<NotificationDelivery> {
  try {
    // TODO: Implement with actual email provider (SendGrid, AWS SES, etc.)
    const apiKey = channel.config.apiKey;
    const toAddress = channel.config.to;
    if (!apiKey || !toAddress) {
      return {
        channelId: channel.id,
        channelType: 'email',
        success: false,
        error: 'Missing apiKey or to address in config',
        timestamp: Date.now(),
      };
    }

    await axios.post(
      'https://api.emailjs.com/api/v1.0/email/send',
      {
        service_id: channel.config.serviceId || 'default',
        template_id: channel.config.templateId || 'default',
        user_id: apiKey,
        template_params: { to_email: toAddress, subject: title, message: body },
      },
      { timeout: TIMEOUT_MS },
    );

    return { channelId: channel.id, channelType: 'email', success: true, timestamp: Date.now() };
  } catch (err) {
    return {
      channelId: channel.id,
      channelType: 'email',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown email error',
      timestamp: Date.now(),
    };
  }
}

async function sendSms(
  channel: NotificationChannel,
  title: string,
  body: string,
): Promise<NotificationDelivery> {
  try {
    const accountSid = channel.config.accountSid;
    const authToken = channel.config.authToken;
    const fromNumber = channel.config.from;
    const toNumber = channel.config.to;
    if (!accountSid || !authToken || !fromNumber || !toNumber) {
      return {
        channelId: channel.id,
        channelType: 'sms',
        success: false,
        error: 'Missing Twilio credentials in config',
        timestamp: Date.now(),
      };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append('To', toNumber);
    params.append('From', fromNumber);
    params.append('Body', `${title}: ${body}`);

    await axios.post(url, params, {
      timeout: TIMEOUT_MS,
      auth: { username: accountSid, password: authToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return { channelId: channel.id, channelType: 'sms', success: true, timestamp: Date.now() };
  } catch (err) {
    return {
      channelId: channel.id,
      channelType: 'sms',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown SMS error',
      timestamp: Date.now(),
    };
  }
}

async function sendTelegram(
  channel: NotificationChannel,
  title: string,
  body: string,
): Promise<NotificationDelivery> {
  try {
    const botToken = channel.config.botToken;
    const chatId = channel.config.chatId;
    if (!botToken || !chatId) {
      return {
        channelId: channel.id,
        channelType: 'telegram',
        success: false,
        error: 'Missing botToken or chatId in config',
        timestamp: Date.now(),
      };
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(
      url,
      { chat_id: chatId, text: `*${title}*\n${body}`, parse_mode: 'Markdown' },
      { timeout: TIMEOUT_MS },
    );

    return { channelId: channel.id, channelType: 'telegram', success: true, timestamp: Date.now() };
  } catch (err) {
    return {
      channelId: channel.id,
      channelType: 'telegram',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown Telegram error',
      timestamp: Date.now(),
    };
  }
}

async function sendSlack(
  channel: NotificationChannel,
  title: string,
  body: string,
): Promise<NotificationDelivery> {
  try {
    const webhookUrl = channel.config.webhookUrl;
    if (!webhookUrl) {
      return {
        channelId: channel.id,
        channelType: 'slack',
        success: false,
        error: 'Missing webhookUrl in config',
        timestamp: Date.now(),
      };
    }

    const webhook: TeamWebhook = {
      id: channel.id,
      name: channel.name,
      url: webhookUrl,
      type: 'slack',
      enabled: true,
      events: channel.events,
    };

    const sent = await sendTeamWebhook(webhook, {
      event: 'notification',
      message: `${title}: ${body}`,
      severity: 'info',
      timestamp: Date.now(),
    });

    return {
      channelId: channel.id,
      channelType: 'slack',
      success: sent,
      error: sent ? undefined : 'Slack webhook failed',
      timestamp: Date.now(),
    };
  } catch (err) {
    return {
      channelId: channel.id,
      channelType: 'slack',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown Slack error',
      timestamp: Date.now(),
    };
  }
}

async function sendDiscord(
  channel: NotificationChannel,
  title: string,
  body: string,
): Promise<NotificationDelivery> {
  try {
    const webhookUrl = channel.config.webhookUrl;
    if (!webhookUrl) {
      return {
        channelId: channel.id,
        channelType: 'discord',
        success: false,
        error: 'Missing webhookUrl in config',
        timestamp: Date.now(),
      };
    }

    const webhook: TeamWebhook = {
      id: channel.id,
      name: channel.name,
      url: webhookUrl,
      type: 'discord',
      enabled: true,
      events: channel.events,
    };

    const sent = await sendTeamWebhook(webhook, {
      event: 'notification',
      message: `${title}: ${body}`,
      severity: 'info',
      timestamp: Date.now(),
    });

    return {
      channelId: channel.id,
      channelType: 'discord',
      success: sent,
      error: sent ? undefined : 'Discord webhook failed',
      timestamp: Date.now(),
    };
  } catch (err) {
    return {
      channelId: channel.id,
      channelType: 'discord',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown Discord error',
      timestamp: Date.now(),
    };
  }
}

const CHANNEL_SENDERS: Record<
  NotificationChannel['type'],
  (channel: NotificationChannel, title: string, body: string) => Promise<NotificationDelivery>
> = {
  push: sendPush,
  email: sendEmail,
  sms: sendSms,
  telegram: sendTelegram,
  slack: sendSlack,
  discord: sendDiscord,
};

export async function sendToChannel(
  channel: NotificationChannel,
  title: string,
  body: string,
): Promise<NotificationDelivery> {
  if (!channel.enabled) {
    return {
      channelId: channel.id,
      channelType: channel.type,
      success: false,
      error: 'Channel disabled',
      timestamp: Date.now(),
    };
  }

  const sender = CHANNEL_SENDERS[channel.type];
  if (!sender) {
    return {
      channelId: channel.id,
      channelType: channel.type,
      success: false,
      error: `Unknown channel type: ${channel.type}`,
      timestamp: Date.now(),
    };
  }

  return sender(channel, title, body);
}

export async function sendToAllChannels(
  title: string,
  body: string,
  event: string,
): Promise<NotificationDelivery[]> {
  const channels = await getChannels();
  const matching = channels.filter(
    (ch) => ch.enabled && (ch.events.length === 0 || ch.events.includes(event)),
  );

  return Promise.all(matching.map((ch) => sendToChannel(ch, title, body)));
}

export async function getChannels(): Promise<NotificationChannel[]> {
  return loadFromStorage();
}

export async function saveChannel(
  channel: Omit<NotificationChannel, 'id'>,
): Promise<NotificationChannel> {
  const channels = loadFromStorage();
  const existing = channels.find((c) => c.name === channel.name && c.type === channel.type);

  let saved: NotificationChannel;
  if (existing) {
    saved = { ...existing, ...channel };
    const idx = channels.findIndex((c) => c.id === existing.id);
    channels[idx] = saved;
  } else {
    saved = { ...channel, id: generateId() };
    channels.push(saved);
  }

  saveToStorage(channels);
  return saved;
}

export async function deleteChannel(id: string): Promise<void> {
  const channels = loadFromStorage().filter((c) => c.id !== id);
  saveToStorage(channels);
}

export async function testChannel(channel: NotificationChannel): Promise<boolean> {
  const result = await sendToChannel(channel, 'HashWatch Test', 'Connection test — successful!');
  return result.success;
}
