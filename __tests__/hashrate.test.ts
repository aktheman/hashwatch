import { toHashesPerSecond, formatHashrateValue } from '../src/utils/hashrate';

describe('toHashesPerSecond', () => {
  it('converts GH/s', () => expect(toHashesPerSecond(500, 'GH/s')).toBe(500e9));
  it('converts TH/s', () => expect(toHashesPerSecond(1.5, 'TH/s')).toBe(1.5e12));
  it('defaults to GH/s', () => expect(toHashesPerSecond(1)).toBe(1e9));
});

describe('formatHashrateValue', () => {
  it('formats GH/s', () => expect(formatHashrateValue(500e9)).toBe('500.0 GH/s'));
  it('formats TH/s', () => expect(formatHashrateValue(1.5e12)).toBe('1.5 TH/s'));
});
