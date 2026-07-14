jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: (obj: Record<string, unknown>) => obj.android || obj.default,
  },
}));

import { Platform } from 'react-native';
import axios from 'axios';

jest.mock('axios');

const mockGetAuthToken = jest.fn();
jest.mock('../src/store/authToken', () => ({
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
}));

const mockGetProxyUrl = jest.fn(() => 'http://localhost:4000');
const mockGetExtra = jest.fn(() => ({ apiUrl: 'http://localhost:4000' }));

jest.mock('../src/constants', () => ({
  getExtra: (...args: unknown[]) => mockGetExtra(...args),
  getProxyUrl: (...args: unknown[]) => mockGetProxyUrl(...args),
}));

import {
  checkForFirmwareUpdate,
  flashFirmware,
  FirmwareVersion,
} from '../src/services/firmwareUpdate';

const mockFirmware: FirmwareVersion = {
  version: 'v2.2.0',
  releaseDate: '2026-06-01',
  downloadUrl: 'https://github.com/bitaxeorg/AXeOS/releases/download/v2.2.0/bitaxe-v2.2.0.bin',
  changelog: 'Bug fixes',
  sha256: 'abc123',
};

function setOS(os: string) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

function makeGithubData(overrides: Record<string, unknown> = {}) {
  return {
    tag_name: 'v2.2.0',
    assets: [
      {
        name: 'bitaxe-v2.2.0.bin',
        browser_download_url: 'https://.../bitaxe-v2.2.0.bin',
        digest: 'sha256:abc123',
      },
    ],
    body: 'Bug fixes',
    published_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetProxyUrl.mockReturnValue('http://localhost:4000');
  mockGetExtra.mockReturnValue({ apiUrl: 'http://localhost:4000' });
  mockGetAuthToken.mockReturnValue(null);
  setOS('android');
});

describe('checkForFirmwareUpdate', () => {
  it('calls GitHub API on native and returns firmware version', async () => {
    const ghData = makeGithubData();
    const mockJson = jest.fn().mockResolvedValue(ghData);
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: mockJson } as any);

    const result = await checkForFirmwareUpdate('v2.1.0');

    expect(result).not.toBeNull();
    expect(result!.version).toBe('v2.2.0');
    expect(result!.changelog).toBe('Bug fixes');
    expect(result!.sha256).toBe('abc123');
  });

  it('returns null when already on latest version', async () => {
    const mockJson = jest.fn().mockResolvedValue(makeGithubData({ tag_name: 'v2.2.0' }));
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: mockJson } as any);

    const result = await checkForFirmwareUpdate('v2.2.0');

    expect(result).toBeNull();
  });

  it('returns null when fetch fails (not ok)', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false } as any);

    const result = await checkForFirmwareUpdate('v2.1.0');

    expect(result).toBeNull();
  });

  it('returns null when tag cannot be parsed', async () => {
    const mockJson = jest.fn().mockResolvedValue({ tag_name: 'invalid' });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: mockJson } as any);

    const result = await checkForFirmwareUpdate('v2.1.0');

    expect(result).toBeNull();
  });

  it('returns null when tag_name is empty', async () => {
    const mockJson = jest.fn().mockResolvedValue(makeGithubData({ tag_name: '' }));
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: mockJson } as any);

    const result = await checkForFirmwareUpdate('v2.1.0');

    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network'));

    const result = await checkForFirmwareUpdate('v2.1.0');

    expect(result).toBeNull();
  });

  it('generates fallback download URL when no bin asset', async () => {
    const mockJson = jest.fn().mockResolvedValue(makeGithubData({ assets: [] }));
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: mockJson } as any);

    const result = await checkForFirmwareUpdate('v2.1.0');

    expect(result!.downloadUrl).toContain('v2.2.0');
  });

  it('uses proxy on web platform', async () => {
    setOS('web');
    (axios.post as jest.Mock).mockResolvedValue({ data: makeGithubData() });

    const result = await checkForFirmwareUpdate('v2.1.0');

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/proxy/firmware-check',
      { currentVersion: 'v2.1.0' },
      expect.any(Object),
    );
    expect(result).not.toBeNull();
  });

  it('includes auth header on web when proxy matches apiUrl', async () => {
    setOS('web');
    mockGetAuthToken.mockReturnValue('test-token');
    (axios.post as jest.Mock).mockResolvedValue({ data: makeGithubData() });

    await checkForFirmwareUpdate('v2.1.0');

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('handles tag with no v prefix', async () => {
    const mockJson = jest.fn().mockResolvedValue(makeGithubData({ tag_name: '2.2.0' }));
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: mockJson } as any);

    const result = await checkForFirmwareUpdate('v2.1.0');

    expect(result).not.toBeNull();
    expect(result!.version).toBe('v2.2.0');
  });
});

describe('flashFirmware', () => {
  it('returns true on native platforms', async () => {
    setOS('android');
    const onProgress = jest.fn();

    const result = await flashFirmware('192.168.1.1', mockFirmware, onProgress);

    expect(result).toBe(true);
    expect(onProgress).toHaveBeenCalledWith(10);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('reports progress during flash', async () => {
    setOS('android');
    const onProgress = jest.fn();

    await flashFirmware('192.168.1.1', mockFirmware, onProgress);

    expect(onProgress).toHaveBeenCalledWith(10);
    expect(onProgress).toHaveBeenCalledWith(30);
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenCalledWith(70);
    expect(onProgress).toHaveBeenCalledWith(90);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('uses proxy on web', async () => {
    setOS('web');
    (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    const result = await flashFirmware('192.168.1.1', mockFirmware, jest.fn());

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/proxy/flash-firmware',
      { minerIp: '192.168.1.1', firmwareUrl: mockFirmware.downloadUrl },
      expect.objectContaining({ timeout: 120000 }),
    );
    expect(result).toBe(true);
  });

  it('returns false on web when API fails', async () => {
    setOS('web');
    (axios.post as jest.Mock).mockResolvedValue({ data: { success: false } });

    const result = await flashFirmware('192.168.1.1', mockFirmware, jest.fn());

    expect(result).toBe(false);
  });

  it('returns false on catch', async () => {
    setOS('web');
    (axios.post as jest.Mock).mockRejectedValue(new Error('fail'));

    const result = await flashFirmware('192.168.1.1', mockFirmware, jest.fn());

    expect(result).toBe(false);
  });

  it('includes auth header on web when proxy matches apiUrl', async () => {
    setOS('web');
    mockGetAuthToken.mockReturnValue('web-token');
    mockGetProxyUrl.mockReturnValue('http://localhost:4000');
    mockGetExtra.mockReturnValue({ apiUrl: 'http://localhost:4000' });
    (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    const result = await flashFirmware('192.168.1.1', mockFirmware, jest.fn());

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer web-token' }),
      }),
    );
    expect(result).toBe(true);
  });

  it('handles catch on native', async () => {
    setOS('android');
    const onProgress = jest.fn(() => {
      throw new Error('progress error');
    });

    const result = await flashFirmware('192.168.1.1', mockFirmware, onProgress);

    expect(result).toBe(false);
  });
});
