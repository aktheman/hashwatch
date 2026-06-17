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
  fetchNetworkHashrate,
  startPricePolling,
  setNetworkHashrate as _sn,
} from '../src/utils/hashrate';

beforeEach(() => {
  setNetworkHashrate(750_000_000_000_000_000_000);
  setBTCPrice(85000);
});

afterEach(() => {
  const stop = startPricePolling(999999);
  stop();
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

  it('falls back when API response has missing fields', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    const price = await fetchBTCPrice();
    expect(price).toBe(85000);
  });

  it('returns fetched BTC price from API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 50000 } }),
    });
    const price = await fetchBTCPrice();
    expect(price).toBe(50000);
    expect(getBTCPrice()).toBe(50000);
  });
});

describe('fetchNetworkHashrate', () => {
  it('falls back on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    const hps = await fetchNetworkHashrate();
    expect(hps).toBe(750_000_000_000_000_000_000);
  });

  it('falls back on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const hps = await fetchNetworkHashrate();
    expect(hps).toBe(750_000_000_000_000_000_000);
  });

  it('updates network hashrate on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ currentHashrate: 500_000_000_000_000_000_000 }),
    });
    const hps = await fetchNetworkHashrate();
    expect(hps).toBe(500_000_000_000_000_000_000);
    expect(getNetworkHashrate()).toBe(500_000_000_000_000_000_000);
  });

  it('falls back to current hashrate when data fields missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    const hps = await fetchNetworkHashrate();
    expect(hps).toBe(750_000_000_000_000_000_000);
  });
});

describe('startPricePolling', () => {
  it('starts polling interval and returns stop function', () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 50000 } }),
    });
    const stop = startPricePolling(999999);
    expect(typeof stop).toBe('function');
    jest.advanceTimersByTime(999999);
    expect(global.fetch).toHaveBeenCalled();
    stop();
    jest.useRealTimers();
  });
});
