import { useNotificationSettingsStore } from '../src/store/notificationSettings';

const mockSetSetting = jest.fn().mockResolvedValue(undefined);
const mockGetSetting = jest.fn();

jest.mock('../src/db/database', () => ({
  setSetting: (k: string, v: string) => mockSetSetting(k, v),
  getSetting: (k: string) => mockGetSetting(k),
}));

beforeEach(() => {
  useNotificationSettingsStore.setState({
    thresholds: {
      tempWarning: 70,
      tempCritical: 85,
      hashrateDropPercent: 50,
      offlineTimeoutMin: 5,
    },
    channels: { push: true, email: false, webhook: false },
    quietHoursStart: 22,
    quietHoursEnd: 7,
    loaded: false,
  });
  jest.clearAllMocks();
});

describe('loadSettings', () => {
  it('loads saved settings from DB', async () => {
    mockGetSetting.mockResolvedValue(
      JSON.stringify({
        thresholds: {
          tempWarning: 80,
          tempCritical: 95,
          hashrateDropPercent: 30,
          offlineTimeoutMin: 10,
        },
        channels: { push: true, email: true, webhook: false },
        quietHoursStart: 23,
        quietHoursEnd: 6,
      }),
    );

    await useNotificationSettingsStore.getState().loadSettings();

    const state = useNotificationSettingsStore.getState();
    expect(state.thresholds.tempWarning).toBe(80);
    expect(state.thresholds.tempCritical).toBe(95);
    expect(state.thresholds.hashrateDropPercent).toBe(30);
    expect(state.thresholds.offlineTimeoutMin).toBe(10);
    expect(state.channels.email).toBe(true);
    expect(state.quietHoursStart).toBe(23);
    expect(state.quietHoursEnd).toBe(6);
    expect(state.loaded).toBe(true);
  });

  it('uses defaults when no saved settings', async () => {
    mockGetSetting.mockResolvedValue(null);

    await useNotificationSettingsStore.getState().loadSettings();

    const state = useNotificationSettingsStore.getState();
    expect(state.thresholds.tempWarning).toBe(70);
    expect(state.thresholds.tempCritical).toBe(85);
    expect(state.channels.push).toBe(true);
    expect(state.channels.email).toBe(false);
    expect(state.quietHoursStart).toBe(22);
    expect(state.quietHoursEnd).toBe(7);
  });

  it('handles parse error gracefully', async () => {
    mockGetSetting.mockResolvedValue('not json');

    await useNotificationSettingsStore.getState().loadSettings();

    expect(useNotificationSettingsStore.getState().loaded).toBe(true);
    expect(useNotificationSettingsStore.getState().thresholds.tempWarning).toBe(70);
  });
});

describe('updateThresholds', () => {
  it('updates specific thresholds and persists', () => {
    useNotificationSettingsStore.getState().updateThresholds({ tempWarning: 80 });

    expect(useNotificationSettingsStore.getState().thresholds.tempWarning).toBe(80);
    expect(useNotificationSettingsStore.getState().thresholds.tempCritical).toBe(85);
    expect(mockSetSetting).toHaveBeenCalled();
  });

  it('updates multiple thresholds at once', () => {
    useNotificationSettingsStore
      .getState()
      .updateThresholds({ hashrateDropPercent: 25, offlineTimeoutMin: 15 });

    expect(useNotificationSettingsStore.getState().thresholds.hashrateDropPercent).toBe(25);
    expect(useNotificationSettingsStore.getState().thresholds.offlineTimeoutMin).toBe(15);
  });
});

describe('toggleChannel', () => {
  it('toggles push channel off', () => {
    expect(useNotificationSettingsStore.getState().channels.push).toBe(true);

    useNotificationSettingsStore.getState().toggleChannel('push');

    expect(useNotificationSettingsStore.getState().channels.push).toBe(false);
    expect(mockSetSetting).toHaveBeenCalled();
  });

  it('toggles email channel on', () => {
    expect(useNotificationSettingsStore.getState().channels.email).toBe(false);

    useNotificationSettingsStore.getState().toggleChannel('email');

    expect(useNotificationSettingsStore.getState().channels.email).toBe(true);
  });

  it('toggles webhook channel on', () => {
    useNotificationSettingsStore.getState().toggleChannel('webhook');

    expect(useNotificationSettingsStore.getState().channels.webhook).toBe(true);
  });
});

describe('setQuietHours', () => {
  it('sets start and end times', () => {
    useNotificationSettingsStore.getState().setQuietHours(23, 6);

    expect(useNotificationSettingsStore.getState().quietHoursStart).toBe(23);
    expect(useNotificationSettingsStore.getState().quietHoursEnd).toBe(6);
    expect(mockSetSetting).toHaveBeenCalled();
  });

  it('sets midnight range', () => {
    useNotificationSettingsStore.getState().setQuietHours(0, 23);

    expect(useNotificationSettingsStore.getState().quietHoursStart).toBe(0);
    expect(useNotificationSettingsStore.getState().quietHoursEnd).toBe(23);
  });
});

describe('persistence', () => {
  it('saves thresholds to DB on update', () => {
    useNotificationSettingsStore.getState().updateThresholds({ tempCritical: 90 });

    expect(mockSetSetting).toHaveBeenCalledWith(
      'hashwatch_notification_settings',
      expect.stringContaining('"tempCritical":90'),
    );
  });

  it('saves channels to DB on toggle', () => {
    useNotificationSettingsStore.getState().toggleChannel('email');

    expect(mockSetSetting).toHaveBeenCalledWith(
      'hashwatch_notification_settings',
      expect.stringContaining('"email":true'),
    );
  });

  it('saves quiet hours to DB', () => {
    useNotificationSettingsStore.getState().setQuietHours(21, 8);

    expect(mockSetSetting).toHaveBeenCalledWith(
      'hashwatch_notification_settings',
      expect.stringContaining('"quietHoursStart":21'),
    );
  });
});
