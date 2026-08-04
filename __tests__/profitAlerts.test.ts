jest.mock('../src/db/database', () => ({
  getSetting: jest.fn(),
  setSetting: jest.fn(),
}));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
}));
jest.mock('../src/services/bitcoinPrice', () => ({
  getBitcoinPrice: jest.fn(),
}));
jest.mock('../src/store/alertHistory', () => ({
  useAlertHistoryStore: { getState: () => ({ addEvent: jest.fn() }) },
}));

describe('profitAlerts', () => {
  const DB = jest.requireMock('../src/db/database') as {
    getSetting: jest.Mock;
    setSetting: jest.Mock;
  };
  const scheduleNotificationAsync = jest.requireMock('expo-notifications')
    .scheduleNotificationAsync as jest.Mock;
  const getBitcoinPrice = jest.requireMock('../src/services/bitcoinPrice')
    .getBitcoinPrice as jest.Mock;
  const alertHistoryMock = jest.requireMock('../src/store/alertHistory') as {
    useAlertHistoryStore: { getState: () => { addEvent: jest.Mock } };
  };

  const platform = require('react-native').Platform;
  let origOS: string;

  beforeAll(() => {
    origOS = platform.OS;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    DB.getSetting.mockResolvedValue(null);
    DB.setSetting.mockResolvedValue(undefined);
    scheduleNotificationAsync.mockResolvedValue('notif-1');
    getBitcoinPrice.mockResolvedValue(60000);
    alertHistoryMock.useAlertHistoryStore.getState = () => ({
      addEvent: jest.fn(),
    });
    platform.OS = origOS;
  });

  afterAll(() => {
    platform.OS = origOS;
  });

  async function enableAlerts(): Promise<void> {
    DB.getSetting.mockImplementation(async (key: string) => {
      if (key === 'profit_alert_enabled') return 'true';
      if (key === 'profit_alert_drop_percent') return '5';
      if (key === 'notifications_enabled') return 'true';
      return null;
    });
  }

  describe('getProfitAlertSettings', () => {
    it('returns defaults when nothing is stored', async () => {
      const { getProfitAlertSettings } = await import('../src/services/profitAlerts');
      const settings = await getProfitAlertSettings();
      expect(settings).toEqual({ enabled: false, dropPercent: 5 });
    });

    it('reads stored enabled + drop percent', async () => {
      DB.getSetting.mockImplementation(async (key: string) =>
        key === 'profit_alert_enabled' ? 'true' : key === 'profit_alert_drop_percent' ? '10' : null,
      );
      const { getProfitAlertSettings } = await import('../src/services/profitAlerts');
      expect(await getProfitAlertSettings()).toEqual({ enabled: true, dropPercent: 10 });
    });

    it('falls back to default drop percent when stored value is invalid', async () => {
      DB.getSetting.mockImplementation(async (key: string) =>
        key === 'profit_alert_drop_percent' ? 'abc' : null,
      );
      const { getProfitAlertSettings } = await import('../src/services/profitAlerts');
      expect(await getProfitAlertSettings()).toEqual({ enabled: false, dropPercent: 5 });
    });
  });

  describe('setProfitAlertSettings', () => {
    it('persists enabled + drop percent', async () => {
      const { setProfitAlertSettings } = await import('../src/services/profitAlerts');
      await setProfitAlertSettings({ enabled: true, dropPercent: 10 });
      expect(DB.setSetting).toHaveBeenCalledWith('profit_alert_enabled', 'true');
      expect(DB.setSetting).toHaveBeenCalledWith('profit_alert_drop_percent', '10');
    });
  });

  describe('checkProfitAlert', () => {
    it('does nothing when disabled', async () => {
      const { checkProfitAlert } = await import('../src/services/profitAlerts');
      await checkProfitAlert();
      expect(getBitcoinPrice).not.toHaveBeenCalled();
      expect(DB.setSetting).not.toHaveBeenCalled();
    });

    it('does nothing when notifications are disabled globally', async () => {
      await enableAlerts();
      DB.getSetting.mockImplementation(async (key: string) =>
        key === 'profit_alert_enabled' ? 'true' : key === 'notifications_enabled' ? 'false' : null,
      );
      const { checkProfitAlert } = await import('../src/services/profitAlerts');
      await checkProfitAlert();
      expect(getBitcoinPrice).not.toHaveBeenCalled();
    });

    it('arms the baseline on first check without notifying', async () => {
      await enableAlerts();
      const { checkProfitAlert } = await import('../src/services/profitAlerts');
      await checkProfitAlert();
      expect(getBitcoinPrice).toHaveBeenCalled();
      expect(DB.setSetting).toHaveBeenCalledWith('profit_alert_baseline', '60000');
      expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('re-arms baseline when price rises above baseline', async () => {
      await enableAlerts();
      DB.getSetting.mockImplementation(async (key: string) => {
        if (key === 'profit_alert_enabled') return 'true';
        if (key === 'notifications_enabled') return 'true';
        if (key === 'profit_alert_baseline') return '50000';
        return null;
      });
      getBitcoinPrice.mockResolvedValue(55000);
      const { checkProfitAlert } = await import('../src/services/profitAlerts');
      await checkProfitAlert();
      expect(DB.setSetting).toHaveBeenCalledWith('profit_alert_baseline', '55000');
      expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('notifies when the price drops at least the threshold', async () => {
      const addEvent = jest.fn();
      alertHistoryMock.useAlertHistoryStore.getState = () => ({ addEvent });
      await enableAlerts();
      DB.getSetting.mockImplementation(async (key: string) => {
        if (key === 'profit_alert_enabled') return 'true';
        if (key === 'profit_alert_drop_percent') return '5';
        if (key === 'notifications_enabled') return 'true';
        if (key === 'profit_alert_baseline') return '60000';
        return null;
      });
      getBitcoinPrice.mockResolvedValue(57000);
      const { checkProfitAlert } = await import('../src/services/profitAlerts');
      await checkProfitAlert();
      expect(scheduleNotificationAsync).toHaveBeenCalled();
      expect(addEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'price_drop', minerId: 'fleet' }),
      );
      expect(DB.setSetting).toHaveBeenCalledWith('profit_alert_baseline', '57000');
    });

    it('does not notify for a drop below threshold', async () => {
      const addEvent = jest.fn();
      alertHistoryMock.useAlertHistoryStore.getState = () => ({ addEvent });
      await enableAlerts();
      DB.getSetting.mockImplementation(async (key: string) => {
        if (key === 'profit_alert_enabled') return 'true';
        if (key === 'profit_alert_drop_percent') return '5';
        if (key === 'notifications_enabled') return 'true';
        if (key === 'profit_alert_baseline') return '60000';
        return null;
      });
      getBitcoinPrice.mockResolvedValue(58000);
      const { checkProfitAlert } = await import('../src/services/profitAlerts');
      await checkProfitAlert();
      expect(scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(addEvent).not.toHaveBeenCalled();
    });

    it('does not schedule a native notification on web but still logs history', async () => {
      platform.OS = 'web';
      const addEvent = jest.fn();
      alertHistoryMock.useAlertHistoryStore.getState = () => ({ addEvent });
      await enableAlerts();
      DB.getSetting.mockImplementation(async (key: string) => {
        if (key === 'profit_alert_enabled') return 'true';
        if (key === 'profit_alert_drop_percent') return '5';
        if (key === 'notifications_enabled') return 'true';
        if (key === 'profit_alert_baseline') return '60000';
        return null;
      });
      getBitcoinPrice.mockResolvedValue(57000);
      const { checkProfitAlert } = await import('../src/services/profitAlerts');
      await checkProfitAlert();
      expect(scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(addEvent).toHaveBeenCalled();
    });

    it('silently exits when price fetch fails', async () => {
      await enableAlerts();
      getBitcoinPrice.mockRejectedValue(new Error('network'));
      const { checkProfitAlert } = await import('../src/services/profitAlerts');
      await expect(checkProfitAlert()).resolves.toBeUndefined();
    });
  });
});
