import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import FirmwareScreen from '../src/screens/FirmwareScreen';
import { Alert, Linking } from 'react-native';

const mockOpenURL = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a1a',
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    primaryDark: '#5a52d5',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#3B82F6',
    info: '#06B6D4',
  }),
}));

jest.mock('../src/store/miners', () => ({
  useMinerStore: jest.fn(),
}));

jest.mock('../src/services/firmwareUpdate', () => {
  const actual = jest.requireActual('../src/services/firmwareUpdate');
  return {
    ...actual,
    checkForFirmwareUpdate: jest.fn(),
  };
});

jest.mock('../src/api/bitaxe', () => {
  const flashFirmware = jest.fn().mockResolvedValue(true);
  return {
    BitAxeClient: jest.fn(() => ({ flashFirmware })),
    __flashFirmware: flashFirmware,
  };
});

jest.mock('../src/services/otaFlash', () => ({
  flashMinerOTA: jest.fn(),
  batchFlashOTA: jest.fn(),
}));

jest.mock('../src/services/firmwareScheduler', () => ({
  getFirmwareScheduleSettings: jest.fn().mockResolvedValue({
    enabled: false,
    startHour: 0,
    endHour: 6,
    lastRunDay: null,
  }),
  setFirmwareScheduleSettings: jest.fn().mockResolvedValue(undefined),
  isInOffHours: jest.fn(() => false),
  OFF_HOURS_PRESETS: [
    { start: 0, end: 6, label: 'Midnight' },
    { start: 22, end: 6, label: 'Night' },
  ],
  DEFAULT_SCHEDULE: { enabled: false, startHour: 0, endHour: 6, lastRunDay: null },
}));

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/utils/haptics', () => ({
  light: jest.fn(),
  medium: jest.fn(),
  heavy: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  selection: jest.fn(),
}));

const DEFAULT_MINERS = [
  {
    id: 'm1',
    name: 'Miner A',
    ip: '10.0.0.1',
    port: 80,
    isOnline: true,
    apiPath: null,
    statusPath: null,
    status: null,
    info: { hostname: 'bitaxe-m1', version: '2.3.0' },
  },
  {
    id: 'm2',
    name: 'Miner B',
    ip: '10.0.0.2',
    port: 80,
    isOnline: true,
    apiPath: null,
    statusPath: null,
    status: null,
    info: { hostname: 'bitaxe-m2', version: '2.0.0' },
  },
];

const LATEST_VERSION = {
  version: 'v2.3.0',
  releaseDate: '2026-07-15T00:00:00.000Z',
  downloadUrl: 'https://github.com/bitaxeorg/AXeOS/releases/download/v2.3.0/bitaxe-v2.3.0.bin',
  changelog: [
    '- Added feature one',
    '- Fixed bug two',
    '* Improved three',
    '# Four',
    '- Five',
    '- Six',
    '- Seven',
    '- Eight',
  ].join('\n'),
  sha256: 'abc123',
};

jest.spyOn(Linking, 'openURL').mockImplementation(mockOpenURL);

let alertSpy: jest.SpyInstance;

const setMiners = (miners: unknown[]) => {
  const { useMinerStore } = jest.requireMock('../src/store/miners');
  useMinerStore.mockImplementation(
    (sel: (s: { miners: unknown[]; refreshAll: jest.Mock }) => unknown) =>
      sel({ miners, refreshAll: jest.fn() }),
  );
};

const renderLoaded = async () => {
  jest.useFakeTimers();
  await render(<FirmwareScreen />);
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
};

const pressCheckForUpdates = async () => {
  await fireEvent.press(screen.getByLabelText('firmware.checkForUpdates'));
  await waitFor(() => {
    expect(screen.getByText('firmware.latestRelease')).toBeTruthy();
  });
};

const pressAlertAction = async (index = 1) => {
  const calls = alertSpy.mock.calls;
  const buttons = calls[calls.length - 1][2] as { onPress?: () => void }[];
  await act(async () => {
    await buttons[index].onPress?.();
  });
};

