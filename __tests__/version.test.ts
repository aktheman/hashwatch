import {
  parseVersion,
  needsUpdate,
  LATEST_FIRMWARE,
  getFirmwareUrl,
  fetchLatestFirmware,
  getFirmwareChangelogUrl,
} from '../src/utils/version';

describe('parseVersion', () => {
  it('extracts semver from full string', () => {
    expect(parseVersion('v2.0.0')).toBe('v2.0.0');
    expect(parseVersion('2.0.0')).toBe('v2.0.0');
    expect(parseVersion('ESP-Miner v2.1.0')).toBe('v2.1.0');
  });

  it('returns null for invalid input', () => {
    expect(parseVersion('')).toBeNull();
    expect(parseVersion('abc')).toBeNull();
  });
});

describe('needsUpdate', () => {
  it('returns true when current < latest', () => {
    expect(needsUpdate('v2.0.0', 'v2.2.1')).toBe(true);
    expect(needsUpdate('v1.9.9', 'v2.0.0')).toBe(true);
  });

  it('returns false when current >= latest', () => {
    expect(needsUpdate('v2.2.1', 'v2.2.1')).toBe(false);
    expect(needsUpdate('v3.0.0', 'v2.2.1')).toBe(false);
  });

  it('uses LATEST_FIRMWARE by default', () => {
    expect(LATEST_FIRMWARE).toBe('v2.2.1');
  });

  it('handles partial version strings (missing patch/minor)', () => {
    expect(needsUpdate('v2', 'v2.2.1')).toBe(true);
    expect(needsUpdate('v3', 'v3.0.0')).toBe(false);
  });
});

describe('getFirmwareUrl', () => {
  it('returns the releases URL', () => {
    expect(getFirmwareUrl()).toBe('https://github.com/skot/bitaxe/releases/latest');
  });
});

describe('getFirmwareChangelogUrl', () => {
  it('returns the tag URL for a version', () => {
    expect(getFirmwareChangelogUrl('v2.0.0')).toBe(
      'https://github.com/skot/bitaxe/releases/tag/v2.0.0',
    );
  });
});

describe('fetchLatestFirmware', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null when fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    const result = await fetchLatestFirmware();
    expect(result).toBeNull();
  });

  it('returns null when response not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const result = await fetchLatestFirmware();
    expect(result).toBeNull();
  });

  it('returns parsed version when fetch succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: 'v2.2.1' }),
    });
    const result = await fetchLatestFirmware();
    expect(result).toBe('v2.2.1');
  });

  it('returns null when tag_name is empty', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: '' }),
    });
    const result = await fetchLatestFirmware();
    expect(result).toBeNull();
  });

  it('returns null when tag_name is not parseable', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: 'invalid' }),
    });
    const result = await fetchLatestFirmware();
    expect(result).toBeNull();
  });
});
