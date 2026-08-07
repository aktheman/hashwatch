import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const WEBHOOK_SIGNATURE_VERSION = 'v1';
export const WEBHOOK_SIGNATURE_TTL_SECONDS = 300;
export const WEBHOOK_SIGNATURE_HEADER = 'X-HashWatch-Signature';

export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

export function computeWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function buildWebhookSignatureHeader(
  secret: string,
  rawBody: string,
): { header: string; timestamp: string } {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = computeWebhookSignature(secret, timestamp, rawBody);
  return {
    header: `t=${timestamp},${WEBHOOK_SIGNATURE_VERSION}=${signature}`,
    timestamp,
  };
}

export interface ParsedWebhookSignature {
  timestamp: string;
  signature: string;
}

export function parseWebhookSignatureHeader(header: string): ParsedWebhookSignature | null {
  const parts = header.split(',');
  const map: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    map[part.slice(0, idx)] = part.slice(idx + 1);
  }
  const timestamp = map.t;
  const signature = map[WEBHOOK_SIGNATURE_VERSION];
  if (!timestamp || !signature) return null;
  return { timestamp, signature };
}

export function verifyWebhookSignature(
  secret: string,
  header: string,
  rawBody: string,
  opts: { maxAgeSeconds?: number; nowSeconds?: number } = {},
): boolean {
  const parsed = parseWebhookSignatureHeader(header);
  if (!parsed) return false;

  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxAge = opts.maxAgeSeconds ?? WEBHOOK_SIGNATURE_TTL_SECONDS;
  const parsedTime = Number(parsed.timestamp);
  if (!Number.isFinite(parsedTime)) return false;
  if (Math.abs(now - parsedTime) > maxAge) return false;

  const expected = computeWebhookSignature(secret, parsed.timestamp, rawBody);
  const actual = Buffer.from(parsed.signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (actual.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actual, expectedBuffer);
}
