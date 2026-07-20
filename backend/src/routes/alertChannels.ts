import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendChannelNotification } from '../services/notifyChannels';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

export const alertChannelsRouter = Router();

interface AlertChannel {
  id: string;
  userId: string;
  type: 'sms' | 'telegram';
  config: Record<string, string>;
  createdAt: number;
}

const channels: Map<string, AlertChannel[]> = new Map();
const MAX_CHANNELS_PER_USER = 100;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

alertChannelsRouter.use(authMiddleware);

alertChannelsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const { type, config } = req.body;

    if (type !== 'sms' && type !== 'telegram') {
      return res.status(400).json({ error: 'Type must be "sms" or "telegram"' });
    }

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Config object is required' });
    }

    if (type === 'sms') {
      if (!config.phoneNumber || typeof config.phoneNumber !== 'string') {
        return res.status(400).json({ error: 'phoneNumber is required for SMS channels' });
      }
    }

    if (type === 'telegram') {
      if (!config.chatId || typeof config.chatId !== 'string') {
        return res.status(400).json({ error: 'chatId is required for Telegram channels' });
      }
    }

    const userChannels = channels.get(userId) || [];
    if (userChannels.length >= MAX_CHANNELS_PER_USER) {
      return res.status(400).json({ error: 'Channel limit reached' });
    }

    const channel: AlertChannel = {
      id: generateId(),
      userId,
      type,
      config,
      createdAt: Date.now(),
    };

    userChannels.push(channel);
    channels.set(userId, userChannels);

    log.info('Alert channel registered:', channel.id, 'type:', type, 'for user:', userId);
    res.status(201).json({ channel });
  } catch (err: unknown) {
    log.error('Error registering channel:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

alertChannelsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const userChannels = channels.get(userId) || [];
    res.json({ channels: userChannels });
  } catch (err: unknown) {
    log.error('Error listing channels:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

alertChannelsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const channelId = req.params.id;
    const userChannels = channels.get(userId) || [];
    const idx = userChannels.findIndex((c) => c.id === channelId);

    if (idx === -1) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    userChannels.splice(idx, 1);
    channels.set(userId, userChannels);

    log.info('Alert channel removed:', channelId, 'for user:', userId);
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error removing channel:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

alertChannelsRouter.post('/:id/test', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const channelId = req.params.id;
    const userChannels = channels.get(userId) || [];
    const channel = userChannels.find((c) => c.id === channelId);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const testMessage = 'HashWatch test notification — your alert channel is working!';
    await sendChannelNotification({ type: channel.type, config: channel.config }, testMessage);

    log.info('Test notification sent to channel:', channelId);
    res.json({ ok: true, message: 'Test notification sent' });
  } catch (err: unknown) {
    log.error('Error sending test notification:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { channels as alertChannelsStore };
