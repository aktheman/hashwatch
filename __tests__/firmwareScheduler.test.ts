jest.mock('../src/db/database', () => ({
  getSetting: jest.fn(),
  setSetting: jest.fn(),
}));
jest.mock('../src/services/firmwareUpdate', () => ({
  checkForFirmwareUpdate: jest.fn(),
}));
jest.mock('../src/services/otaFlash', () => ({
  batchFlashOTA: jest.fn(),
  flashMinerOTA: jest.fn(),
}));
jest.mock('../src/store/miners', () => ({
  useMinerStore: { getState: () => ({ miners: [] }) },
}));

describe('firmwareScheduler', () => {
  const DB = jest.requireMock('../src/db/database') as {
    getSetting: jest.Mock;
    setSetting: jest.Mock;
  };
  const checkForFirmwareUpdate = jest.requireMock('../src/services/firmwareUpdate')
    .checkForFirmwareUpdate as jest.Mock;
  const batchFlashOTA = jest.requireMock('../src/services/otaFlash').batchFlashOTA as jest.Mock;
  const minersMock = jest.requireMock('../src/store/miners') as {
    useMinerStore: { getState: () => { miners: unknown[] } };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    DB.getSetting.mockResolvedValue(null);
    DB.setSetting.mockResolvedValue(undefined);
    checkForFirmwareUpdate.mockResolvedValue({
      version: 'v2.4.0',
      downloadUrl: 'https://example.com/fw.bin',
      releaseDate: '2026-07-20T00:00:00.000Z',
      changelog: '',
      sha256: '',
    });
    batchFlashOTA.mockResolvedValue([]);
    minersMock.useMinerStore.getState = () => ({ miners: [] });
  });

  describe('getFirmwareScheduleSettings', () => {
    it('returns defaults when nothing is stored', async () => {
      const { getFirmwareScheduleSettings } = await import('../src/services/firmwareScheduler');
      expect(await getFirmwareScheduleSettings()).toEqual({
        enabled: false,
        startHour: 0,
        endHour: 6,
        lastRunDay: null,
      });
    });

    it('parses stored settings', async () => {
      DB.getSetting.mockResolvedValue(
        JSON.stringify({ enabled: true, startHour: 22, endHour: 6, lastRunDay: '2026-07-14' }),
      );
      const { getFirmwareScheduleSettings } = await import('../src/services/firmwareScheduler');
      expect(await getFirmwareScheduleSettings()).toEqual({
        enabled: true,
        startHour: 22,
        endHour: 6,
        lastRunDay: '2026-07-14',
      });
    });

    it('clamps invalid hours and falls back on invalid JSON', async () => {
      DB.getSetting.mockResolvedValue(JSON.stringify({ startHour: 99, endHour: -3 }));
      const { getFirmwareScheduleSettings } = await import('../src/services/firmwareScheduler');
      expect(await getFirmwareScheduleSettings()).toEqual({
        enabled: false,
        startHour: 0,
        endHour: 0,
        lastRunDay: null,
      });

      DB.getSetting.mockResolvedValue('not-json');
      expect(await getFirmwareScheduleSettings()).toEqual({
        enabled: false,
        startHour: 0,
        endHour: 6,
        lastRunDay: null,
      });
    });
  });

  describe('setFirmwareScheduleSettings', () => {
    it('persists the settings as JSON', async () => {
      const { setFirmwareScheduleSettings } = await import('../src/services/firmwareScheduler');
      await setFirmwareScheduleSettings({
        enabled: true,
        startHour: 22,
        endHour: 6,
        lastRunDay: null,
      });
      expect(DB.setSetting).toHaveBeenCalledWith(
        'firmware_auto_schedule',
        JSON.stringify({ enabled: true, startHour: 22, endHour: 6, lastRunDay: null }),
      );
    });
  });

  describe('isInOffHours', () => {
    it('matches a simple window (start < end)', async () => {
      const { isInOffHours } = await import('../src/services/firmwareScheduler');
      const settings = { startHour: 0, endHour: 6 };
      expect(isInOffHours(settings, new Date(2026, 6, 15, 2, 0))).toBe(true);
      expect(isInOffHours(settings, new Date(2026, 6, 15, 6, 0))).toBe(false);
      expect(isInOffHours(settings, new Date(2026, 6, 15, 23, 0))).toBe(false);
    });

    it('matches a wrap-around window (start > end)', async () => {
      const { isInOffHours } = await import('../src/services/firmwareScheduler');
      const settings = { startHour: 22, endHour: 6 };
      expect(isInOffHours(settings, new Date(2026, 6, 15, 23, 0))).toBe(true);
      expect(isInOffHours(settings, new Date(2026, 6, 16, 3, 0))).toBe(true);
      expect(isInOffHours(settings, new Date(2026, 6, 15, 12, 0))).toBe(false);
    });

    it('matches only the exact hour when start equals end', async () => {
      const { isInOffHours } = await import('../src/services/firmwareScheduler');
      const settings = { startHour: 2, endHour: 2 };
      expect(isInOffHours(settings, new Date(2026, 6, 15, 2, 0))).toBe(true);
      expect(isInOffHours(settings, new Date(2026, 6, 15, 3, 0))).toBe(false);
    });
  });

  describe('runScheduledFirmwareUpdate', () => {
    it('skips when disabled', async () => {
      const { runScheduledFirmwareUpdate } = await import('../src/services/firmwareScheduler');
      const result = await runScheduledFirmwareUpdate(new Date(2026, 6, 15, 2, 0));
      expect(result).toEqual({
        attempted: 0,
        succeeded: 0,
        failed: 0,
        skipped: true,
        reason: 'disabled',
      });
    });

    it('skips outside off-hours window', async () => {
      DB.getSetting.mockResolvedValue(
        JSON.stringify({ enabled: true, startHour: 0, endHour: 6, lastRunDay: null }),
      );
      const { runScheduledFirmwareUpdate } = await import('../src/services/firmwareScheduler');
      const result = await runScheduledFirmwareUpdate(new Date(2026, 6, 15, 12, 0));
      expect(result.reason).toBe('not_off_hours');
      expect(checkForFirmwareUpdate).not.toHaveBeenCalled();
    });

    it('skips when already run today', async () => {
      DB.getSetting.mockResolvedValue(
        JSON.stringify({ enabled: true, startHour: 0, endHour: 6, lastRunDay: '2026-07-15' }),
      );
      const { runScheduledFirmwareUpdate } = await import('../src/services/firmwareScheduler');
      const result = await runScheduledFirmwareUpdate(new Date(2026, 6, 15, 2, 0));
      expect(result.reason).toBe('already_ran');
      expect(checkForFirmwareUpdate).not.toHaveBeenCalled();
    });

    it('skips when no update is available', async () => {
      DB.getSetting.mockResolvedValue(
        JSON.stringify({ enabled: true, startHour: 0, endHour: 6, lastRunDay: null }),
      );
      checkForFirmwareUpdate.mockResolvedValue(null);
      const { runScheduledFirmwareUpdate } = await import('../src/services/firmwareScheduler');
      const result = await runScheduledFirmwareUpdate(new Date(2026, 6, 15, 2, 0));
      expect(result.reason).toBe('no_update');
      expect(batchFlashOTA).not.toHaveBeenCalled();
    });

    it('flashes only online miners that need the update', async () => {
      DB.getSetting.mockResolvedValue(
        JSON.stringify({ enabled: true, startHour: 0, endHour: 6, lastRunDay: null }),
      );
      const miners = [
        {
          id: 'm1',
          name: 'Old',
          ip: '10.0.0.1',
          port: 80,
          isOnline: true,
          info: { version: '2.0.0' },
        },
        {
          id: 'm2',
          name: 'UpToDate',
          ip: '10.0.0.2',
          port: 80,
          isOnline: true,
          info: { version: '2.4.0' },
        },
        {
          id: 'm3',
          name: 'Offline',
          ip: '10.0.0.3',
          port: 80,
          isOnline: false,
          info: { version: '1.0.0' },
        },
      ];
      minersMock.useMinerStore.getState = () => ({ miners });
      batchFlashOTA.mockResolvedValue([{ minerId: 'm1', success: true }]);
      const { runScheduledFirmwareUpdate } = await import('../src/services/firmwareScheduler');
      const result = await runScheduledFirmwareUpdate(new Date(2026, 6, 15, 2, 0));
      expect(batchFlashOTA).toHaveBeenCalledTimes(1);
      expect(batchFlashOTA.mock.calls[0][0].map((m: { id: string }) => m.id)).toEqual(['m1']);
      expect(result).toEqual({ attempted: 1, succeeded: 1, failed: 0, skipped: false });
      expect(DB.setSetting).toHaveBeenCalledWith(
        'firmware_auto_schedule',
        JSON.stringify({ enabled: true, startHour: 0, endHour: 6, lastRunDay: '2026-07-15' }),
      );
    });

    it('tracks failures from the flash results', async () => {
      DB.getSetting.mockResolvedValue(
        JSON.stringify({ enabled: true, startHour: 0, endHour: 6, lastRunDay: null }),
      );
      minersMock.useMinerStore.getState = () => ({
        miners: [
          {
            id: 'm1',
            name: 'A',
            ip: '10.0.0.1',
            port: 80,
            isOnline: true,
            info: { version: '1.0.0' },
          },
        ],
      });
      batchFlashOTA.mockResolvedValue([{ minerId: 'm1', success: false, error: 'boom' }]);
      const { runScheduledFirmwareUpdate } = await import('../src/services/firmwareScheduler');
      const result = await runScheduledFirmwareUpdate(new Date(2026, 6, 15, 3, 0));
      expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1, skipped: false });
    });

    it('records a run even with no target miners', async () => {
      DB.getSetting.mockResolvedValue(
        JSON.stringify({ enabled: true, startHour: 0, endHour: 6, lastRunDay: null }),
      );
      batchFlashOTA.mockResolvedValue([]);
      const { runScheduledFirmwareUpdate } = await import('../src/services/firmwareScheduler');
      const result = await runScheduledFirmwareUpdate(new Date(2026, 6, 15, 2, 0));
      expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0, skipped: false });
      expect(DB.setSetting).toHaveBeenCalled();
    });
  });
});
