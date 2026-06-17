import { getExtra, getProxyUrl, setProxyUrl, initProxyUrl } from '../src/constants';

const mockSetSetting = jest.fn();
const mockGetSetting = jest.fn();

jest.mock('../src/db/database', () => ({
  setSetting: (k: string, v: string) => mockSetSetting(k, v),
  getSetting: (k: string) => mockGetSetting(k),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getExtra', () => {
  it('returns extra from expo config', () => {
    const extra = getExtra();
    expect(extra.apiUrl).toBe('http://localhost:4000');
    expect(extra.revenuecatIosKey).toBeDefined();
    expect(extra.revenuecatAndroidKey).toBeDefined();
  });

  it('returns empty object as Extra when expoConfig is undefined', () => {
    jest.resetModules();
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: undefined },
    }));
    const { getExtra: getE } = require('../src/constants');
    const extra = getE();
    expect(extra.apiUrl).toBeUndefined();
    expect(extra.revenuecatIosKey).toBeUndefined();
  });
});

describe('getProxyUrl', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns default proxy URL from expo config apiUrl', () => {
    const { getProxyUrl: getP } = require('../src/constants');
    expect(getP()).toBe('http://localhost:4000');
  });

  it('returns minerProxyUrl when set in expo config', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {
            apiUrl: 'http://api.example.com',
            revenuecatIosKey: 'ios_key',
            revenuecatAndroidKey: 'android_key',
            minerProxyUrl: 'http://proxy.example.com',
          },
        },
      },
    }));
    const { getProxyUrl: getP } = require('../src/constants');
    expect(getP()).toBe('http://proxy.example.com');
  });

  it('falls back to localhost when no URL is configured', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: { extra: {} } },
    }));
    const { getProxyUrl: getP } = require('../src/constants');
    expect(getP()).toBe('http://localhost:4000');
  });
});

describe('setProxyUrl', () => {
  it('updates proxy URL and persists to DB', async () => {
    mockSetSetting.mockResolvedValue(undefined);
    await setProxyUrl('http://new-proxy.com');
    expect(getProxyUrl()).toBe('http://new-proxy.com');
    expect(mockSetSetting).toHaveBeenCalledWith('proxy_url', 'http://new-proxy.com');
  });

  it('updates proxy URL even when DB save fails', async () => {
    mockSetSetting.mockRejectedValue(new Error('DB error'));
    await expect(setProxyUrl('http://fallback.com')).resolves.toBeUndefined();
    expect(getProxyUrl()).toBe('http://fallback.com');
  });
});

describe('initProxyUrl', () => {
  beforeEach(async () => {
    await setProxyUrl('http://localhost:4000');
  });

  it('loads saved proxy URL from DB', async () => {
    mockGetSetting.mockResolvedValue('http://saved-proxy.com');
    await initProxyUrl();
    expect(getProxyUrl()).toBe('http://saved-proxy.com');
  });

  it('keeps default when no saved URL exists', async () => {
    mockGetSetting.mockResolvedValue(null);
    await initProxyUrl();
    expect(getProxyUrl()).toBe('http://localhost:4000');
  });

  it('keeps default when DB read fails', async () => {
    mockGetSetting.mockRejectedValue(new Error('DB error'));
    await expect(initProxyUrl()).resolves.toBeUndefined();
    expect(getProxyUrl()).toBe('http://localhost:4000');
  });
});
