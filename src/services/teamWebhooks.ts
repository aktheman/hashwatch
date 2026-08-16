import axios from 'axios';
import { getSetting, setSetting } from '../db/database';

export interface WebhookPayload {
  event: string;
  minerName?: string;
  minerIp?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface TeamWebhook {
  id: string;
  name: string;
  url: string;
  type: 'slack' | 'discord' | 'custom';
  enabled: boolean;
  events: string[];
}

const STORAGE_KEY = 'hashwatch_team_webhooks';
const TIMEOUT_MS = 10_000;

let _webhookCache: TeamWebhook[] | null = null;

const SEVERITY_COLORS: Record<string, number> = {
  info: 0x3b82f6,
  warning: 0xf59e0b,
  critical: 0xef4444,
};

function generateId(): string {
  return `tw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function loadFromStorage(): Promise<TeamWebhook[]> {
  if (_webhookCache) return _webhookCache;
  try {
    const raw = await getSetting(STORAGE_KEY);
    if (raw && typeof raw === 'string') {
      _webhookCache = JSON.parse(raw) as TeamWebhook[];
      return _webhookCache!;
    }
  } catch {
    // fall through
  }
  _webhookCache = [];
  return _webhookCache!;
}

function saveToStorage(webhooks: TeamWebhook[]): void {
  _webhookCache = webhooks;
  try {
    void setSetting(STORAGE_KEY, JSON.stringify(webhooks));
  } catch {
    // storage unavailable
  }
}

export function formatSlackMessage(payload: WebhookPayload): object {
  const severityEmoji: Record<string, string> = {
    info: ':information_source:',
    warning: ':warning:',
    critical: ':rotating_light:',
  };
  const emoji = severityEmoji[payload.severity] || ':bell:';
  const fields: object[] = [];

  if (payload.minerName) {
    fields.push({ type: 'mrkdwn', text: `*Miner:* ${payload.minerName}` });
  }
  if (payload.minerIp) {
    fields.push({ type: 'mrkdwn', text: `*IP:* ${payload.minerIp}` });
  }

  fields.push({
    type: 'mrkdwn',
    text: `*Severity:* ${payload.severity.toUpperCase()}`,
  });
  fields.push({
    type: 'mrkdwn',
    text: `*Event:* ${payload.event}`,
  });

  const blocks: object[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} HashWatch Alert`, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: payload.message },
    },
  ];

  if (fields.length > 0) {
    blocks.push({ type: 'section', fields });
  }

  if (payload.data && Object.keys(payload.data).length > 0) {
    const dataLines = Object.entries(payload.data)
      .map(([k, v]) => `• *${k}:* ${String(v)}`)
      .join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Details:*\n${dataLines}` },
    });
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `_Sent by HashWatch at <!date^${Math.floor(payload.timestamp / 1000)}^{date_short_pretty} {time_secs}|${new Date(payload.timestamp).toISOString()}>_`,
      },
    ],
  });

  return { blocks };
}

export function formatDiscordMessage(payload: WebhookPayload): object {
  const severityEmoji: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
  };
  const emoji = severityEmoji[payload.severity] || '🔔';
  const color = SEVERITY_COLORS[payload.severity] || 0x9ca3af;

  const fields: object[] = [];
  if (payload.minerName) {
    fields.push({ name: 'Miner', value: payload.minerName, inline: true });
  }
  if (payload.minerIp) {
    fields.push({ name: 'IP', value: payload.minerIp, inline: true });
  }
  fields.push({ name: 'Severity', value: payload.severity.toUpperCase(), inline: true });
  fields.push({ name: 'Event', value: payload.event, inline: true });

  const embed: object = {
    title: `${emoji} HashWatch Alert`,
    description: payload.message,
    color,
    fields,
    footer: { text: 'HashWatch' },
    timestamp: new Date(payload.timestamp).toISOString(),
  };

  if (payload.data && Object.keys(payload.data).length > 0) {
    const dataLines = Object.entries(payload.data)
      .map(([k, v]) => `**${k}:** ${String(v)}`)
      .join('\n');
    (embed as Record<string, unknown[]>).fields.push({
      name: 'Details',
      value: dataLines,
      inline: false,
    });
  }

  return { embeds: [embed] };
}

export async function sendTeamWebhook(
  webhook: TeamWebhook,
  payload: WebhookPayload,
): Promise<boolean> {
  if (!webhook.enabled || !webhook.url) return false;

  try {
    let body: object;
    if (webhook.type === 'slack') {
      body = formatSlackMessage(payload);
    } else if (webhook.type === 'discord') {
      body = formatDiscordMessage(payload);
    } else {
      body = payload;
    }

    await axios.post(webhook.url, body, {
      timeout: TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getTeamWebhooks(): Promise<TeamWebhook[]> {
  return loadFromStorage();
}

export async function saveTeamWebhook(webhook: Omit<TeamWebhook, 'id'>): Promise<TeamWebhook> {
  const webhooks = await loadFromStorage();
  const existing = webhooks.find((w) => w.url === webhook.url && w.name === webhook.name);

  let saved: TeamWebhook;
  if (existing) {
    saved = { ...existing, ...webhook };
    const idx = webhooks.findIndex((w) => w.id === existing.id);
    webhooks[idx] = saved;
  } else {
    saved = { ...webhook, id: generateId() };
    webhooks.push(saved);
  }

  saveToStorage(webhooks);
  return saved;
}

export async function deleteTeamWebhook(id: string): Promise<void> {
  const webhooks = (await loadFromStorage()).filter((w) => w.id !== id);
  saveToStorage(webhooks);
}

export async function testTeamWebhook(webhook: TeamWebhook): Promise<boolean> {
  const testPayload: WebhookPayload = {
    event: 'test',
    message: 'HashWatch webhook test — connection successful!',
    severity: 'info',
    timestamp: Date.now(),
    minerName: 'Test Miner',
    minerIp: '192.168.1.100',
  };
  return sendTeamWebhook(webhook, testPayload);
}

export function __resetTeamWebhooks(): void {
  _webhookCache = null;
}
