import {
  toHashesPerSecond,
  formatHashrateValue,
  formatHashrateWithUnit,
  estimateBTCPerDay,
  formatBTC,
  formatUSD,
  getNetworkHashrate,
  setNetworkHashrate,
  getBTCPrice,
  setBTCPrice,
  fetchBTCPrice,
} from '../src/utils/hashrate';

beforeEach(() => {
  setNetworkHashrate(750_000_000_000_000_000_000);
  setBTCPrice(85000);
});

describe('toHashesPerSecond', () => {
  it('converts GH/s', () => expect(toHashesPerSecond(500, 'GH/s')).toBe(500e9));
  it('converts TH/s', () => expect(toHashesPerSecond(1.5, 'TH/s')).toBe(1.5e12));
  it('defaults to GH/s', () => expect(toHashesPerSecond(1)).toBe(1e9));
});

describe('formatHashrateValue', () => {
  it('formats GH/s', () => expect(formatHashrateValue(500e9)).toBe('500.0 GH/s'));
  it('formats TH/s', () => expect(formatHashrateValue(1.5e12)).toBe('1.5 TH/s'));
});

describe('formatHashrateWithUnit', () => {
  it('formats with unit', () => expect(formatHashrateWithUnit(500, 'GH/s')).toBe('500.0 GH/s'));
  it('converts when no unit', () => expect(formatHashrateWithUnit(500)).toBe('500.0 GH/s'));
});

describe('estimateBTCPerDay', () => {
  it('returns 0 for 0 hashrate', () => expect(estimateBTCPerDay(0)).toBe(0));
  it('returns positive for valid hashrate', () => {
    const btc = estimateBTCPerDay(500e9);
    expect(btc).toBeGreaterThan(0);
    expect(btc).toBeLessThan(1);
  });
});

describe('getNetworkHashrate / setNetworkHashrate', () => {
  it('overrides network hashrate', () => {
    setNetworkHashrate(100_000_000_000_000_000_000n);
    expect(getNetworkHashrate()).toBe(100_000_000_000_000_000_000n);
  });
});

describe('formatBTC', () => {
  it('formats BTC', () => expect(formatBTC(1.5)).toBe('1.5000 BTC'));
  it('formats mBTC', () => expect(formatBTC(0.001)).toBe('1.00 mBTC'));
  it('formats μBTC', () => expect(formatBTC(0.000001)).toBe('1 μBTC'));
  it('formats sat', () => expect(formatBTC(0.00000001)).toBe('1 sat'));
});

describe('formatUSD', () => {
  it('formats USD', () => expect(formatUSD(100000000)).toBe('$85000.00'));
  it('accepts custom BTC price', () => {
    setBTCPrice(50000);
    expect(formatUSD(100000000)).toBe('$50000.00');
  });
});

describe('getBTCPrice / setBTCPrice', () => {
  it('overrides BTC price', () => {
    setBTCPrice(100000);
    expect(getBTCPrice()).toBe(100000);
  });
});

describe('fetchBTCPrice', () => {
  it('falls back to current price on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    const price = await fetchBTCPrice();
    expect(price).toBe(85000);
  });
});
