import { log } from '../logger';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendSmsNotification(phoneNumber: string, message: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    log.warn(
      '[SMS] Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)',
    );
    return;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    To: phoneNumber,
    From: TWILIO_FROM_NUMBER,
    Body: message,
  });
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!resp.ok) {
    throw new Error(`Twilio SMS failed: ${resp.status} ${await resp.text()}`);
  }
}

export async function sendTelegramNotification(chatId: string, message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    log.warn('[Telegram] TELEGRAM_BOT_TOKEN not configured');
    return;
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  });
  if (!resp.ok) {
    throw new Error(`Telegram send failed: ${resp.status} ${await resp.text()}`);
  }
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
