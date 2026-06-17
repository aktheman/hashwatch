import { isAllowedProxyUrl } from '../utils/urlValidation';

describe('isAllowedProxyUrl', () => {
  it('allows 10.x.x.x private IPv4', () => {
    expect(isAllowedProxyUrl('http://10.0.0.1/api/info')).toBe(true);
  });

  it('allows 172.16-31.x.x private IPv4', () => {
    expect(isAllowedProxyUrl('http://172.16.0.1/api/info')).toBe(true);
    expect(isAllowedProxyUrl('http://172.31.255.1/api/info')).toBe(true);
    expect(isAllowedProxyUrl('http://172.32.0.1/api/info')).toBe(false);
  });

  it('allows 192.168.x.x private IPv4', () => {
    expect(isAllowedProxyUrl('http://192.168.1.100/api/info')).toBe(true);
  });

  it('allows 127.0.0.1 (loopback is treated as private)', () => {
    expect(isAllowedProxyUrl('http://127.0.0.1/api/info')).toBe(true);
  });

  it('allows 169.254.x.x (link-local is treated as private)', () => {
    expect(isAllowedProxyUrl('http://169.254.1.1/api/info')).toBe(true);
  });

  it('allows 0.0.0.0 (unspecified is treated as private)', () => {
    expect(isAllowedProxyUrl('http://0.0.0.0/api/info')).toBe(true);
  });

  it('blocks public hostnames', () => {
    expect(isAllowedProxyUrl('http://example.com/api/info')).toBe(false);
    expect(isAllowedProxyUrl('http://google.com/api/info')).toBe(false);
  });

  it('blocks blocked hostnames (localhost, metadata)', () => {
    expect(isAllowedProxyUrl('http://localhost/api/info')).toBe(false);
    expect(isAllowedProxyUrl('http://metadata.google.internal/api/info')).toBe(false);
  });

  it('blocks public non-localhost hostnames', () => {
    expect(isAllowedProxyUrl('http://example.com/api/info')).toBe(false);
  });

  it('rejects non-http/https protocols', () => {
    expect(isAllowedProxyUrl('ftp://192.168.1.1/file')).toBe(false);
    expect(isAllowedProxyUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(isAllowedProxyUrl('not-a-url')).toBe(false);
    expect(isAllowedProxyUrl('')).toBe(false);
  });
});
