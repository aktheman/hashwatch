const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import {
  getBitcoinPrice,
  convertBTCToUSD,
  formatSatoshiBTC,
  __resetBitcoinPrice,
} from '../src/services/bitcoinPrice';

beforeEach(() => {
  jest.clearAllMocks();
  __resetBitcoinPrice();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ bitcoin: { usd: 65000 } }),
  });
});

describe('getBitcoinPrice', () => {
  it('returns a number', async () => {
    const price = await getBitcoinPrice();
    expect(typeof price).toBe('number');
    expect(price).toBe(65000);
  });

  it('caches result on second call within TTL', async () => {
    const first = await getBitcoinPrice();
    const second = await getBitcoinPrice();
    expect(first).toBe(second);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to default on API failure', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    const price = await getBitcoinPrice();
    expect(price).toBe(100_000);
  });

  it('falls back to default when response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const price = await getBitcoinPrice();
    expect(price).toBe(100_000);
  });

  it('falls back to default when response has no bitcoin data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    const price = await getBitcoinPrice();
    expect(price).toBe(100_000);
  });
});

describe('convertBTCToUSD', () => {
  it('formats large amounts with commas', () => {
    const result = convertBTCToUSD(1.5, 65000);
    expect(result).toBe('$97,500.00');
  });

  it('formats small amounts with two decimals', () => {
    const result = convertBTCToUSD(0.0001, 65000);
    expect(result).toBe('$6.50');
  });

  it('formats very small amounts with four decimals', () => {
    const result = convertBTCToUSD(0.000001, 65000);
    expect(result).toBe('$0.07');
  });
});

describe('formatSatoshiBTC', () => {
  it('formats full BTC for large satoshi amounts', () => {
    const result = formatSatoshiBTC(100_000_000);
    expect(result).toBe('1.0000 BTC');
  });

  it('formats mBTC for medium amounts', () => {
    const result = formatSatoshiBTC(100_000);
    expect(result).toBe('1.00 mBTC');
  });

  it('formats μBTC for small amounts', () => {
    const result = formatSatoshiBTC(1000);
    expect(result).toBe('10 μBTC');
  });

  it('formats satoshis for tiny amounts', () => {
    const result = formatSatoshiBTC(10);
    expect(result).toBe('10 sat');
  });
});

describe('__resetBitcoinPrice', () => {
  it('clears cache so next call fetches fresh data', async () => {
    await getBitcoinPrice();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    __resetBitcoinPrice();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 70000 } }),
    });
    const price = await getBitcoinPrice();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(price).toBe(70000);
  });
});
