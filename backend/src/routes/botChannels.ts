import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendBotAlert, BotChannel } from '../services/botNotifier';
import { log } from '../logger';
import { generateId } from '../utils/tokens';

export const botChannelsRouter = Router();

const channels: Map<string, BotChannel[]> = new Map();
const MAX_BOTS_PER_USER = 50;

botChannelsRouter.use(authMiddleware);

botChannelsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const { type, webhookUrl, name } = req.body;

    if (type !== 'discord' && type !== 'telegram') {
      return res.status(400).json({ error: 'Type must be "discord" or "telegram"' });
    }

    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
      return res.status(400).json({ error: 'A valid webhook URL is required' });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Bot name is required' });
    }

    const userChannels = channels.get(userId) || [];
    if (userChannels.length >= MAX_BOTS_PER_USER) {
      return res.status(400).json({ error: 'Bot channel limit reached (max 50)' });
    }

    const channel: BotChannel = {
      id: generateId(),
      userId,
      type,
      webhookUrl,
      name: name.trim(),
      createdAt: Date.now(),
    };

    userChannels.push(channel);
    channels.set(userId, userChannels);

    log.info('Bot channel registered:', channel.id, 'type:', type, 'for user:', userId);
    res.status(201).json({ channel });
  } catch (err: unknown) {
    log.error('Error registering bot channel:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

botChannelsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const userChannels = channels.get(userId) || [];
    res.json({ channels: userChannels });
  } catch (err: unknown) {
    log.error('Error listing bot channels:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

botChannelsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const channelId = req.params.id;
    const userChannels = channels.get(userId) || [];
    const idx = userChannels.findIndex((c) => c.id === channelId);

    if (idx === -1) {
      return res.status(404).json({ error: 'Bot channel not found' });
    }

    userChannels.splice(idx, 1);
    channels.set(userId, userChannels);

    log.info('Bot channel removed:', channelId, 'for user:', userId);
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error removing bot channel:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

botChannelsRouter.post('/:id/test', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const channelId = req.params.id;
    const userChannels = channels.get(userId) || [];
    const channel = userChannels.find((c) => c.id === channelId);

    if (!channel) {
      return res.status(404).json({ error: 'Bot channel not found' });
    }

    const testMessage = 'HashWatch test notification — your bot channel is working!';
    await sendBotAlert(channel, 'Test Notification', testMessage);

    log.info('Test bot alert sent to channel:', channelId);
    res.json({ ok: true, message: 'Test message sent' });
  } catch (err: unknown) {
    log.error('Error sending test bot alert:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { channels as botChannelsStore };
