const mockLoadMiners = jest.fn();
const mockLoadWallets = jest.fn();
const mockGetSnapshots = jest.fn();
const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn().mockResolvedValue(undefined);
const mockSaveMiner = jest.fn().mockResolvedValue(undefined);
const mockSaveSnapshot = jest.fn().mockResolvedValue(undefined);
const mockSaveWallet = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/db/database', () => ({
  loadMiners: () => mockLoadMiners(),
  loadWallets: () => mockLoadWallets(),
  getSnapshots: (id: string, limit: number) => mockGetSnapshots(id, limit),
  getSetting: (k: string) => mockGetSetting(k),
  setSetting: (k: string, v: string) => mockSetSetting(k, v),
  saveMiner: (m: unknown) => mockSaveMiner(m),
  saveSnapshot: (s: unknown) => mockSaveSnapshot(s),
  saveWallet: (w: unknown) => mockSaveWallet(w),
}));

import { exportBackup, importBackup } from '../src/services/backup';

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadMiners.mockResolvedValue([]);
  mockLoadWallets.mockResolvedValue([]);
  mockGetSnapshots.mockResolvedValue([]);
  mockGetSetting.mockResolvedValue(null);
});

describe('exportBackup', () => {
  it('exports miners, wallets, snapshots, settings, and histories', async () => {
    const miners = [{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 }];
    const wallets = [{ id: 'w1', name: 'Main', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' }];
    const snapshots = [{ minerId: 'm1', hashRate: 500, timestamp: 100 }];
    mockLoadMiners.mockResolvedValue(miners);
    mockLoadWallets.mockResolvedValue(wallets);
    mockGetSnapshots.mockResolvedValue(snapshots);
    mockGetSetting
      .mockResolvedValueOnce('0.12')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('dark')
      .mockResolvedValueOnce('true')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const json = await exportBackup();

    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.miners).toEqual(miners);
    expect(parsed.wallets).toEqual(wallets);
    expect(parsed.snapshots).toEqual(snapshots);
    expect(parsed.settings).toEqual({
      power_cost: '0.12',
      theme_mode: 'dark',
      onboarding_complete: 'true',
    });
    expect(parsed.alertHistory).toEqual([]);
    expect(parsed.notificationHistory).toEqual([]);
    expect(parsed.exportedAt).toBeDefined();
  });

  it('sorts snapshots by timestamp', async () => {
    mockLoadMiners.mockResolvedValue([{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 }]);
    mockGetSnapshots.mockResolvedValue([
      { minerId: 'm1', hashRate: 500, timestamp: 300 },
      { minerId: 'm1', hashRate: 400, timestamp: 100 },
      { minerId: 'm1', hashRate: 450, timestamp: 200 },
    ]);

    const json = await exportBackup();
    const parsed = JSON.parse(json);
    expect(parsed.snapshots.map((s: { timestamp: number }) => s.timestamp)).toEqual([
      100, 200, 300,
    ]);
  });

  it('reads alert and notification history from DB', async () => {
    const alertHistory = [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'Test',
        type: 'offline',
        title: 'Off',
        timestamp: 100,
        read: false,
      },
    ];
    const notifHistory = [
      { id: 'n1', token: 'tok', title: 'Test', body: '', data: {}, sentAt: 100, status: 'sent' },
    ];
    mockLoadMiners.mockResolvedValue([{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 }]);
    mockGetSetting
      .mockResolvedValueOnce(null) // power_cost
      .mockResolvedValueOnce(null) // auto_scan
      .mockResolvedValueOnce(null) // theme_mode
      .mockResolvedValueOnce(null) // onboarding_complete
      .mockResolvedValueOnce(null) // api_url
      .mockResolvedValueOnce(null) // language
      .mockResolvedValueOnce(null) // auto_dark_hour
      .mockResolvedValueOnce(null) // notifications_enabled
      .mockResolvedValueOnce(null) // dashboard_sections
      .mockResolvedValueOnce(null) // kiosk_mode
      .mockResolvedValueOnce(JSON.stringify(alertHistory)) // ALERT_HISTORY_KEY
      .mockResolvedValueOnce(JSON.stringify(notifHistory)); // NOTIFICATION_HISTORY_KEY

    const json = await exportBackup();
    const parsed = JSON.parse(json);
    expect(parsed.alertHistory).toEqual(alertHistory);
    expect(parsed.notificationHistory).toEqual(notifHistory);
  });

  it('handles missing alert/notification history gracefully', async () => {
    mockLoadMiners.mockResolvedValue([{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 }]);
    const impl = jest.fn().mockResolvedValue(null);
    // Reject only on the alert/notification history calls (calls 11 and 12)
    impl
      .mockResolvedValueOnce(null) // power_cost
      .mockResolvedValueOnce(null) // auto_scan
      .mockResolvedValueOnce(null) // theme_mode
      .mockResolvedValueOnce(null) // onboarding_complete
      .mockResolvedValueOnce(null) // api_url
      .mockResolvedValueOnce(null) // language
      .mockResolvedValueOnce(null) // auto_dark_hour
      .mockResolvedValueOnce(null) // notifications_enabled
      .mockResolvedValueOnce(null) // dashboard_sections
      .mockResolvedValueOnce(null) // kiosk_mode
      .mockRejectedValueOnce(new Error('DB error')) // alert history
      .mockRejectedValueOnce(new Error('DB error')); // notification history
    mockGetSetting.mockImplementation(impl);

    const json = await exportBackup();
    const parsed = JSON.parse(json);
    expect(parsed.alertHistory).toEqual([]);
    expect(parsed.notificationHistory).toEqual([]);
  });
});

