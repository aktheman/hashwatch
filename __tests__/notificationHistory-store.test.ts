import {
  useNotificationHistoryStore,
  PushNotificationEntry,
} from '../src/store/notificationHistory';

const mockSetSetting = jest.fn().mockResolvedValue(undefined);
const mockGetSetting = jest.fn();

jest.mock('../src/db/database', () => ({
  setSetting: (k: string, v: string) => mockSetSetting(k, v),
  getSetting: (k: string) => mockGetSetting(k),
}));

beforeEach(() => {
  useNotificationHistoryStore.setState({ history: [] });
  jest.clearAllMocks();
});

describe('loadHistory', () => {
  it('loads history from DB', async () => {
    const history: PushNotificationEntry[] = [
      {
        id: 'n1',
        token: 'tok1',
        title: 'Test',
        body: 'Body',
        data: {},
        sentAt: 1000,
        status: 'sent',
      },
    ];
    mockGetSetting.mockResolvedValue(JSON.stringify(history));

    await useNotificationHistoryStore.getState().loadHistory();

    expect(useNotificationHistoryStore.getState().history).toEqual(history);
  });

  it('does nothing when no stored history', async () => {
    mockGetSetting.mockResolvedValue(null);

    await useNotificationHistoryStore.getState().loadHistory();

    expect(useNotificationHistoryStore.getState().history).toEqual([]);
  });

  it('handles parse error gracefully', async () => {
    mockGetSetting.mockResolvedValue('not json');

    await useNotificationHistoryStore.getState().loadHistory();

    expect(useNotificationHistoryStore.getState().history).toEqual([]);
  });
});

describe('addEntry', () => {
  it('adds entry with generated id and sentAt', () => {
    jest.useFakeTimers({ now: 3000 });

    useNotificationHistoryStore.getState().addEntry({
      token: 'tok-abc',
      title: 'Miner Alert',
      body: 'Miner went offline',
      data: { minerId: 'm1' },
      status: 'sent',
    });

    const history = useNotificationHistoryStore.getState().history;
    expect(history).toHaveLength(1);
    expect(history[0].token).toBe('tok-abc');
    expect(history[0].title).toBe('Miner Alert');
    expect(history[0].body).toBe('Miner went offline');
    expect(history[0].data).toEqual({ minerId: 'm1' });
    expect(history[0].status).toBe('sent');
    expect(history[0].sentAt).toBe(3000);
    expect(history[0].id).toContain('notif_');
    expect(mockSetSetting).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('prepends entries and caps at 200', () => {
    const existing = Array.from({ length: 200 }, (_, i) => ({
      id: `old_${i}`,
      token: 'tok',
      title: 'Old',
      body: '',
      data: {} as Record<string, unknown>,
      sentAt: i,
      status: 'sent' as const,
    }));
    useNotificationHistoryStore.setState({ history: existing });

    useNotificationHistoryStore.getState().addEntry({
      token: 'tok-new',
      title: 'New',
      body: 'Newest',
      data: {},
      status: 'failed',
    });

    expect(useNotificationHistoryStore.getState().history).toHaveLength(200);
    expect(useNotificationHistoryStore.getState().history[0].title).toBe('New');
  });
});
