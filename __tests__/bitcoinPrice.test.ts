import { renderHook, act, cleanup } from '@testing-library/react-native';

const mockFetch = jest.fn();

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  jest.useRealTimers();
  (global as any).fetch = mockFetch;
  const bp = require('../src/services/bitcoinPrice');
  bp.__resetBitcoinPrice();
});

afterEach(() => {
  jest.useRealTimers();
});

function mockOkPrice(usd: number): void {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ bitcoin: { usd } }) });
}

describe('getBitcoinPrice', () => {
  it('fetches a fresh price from CoinGecko', async () => {
    mockOkPrice(68000);
    const { getBitcoinPrice } = require('../src/services/bitcoinPrice');
    expect(await getBitcoinPrice()).toBe(68000);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    );
  });

  it('caches the price within the TTL window', async () => {
    mockOkPrice(68000);
    const { getBitcoinPrice } = require('../src/services/bitcoinPrice');
    await getBitcoinPrice();
    await getBitcoinPrice();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('refetches after the TTL expires', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    mockOkPrice(68000);
    const { getBitcoinPrice } = require('../src/services/bitcoinPrice');
    expect(await getBitcoinPrice()).toBe(68000);
    jest.advanceTimersByTime(61_000);
    mockOkPrice(69000);
    expect(await getBitcoinPrice()).toBe(69000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns the cached price when the response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const { getBitcoinPrice } = require('../src/services/bitcoinPrice');
    expect(await getBitcoinPrice()).toBe(100_000);
  });

  it('returns the fallback when bitcoin data is missing', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const { getBitcoinPrice } = require('../src/services/bitcoinPrice');
    expect(await getBitcoinPrice()).toBe(100_000);
  });

  it('keeps the fallback when the price is not positive', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ bitcoin: { usd: 0 } }) });
    const { getBitcoinPrice } = require('../src/services/bitcoinPrice');
    expect(await getBitcoinPrice()).toBe(100_000);
  });

  it('returns the fallback when the request throws', async () => {
    mockFetch.mockRejectedValue(new Error('network'));
    const { getBitcoinPrice } = require('../src/services/bitcoinPrice');
    expect(await getBitcoinPrice()).toBe(100_000);
  });

  it('deduplicates concurrent requests', async () => {
    mockOkPrice(68000);
    const { getBitcoinPrice } = require('../src/services/bitcoinPrice');
    const [a, b] = await Promise.all([getBitcoinPrice(), getBitcoinPrice()]);
    expect(a).toBe(68000);
    expect(b).toBe(68000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('refetches after a reset', async () => {
    mockOkPrice(68000);
    const bp = require('../src/services/bitcoinPrice');
    await bp.getBitcoinPrice();
    mockFetch.mockClear();
    bp.__resetBitcoinPrice();
    mockOkPrice(70000);
    expect(await bp.getBitcoinPrice()).toBe(70000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('useBitcoinPrice', () => {
  it('tracks price, loading and lastUpdated', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    mockOkPrice(68000);
    const { useBitcoinPrice } = require('../src/services/bitcoinPrice');
    const { result, unmount } = await renderHook(() => useBitcoinPrice());

    expect(result.current.price).toBe(68000);
    expect(result.current.loading).toBe(false);
    expect(result.current.lastUpdated).toBe(1_000_000);

    jest.advanceTimersByTime(60_000);
    await act(async () => {});
    expect(mockFetch).toHaveBeenCalledTimes(2);

    unmount();
  });
});

describe('convertBTCToUSD', () => {
  it('formats whole dollar values with commas', () => {
    const { convertBTCToUSD } = require('../src/services/bitcoinPrice');
    expect(convertBTCToUSD(1, 68000)).toBe('$68,000.00');
    expect(convertBTCToUSD(2, 50000)).toBe('$100,000.00');
  });

  it('formats sub-dollar cent values', () => {
    const { convertBTCToUSD } = require('../src/services/bitcoinPrice');
    expect(convertBTCToUSD(0.0001, 68000)).toBe('$6.80');
  });

  it('formats small cent values with four decimals', () => {
    const { convertBTCToUSD } = require('../src/services/bitcoinPrice');
    expect(convertBTCToUSD(0.0000001, 68000)).toBe('$0.0068');
  });

  it('uses the cached price when no price is provided', () => {
    const { convertBTCToUSD } = require('../src/services/bitcoinPrice');
    expect(convertBTCToUSD(0.5)).toBe('$50,000.00');
  });
});

describe('formatSatoshiBTC', () => {
  it('formats whole bitcoins with four decimals', () => {
    const { formatSatoshiBTC } = require('../src/services/bitcoinPrice');
    expect(formatSatoshiBTC(100_000_000)).toBe('1.0000 BTC');
    expect(formatSatoshiBTC(123_456_789)).toBe('1.2346 BTC');
  });

  it('formats millibitcoin values', () => {
    const { formatSatoshiBTC } = require('../src/services/bitcoinPrice');
    expect(formatSatoshiBTC(150_000)).toBe('1.50 mBTC');
    expect(formatSatoshiBTC(1_000_000)).toBe('10.00 mBTC');
  });

  it('formats microbitcoin values', () => {
    const { formatSatoshiBTC } = require('../src/services/bitcoinPrice');
    expect(formatSatoshiBTC(100)).toBe('1 μBTC');
    expect(formatSatoshiBTC(5_000)).toBe('50 μBTC');
  });

  it('formats raw satoshi values', () => {
    const { formatSatoshiBTC } = require('../src/services/bitcoinPrice');
    expect(formatSatoshiBTC(5)).toBe('5 sat');
    expect(formatSatoshiBTC(0)).toBe('0 sat');
  });
});