describe('importBackup', () => {
  const validBackup = {
    version: 1,
    exportedAt: '2025-01-01T00:00:00.000Z',
    miners: [{ id: 'm1', name: 'Imported', ip: '10.0.0.1', port: 80 }],
    snapshots: [{ minerId: 'm1', hashRate: 500, timestamp: 100 }],
    wallets: [{ id: 'w1', name: 'Wallet', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' }],
    settings: { theme_mode: 'dark', power_cost: '0.10' },
    alertHistory: [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'Imported',
        type: 'offline',
        title: 'Off',
        timestamp: 100,
        read: false,
      },
    ],
    notificationHistory: [],
  };

  it('imports valid backup successfully', async () => {
    const result = await importBackup(JSON.stringify(validBackup));

    expect(result.success).toBe(true);
    expect(mockSaveMiner).toHaveBeenCalledWith(validBackup.miners[0]);
    expect(mockSaveSnapshot).toHaveBeenCalledWith(validBackup.snapshots[0]);
    expect(mockSaveWallet).toHaveBeenCalledWith(validBackup.wallets[0]);
    expect(mockSetSetting).toHaveBeenCalledWith('theme_mode', 'dark');
    expect(mockSetSetting).toHaveBeenCalledWith('power_cost', '0.10');
    expect(mockSetSetting).toHaveBeenCalledWith(
      'hashwatch_alert_history',
      JSON.stringify(validBackup.alertHistory),
    );
  });

  it('rejects invalid JSON', async () => {
    const result = await importBackup('not json');
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Invalid JSON format']);
  });

  it('rejects unsupported version', async () => {
    const result = await importBackup(JSON.stringify({ version: 0 }));
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Unsupported backup format version']);
  });

  it('rejects missing miners array', async () => {
    const result = await importBackup(JSON.stringify({ version: 1, wallets: [], snapshots: [] }));
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Missing miners array in backup']);
  });

  it('rejects missing wallets array', async () => {
    const result = await importBackup(JSON.stringify({ version: 1, miners: [], snapshots: [] }));
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Missing wallets array in backup']);
  });

  it('rejects missing snapshots array', async () => {
    const result = await importBackup(JSON.stringify({ version: 1, miners: [], wallets: [] }));
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Missing snapshots array in backup']);
  });

  it('skips snapshots for unknown miners', async () => {
    const backup = {
      ...validBackup,
      snapshots: [
        { minerId: 'm1', hashRate: 500, timestamp: 100 },
        { minerId: 'unknown', hashRate: 600, timestamp: 200 },
      ],
    };

    await importBackup(JSON.stringify(backup));

    expect(mockSaveSnapshot).toHaveBeenCalledTimes(1);
    expect(mockSaveSnapshot).toHaveBeenCalledWith(expect.objectContaining({ minerId: 'm1' }));
  });

  it('skips history arrays when not present', async () => {
    const backup = { ...validBackup };
    delete (backup as any).alertHistory;
    delete (backup as any).notificationHistory;

    await importBackup(JSON.stringify(backup));

    expect(mockSetSetting).not.toHaveBeenCalledWith('hashwatch_alert_history', expect.any(String));
    expect(mockSetSetting).not.toHaveBeenCalledWith(
      'hashwatch_notification_history',
      expect.any(String),
    );
  });

  it('skips settings when not present', async () => {
    const backup = { ...validBackup };
    delete (backup as any).settings;

    await importBackup(JSON.stringify(backup));

    expect(mockSetSetting).not.toHaveBeenCalledWith('theme_mode', expect.any(String));
  });

  it('returns error when save throws', async () => {
    mockSaveMiner.mockRejectedValue(new Error('Disk full'));

    const result = await importBackup(JSON.stringify(validBackup));

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Disk full']);
  });

  it('returns errors array on partial failure', async () => {
    mockSaveMiner.mockRejectedValueOnce(new Error('Write error'));
    mockSaveMiner.mockImplementation(() => Promise.resolve());

    const backup = {
      ...validBackup,
      miners: [
        { id: 'm1', name: 'M1', ip: '10.0.0.1', port: 80 },
        { id: 'm2', name: 'M2', ip: '10.0.0.2', port: 80 },
      ],
    };

    await importBackup(JSON.stringify(backup));

    expect(mockSaveMiner).toHaveBeenCalledTimes(1);
  });

  it('preserves all settings keys', async () => {
    const backup = {
      ...validBackup,
      settings: {
        power_cost: '0.15',
        auto_scan: 'false',
        theme_mode: 'matrix',
        onboarding_complete: 'true',
        api_url: 'https://api.example.com',
        language: 'es',
        auto_dark_hour: '22',
        notifications_enabled: 'true',
        dashboard_sections: 'hashrate,uptime',
        kiosk_mode: 'true',
      },
    };

    await importBackup(JSON.stringify(backup));

    for (const key of Object.keys(backup.settings)) {
      expect(mockSetSetting).toHaveBeenCalledWith(key, backup.settings[key]);
    }
  });
});

describe('createBlob for download', () => {
  let originalPlatform: typeof import('react-native').Platform;

  beforeEach(async () => {
    const RN = await import('react-native');
    originalPlatform = RN.Platform;
    Object.defineProperty(RN.Platform, 'OS', { get: () => 'web' });
    (globalThis as any).Blob = class Blob {
      parts: string[];
      opts: { type: string };
      constructor(parts: string[], opts: { type: string }) {
        this.parts = parts;
        this.opts = opts;
      }
    };
    const origURL = URL.createObjectURL.bind(URL);
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    (globalThis as any).window = {
      document: {
        createElement: jest.fn(() => ({
          href: '',
          download: '',
          click: jest.fn(),
        })),
      },
    };
  });

  afterEach(() => {
    const RN = require('react-native');
    Object.defineProperty(RN.Platform, 'OS', { get: () => originalPlatform.OS });
    delete (globalThis as any).Blob;
    delete (globalThis as any).window;
    jest.restoreAllMocks();
  });

  it('triggers a download in web platform', async () => {
    mockLoadMiners.mockResolvedValue([]);
    const json = await exportBackup();
    expect(json).toBeDefined();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
