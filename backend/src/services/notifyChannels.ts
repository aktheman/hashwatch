const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

export async function sendSmsNotification(phoneNumber: string, message: string): Promise<void> {
  log.info(`[SMS] Sending to ${phoneNumber}: ${message}`);
}

export async function sendTelegramNotification(chatId: string, message: string): Promise<void> {
  log.info(`[Telegram] Sending to chat ${chatId}: ${message}`);
}

export async function sendChannelNotification(
  channel: { type: string; config: Record<string, string> },
  message: string,
): Promise<void> {
  switch (channel.type) {
    case 'sms':
      await sendSmsNotification(channel.config.phoneNumber, message);
      break;
    case 'telegram':
      await sendTelegramNotification(channel.config.chatId, message);
      break;
    default:
      log.warn('Unknown channel type:', channel.type);
  }
}
