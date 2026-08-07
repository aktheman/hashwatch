import {
  generateWebhookSecret,
  computeWebhookSignature,
  buildWebhookSignatureHeader,
  parseWebhookSignatureHeader,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_TTL_SECONDS,
} from '../utils/webhookSigning';

describe('generateWebhookSecret', () => {
  it('generates a 64-character hex secret', () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique secrets', () => {
    expect(generateWebhookSecret()).not.toBe(generateWebhookSecret());
  });
});

describe('computeWebhookSignature', () => {
  it('is deterministic for the same inputs', () => {
    const a = computeWebhookSignature('secret', '1234', '{"a":1}');
    const b = computeWebhookSignature('secret', '1234', '{"a":1}');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when the timestamp or body changes', () => {
    const base = computeWebhookSignature('secret', '1234', '{"a":1}');
    expect(computeWebhookSignature('secret', '5678', '{"a":1}')).not.toBe(base);
    expect(computeWebhookSignature('secret', '1234', '{"a":2}')).not.toBe(base);
  });
});

describe('buildWebhookSignatureHeader', () => {
  it('builds a t/v1 header with a hex signature', () => {
    const { header, timestamp } = buildWebhookSignatureHeader('secret', '{"a":1}');
    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    expect(timestamp).toMatch(/^\d+$/);
  });
});

describe('parseWebhookSignatureHeader', () => {
  it('parses a valid header', () => {
    const parsed = parseWebhookSignatureHeader('t=1234,v1=abcd');
    expect(parsed).toEqual({ timestamp: '1234', signature: 'abcd' });
  });

  it('returns null when parts are missing', () => {
    expect(parseWebhookSignatureHeader('v1=abcd')).toBeNull();
    expect(parseWebhookSignatureHeader('t=1234')).toBeNull();
    expect(parseWebhookSignatureHeader('not-a-header')).toBeNull();
  });
});

describe('verifyWebhookSignature', () => {
  const secret = 'topsecret';
  const body = JSON.stringify({ event: 'offline', minerId: 'm1' });
  const now = Math.floor(Date.now() / 1000);

  it('accepts a valid signature', () => {
    const { header } = buildWebhookSignatureHeader(secret, body);
    expect(verifyWebhookSignature(secret, header, body, { nowSeconds: now })).toBe(true);
  });

  it('rejects a tampered body', () => {
    const { header } = buildWebhookSignatureHeader(secret, body);
    expect(verifyWebhookSignature(secret, header, body + 'x', { nowSeconds: now })).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const { header } = buildWebhookSignatureHeader('othersecret', body);
    expect(verifyWebhookSignature(secret, header, body, { nowSeconds: now })).toBe(false);
  });

  it('rejects an expired signature', () => {
    const { header } = buildWebhookSignatureHeader(secret, body);
    const expiredAt = now + WEBHOOK_SIGNATURE_TTL_SECONDS + 1;
    expect(verifyWebhookSignature(secret, header, body, { nowSeconds: expiredAt })).toBe(false);
  });

  it('rejects a malformed header', () => {
    expect(verifyWebhookSignature(secret, 'garbage', body, { nowSeconds: now })).toBe(false);
  });

  it('rejects a signature of a different length', () => {
    const { header } = buildWebhookSignatureHeader(secret, body);
    const short = header.slice(0, -10);
    expect(verifyWebhookSignature(secret, short, body, { nowSeconds: now })).toBe(false);
  });
});
