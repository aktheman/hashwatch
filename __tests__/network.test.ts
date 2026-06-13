import { isPrivateIP } from '../src/utils/network';

describe('isPrivateIP', () => {
  it('returns true for 10.x.x.x', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true);
    expect(isPrivateIP('10.255.255.255')).toBe(true);
  });

  it('returns true for 172.16-31.x.x', () => {
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('172.31.255.255')).toBe(true);
    expect(isPrivateIP('172.32.0.1')).toBe(false);
  });

  it('returns true for 192.168.x.x', () => {
    expect(isPrivateIP('192.168.1.1')).toBe(true);
    expect(isPrivateIP('192.168.255.255')).toBe(true);
  });

  it('returns true for 127.x.x.x', () => {
    expect(isPrivateIP('127.0.0.1')).toBe(true);
  });

  it('returns true for 169.254.x.x', () => {
    expect(isPrivateIP('169.254.1.1')).toBe(true);
  });

  it('returns false for public IPs', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false);
    expect(isPrivateIP('1.1.1.1')).toBe(false);
    expect(isPrivateIP('203.0.113.1')).toBe(false);
  });

  it('returns false for invalid IPs', () => {
    expect(isPrivateIP('')).toBe(false);
    expect(isPrivateIP('invalid')).toBe(false);
    expect(isPrivateIP('256.1.1.1')).toBe(false);
    expect(isPrivateIP('1.2.3')).toBe(false);
  });
});
