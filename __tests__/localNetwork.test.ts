import { isPrivateIP } from '../src/utils/network';

describe('localNetwork utilities', () => {
  describe('isPrivateIP', () => {
    it('identifies private IPs correctly', () => {
      expect(isPrivateIP('192.168.1.1')).toBe(true);
      expect(isPrivateIP('10.0.0.5')).toBe(true);
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.2.3.4')).toBe(false);
    });
  });
});
