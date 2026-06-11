import {
  formatHashrate,
  formatTemperature,
  formatVoltage,
  formatPower,
  formatUptime,
  formatNumber,
  formatDifficulty,
  formatWTHs,
} from '../src/utils/formatters';

describe('formatHashrate', () => {
  it('formats 0', () => expect(formatHashrate(0)).toBe('0 H/s'));
  it('formats H/s', () => expect(formatHashrate(500)).toBe('500.0 H/s'));
  it('formats KH/s', () => expect(formatHashrate(1500)).toBe('1.5 KH/s'));
  it('formats MH/s', () => expect(formatHashrate(1_500_000)).toBe('1.5 MH/s'));
  it('formats GH/s with unit', () => expect(formatHashrate(1.5, 'GH/s')).toBe('1.5 GH/s'));
  it('formats TH/s with unit', () => expect(formatHashrate(1.234, 'TH/s')).toBe('1.2 TH/s'));
});

describe('formatTemperature', () => {
  it('formats temp', () => expect(formatTemperature(65)).toBe('65°C'));
  it('formats negative', () => expect(formatTemperature(-5)).toBe('-5°C'));
});

describe('formatVoltage', () => {
  it('converts mV to V', () => expect(formatVoltage(1200)).toBe('1.200V'));
  it('handles zero', () => expect(formatVoltage(0)).toBe('0.000V'));
});

describe('formatPower', () => {
  it('formats watts', () => expect(formatPower(12.5)).toBe('12.50W'));
  it('handles zero', () => expect(formatPower(0)).toBe('0.00W'));
});

describe('formatUptime', () => {
  it('formats seconds only', () => expect(formatUptime(30)).toBe('30s'));
  it('formats minutes', () => expect(formatUptime(90)).toBe('1m 30s'));
  it('formats hours', () => expect(formatUptime(3661)).toBe('1h 1m 1s'));
  it('formats days', () => expect(formatUptime(90061)).toBe('1d 1h 1m 1s'));
});

describe('formatNumber', () => {
  it('formats with locale', () => {
    const result = formatNumber(1234);
    expect(result).toMatch(/1[\s,]?234/);
  });
  it('handles zero', () => expect(formatNumber(0)).toBe('0'));
});

describe('formatDifficulty', () => {
  it('formats 0', () => expect(formatDifficulty(0)).toBe('0'));
  it('formats K', () => expect(formatDifficulty(1500)).toBe('1.5K'));
  it('formats M', () => expect(formatDifficulty(2_500_000)).toBe('2.5M'));
  it('formats string input', () => expect(formatDifficulty('3500000')).toBe('3.5M'));
});

describe('formatWTHs', () => {
  it('computes W/THs from GH/s', () => expect(formatWTHs(12, 1000, 'GH/s')).toBe('12.0 W/THs'));
  it('returns dash for zero', () => expect(formatWTHs(12, 0, 'GH/s')).toBe('—'));
});