let mockCheckForFirmwareUpdate: jest.Mock;
let mockFlashFirmware: jest.Mock;
let mockFlashMinerOTA: jest.Mock;
let mockBatchFlashOTA: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  setMiners(DEFAULT_MINERS);
  mockCheckForFirmwareUpdate = jest.requireMock(
    '../src/services/firmwareUpdate',
  ).checkForFirmwareUpdate;
  mockFlashFirmware = jest.requireMock('../src/api/bitaxe').__flashFirmware;
  const otaFlash = jest.requireMock('../src/services/otaFlash');
  mockFlashMinerOTA = otaFlash.flashMinerOTA;
  mockBatchFlashOTA = otaFlash.batchFlashOTA;
  mockCheckForFirmwareUpdate.mockResolvedValue(null);
  mockFlashFirmware.mockResolvedValue(true);
  mockFlashMinerOTA.mockResolvedValue({ minerId: 'm2', success: true });
  mockBatchFlashOTA.mockResolvedValue([]);
  const { getSetting } = jest.requireMock('../src/db/database');
  getSetting.mockResolvedValue(null);
  const scheduler = jest.requireMock('../src/services/firmwareScheduler');
  scheduler.getFirmwareScheduleSettings.mockResolvedValue({
    enabled: false,
    startHour: 0,
    endHour: 6,
    lastRunDay: null,
  });
  scheduler.setFirmwareScheduleSettings.mockResolvedValue(undefined);
  scheduler.isInOffHours.mockReturnValue(false);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  alertSpy.mockRestore();
});

describe('FirmwareScreen', () => {
  it('shows skeleton while initial loading', async () => {
    jest.useFakeTimers();
    await render(<FirmwareScreen />);
    expect(screen.queryByText('firmware.currentVersion')).toBeNull();
    expect(screen.queryByLabelText('firmware.checkForUpdates')).toBeNull();
  });

  it('renders current version section after loading', async () => {
    await renderLoaded();
    expect(screen.getByText('firmware.currentVersion')).toBeTruthy();
    expect(screen.getByText('firmware.builtIn')).toBeTruthy();
    expect(screen.getAllByText('v2.2.1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('firmware.checkForUpdates')).toBeTruthy();
    expect(screen.getByText('firmware.minerVersions')).toBeTruthy();
    expect(screen.getByText('firmware.footer')).toBeTruthy();
  });

  it('renders miner firmware versions', async () => {
    await renderLoaded();
    expect(screen.getByLabelText('Miner A, v2.3.0')).toBeTruthy();
    expect(screen.getByLabelText('Miner B, v2.0.0')).toBeTruthy();
    expect(screen.getByText('10.0.0.1')).toBeTruthy();
    expect(screen.getByText('10.0.0.2')).toBeTruthy();
  });

  it('shows empty state when no miners exist', async () => {
    setMiners([]);
    await renderLoaded();
    expect(screen.getByText('firmware.noMiners')).toBeTruthy();
  });

  it('shows no-online-miners message when all miners are offline', async () => {
    setMiners([
      {
        id: 'm1',
        name: 'Miner A',
        ip: '10.0.0.1',
        port: 80,
        isOnline: false,
        status: null,
        info: { hostname: 'bitaxe-m1', version: '2.0.0' },
      },
    ]);
    await renderLoaded();
    expect(screen.getByText('firmware.noOnlineMiners')).toBeTruthy();
  });

  it('renders the off-hours auto-update section', async () => {
    await renderLoaded();
    expect(screen.getByText('firmware.autoUpdate')).toBeTruthy();
    expect(screen.getByText('firmware.autoUpdateDesc')).toBeTruthy();
    expect(screen.getByLabelText('off-hours auto firmware update toggle')).toBeTruthy();
  });

  it('hides the window presets until auto-update is enabled', async () => {
    await renderLoaded();
    expect(screen.queryByLabelText('Set auto-update window to Midnight')).toBeNull();
  });

  it('enables auto-update and persists the setting', async () => {
    const scheduler = jest.requireMock('../src/services/firmwareScheduler');
    await renderLoaded();
    await fireEvent(
      screen.getByLabelText('off-hours auto firmware update toggle'),
      'valueChange',
      true,
    );
    await waitFor(() => {
      expect(scheduler.setFirmwareScheduleSettings).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true, startHour: 0, endHour: 6 }),
      );
    });
    expect(screen.getByLabelText('Set auto-update window to Midnight')).toBeTruthy();
  });

  it('selects an off-hours preset and persists it', async () => {
    const scheduler = jest.requireMock('../src/services/firmwareScheduler');
    await renderLoaded();
    await fireEvent(
      screen.getByLabelText('off-hours auto firmware update toggle'),
      'valueChange',
      true,
    );
    await fireEvent.press(screen.getByLabelText('Set auto-update window to Night'));
    await waitFor(() => {
      expect(scheduler.setFirmwareScheduleSettings).toHaveBeenLastCalledWith(
        expect.objectContaining({ enabled: true, startHour: 22, endHour: 6 }),
      );
    });
    expect(screen.getByText(/22:00/)).toBeTruthy();
  });

  it('fetches latest firmware and shows update available', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    await renderLoaded();
    await pressCheckForUpdates();
    expect(mockCheckForFirmwareUpdate).toHaveBeenCalledWith('v2.2.1');
    expect(screen.getAllByText('v2.3.0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('firmware.updateAvailable')).toBeTruthy();
    expect(screen.getByText(/firmware\.upToDate/)).toBeTruthy();
    expect(screen.getByText('firmware.needsUpdate')).toBeTruthy();
    expect(screen.getByLabelText('firmware.viewChangelog')).toBeTruthy();
    expect(screen.getByLabelText('firmware.skipVersion')).toBeTruthy();
    expect(screen.getByLabelText('firmware.flashOTA')).toBeTruthy();
    expect(screen.getByLabelText('firmware.selectAll')).toBeTruthy();
  });

  it('alerts when already up to date', async () => {
    await renderLoaded();
    await fireEvent.press(screen.getByLabelText('firmware.checkForUpdates'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('firmware.upToDateTitle', 'firmware.upToDateBody');
    });
    expect(screen.queryByText('firmware.latestRelease')).toBeNull();
  });

  it('alerts when the firmware check fails', async () => {
    mockCheckForFirmwareUpdate.mockRejectedValue(new Error('network'));
    await renderLoaded();
    await fireEvent.press(screen.getByLabelText('firmware.checkForUpdates'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'firmware.checkFailedTitle',
        'firmware.checkFailedBody',
      );
    });
  });

  it('alerts when the latest version was previously skipped', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    const { getSetting } = jest.requireMock('../src/db/database');
    getSetting.mockResolvedValue('v2.3.0');
    await renderLoaded();
    await pressCheckForUpdates();
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'firmware.updateSkippedTitle',
        'firmware.updateSkippedBody',
      );
    });
    expect(screen.getByText('firmware.versionSkipped')).toBeTruthy();
    expect(screen.getByLabelText('firmware.undoSkip')).toBeTruthy();
  });

  it('undoes a skipped version', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    const { getSetting, setSetting } = jest.requireMock('../src/db/database');
    getSetting.mockResolvedValue('v2.3.0');
    await renderLoaded();
    await pressCheckForUpdates();
    await fireEvent.press(screen.getByLabelText('firmware.undoSkip'));
    await waitFor(() => {
      expect(setSetting).toHaveBeenCalledWith('firmware_skip_version', '');
    });
    expect(screen.queryByText('firmware.versionSkipped')).toBeNull();
  });

  it('skips the latest version and persists it', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    const { setSetting } = jest.requireMock('../src/db/database');
    await renderLoaded();
    await pressCheckForUpdates();
    await fireEvent.press(screen.getByLabelText('firmware.skipVersion'));
    await pressAlertAction(1);
    await waitFor(() => {
      expect(setSetting).toHaveBeenCalledWith('firmware_skip_version', 'v2.3.0');
      expect(alertSpy).toHaveBeenCalledWith('firmware.skippedTitle', 'firmware.skippedBody');
    });
    expect(screen.getByText('firmware.versionSkipped')).toBeTruthy();
  });

  it('opens the changelog URL for the latest version', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    await renderLoaded();
    await pressCheckForUpdates();
    await fireEvent.press(screen.getByLabelText('firmware.viewChangelog'));
    expect(mockOpenURL).toHaveBeenCalledWith('https://github.com/skot/bitaxe/releases/tag/v2.3.0');
  });

  it('renders changelog items and expands with show more', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    await renderLoaded();
    await pressCheckForUpdates();
    expect(screen.getByText('firmware.whatsNew')).toBeTruthy();
    expect(screen.getByText('Added feature one')).toBeTruthy();
    expect(screen.getByText('Five')).toBeTruthy();
    expect(screen.queryByText('Eight')).toBeNull();
    expect(screen.getByText('firmware.showMore')).toBeTruthy();
    await fireEvent.press(screen.getByText('firmware.showMore'));
    expect(screen.getByText('firmware.showLess')).toBeTruthy();
    expect(screen.getByText('Eight')).toBeTruthy();
  });

  it('flashes a single miner via LAN and shows success', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    await renderLoaded();
    await pressCheckForUpdates();
    await fireEvent.press(screen.getByLabelText('Miner B, v2.0.0'));
    await pressAlertAction(1);
    expect(mockFlashFirmware).toHaveBeenCalledWith(LATEST_VERSION.downloadUrl);
    await waitFor(() => {
      expect(screen.getByText(/firmware\.flashSuccess/)).toBeTruthy();
    });
    expect(screen.getByLabelText('firmware.clearResults')).toBeTruthy();
  });

  it('shows failure state when a single flash fails', async () => {
    mockFlashFirmware.mockResolvedValue(false);
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    await renderLoaded();
    await pressCheckForUpdates();
    await fireEvent.press(screen.getByLabelText('Miner B, v2.0.0'));
    await pressAlertAction(1);
    await waitFor(() => {
      expect(screen.getByText(/firmware\.flashFailed/)).toBeTruthy();
    });
  });

  it('flashes a single miner via WiFi (OTA)', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    await renderLoaded();
    await pressCheckForUpdates();
    await fireEvent.press(screen.getByLabelText('firmware.flashOTA'));
    await pressAlertAction(1);
    expect(mockFlashMinerOTA).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm2' }),
      LATEST_VERSION.downloadUrl,
    );
    await waitFor(() => {
      expect(screen.getByText(/firmware\.flashSuccess/)).toBeTruthy();
    });
  });

  it('selects all miners and batch flashes via WiFi (OTA)', async () => {
    setMiners([
      {
        ...DEFAULT_MINERS[0],
        info: { hostname: 'bitaxe-m1', version: '2.0.0' },
      },
      DEFAULT_MINERS[1],
    ]);
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    mockBatchFlashOTA.mockResolvedValue([
      { minerId: 'm1', success: true },
      { minerId: 'm2', success: true },
    ]);
    await renderLoaded();
    await pressCheckForUpdates();
    expect(screen.getByLabelText('firmware.selectAll')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('firmware.selectAll'));
    expect(screen.getByLabelText('firmware.deselectAll')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('firmware.flashSelectedOTA'));
    await pressAlertAction(1);
    expect(mockBatchFlashOTA).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'm1' }),
        expect.objectContaining({ id: 'm2' }),
      ]),
      LATEST_VERSION.downloadUrl,
      expect.any(Function),
    );
    await waitFor(() => {
      expect(screen.getByText(/firmware\.succeeded/)).toBeTruthy();
    });
  });

  it('batch flashes selected miners via LAN', async () => {
    setMiners([
      {
        ...DEFAULT_MINERS[0],
        info: { hostname: 'bitaxe-m1', version: '2.0.0' },
      },
      DEFAULT_MINERS[1],
    ]);
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    await renderLoaded();
    await pressCheckForUpdates();
    await fireEvent.press(screen.getByLabelText('firmware.selectAll'));
    await fireEvent.press(screen.getByLabelText('firmware.flashSelected'));
    await pressAlertAction(1);
    expect(mockFlashFirmware).toHaveBeenCalledWith(LATEST_VERSION.downloadUrl);
    await waitFor(() => {
      expect(screen.getByText(/firmware\.succeeded/)).toBeTruthy();
    });
  });

  it('clears flash results', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(LATEST_VERSION);
    await renderLoaded();
    await pressCheckForUpdates();
    await fireEvent.press(screen.getByLabelText('Miner B, v2.0.0'));
    await pressAlertAction(1);
    await waitFor(() => {
      expect(screen.getByText(/firmware\.flashSuccess/)).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('firmware.clearResults'));
    expect(screen.queryByLabelText('firmware.clearResults')).toBeNull();
  });
});
