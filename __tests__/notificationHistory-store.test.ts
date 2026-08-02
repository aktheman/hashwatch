import { fetchNotificationHistory, syncNotificationHistory } from '../src/api/client';
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

jest.mock('../src/api/client', () => ({
  fetchNotificationHistory: jest.fn(),
  syncNotificationHistory: jest.fn(),
}));

const mockFetchNotificationHistory = fetchNotificationHistory as jest.Mock;
const mockSyncNotificationHistory = syncNotificationHistory as jest.Mock;

const STORAGE_KEY = 'hashwatch_notification_history';

function makeEntry(overrides: Partial<PushNotificationEntry> = {}): PushNotificationEntry {
  return {
    id: 'n1',
    token: 'tok1',
    title: 'Test',
    body: 'Body',
    data: {},
    sentAt: 1000,
    status: 'sent',
    ...overrides,
  };
}

beforeEach(() => {
  useNotificationHistoryStore.setState({ history: [], syncing: false });
  jest.clearAllMocks();
  mockSetSetting.mockResolvedValue(undefined);
});

describe('loadHistory', () => {
  it('loads history from DB', async () => {
    const history = [makeEntry()];
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

  it('handles a database error gracefully', async () => {
    mockGetSetting.mockRejectedValue(new Error('db down'));

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

  it('still updates state when persisting to the DB fails', () => {
    mockSetSetting.mockRejectedValue(new Error('db down'));

    useNotificationHistoryStore.getState().addEntry(makeEntry());

    expect(useNotificationHistoryStore.getState().history).toHaveLength(1);
  });
});

describe('clearHistory', () => {
  it('clears history and persists an empty array', async () => {
    useNotificationHistoryStore.setState({ history: [makeEntry()] });

    await useNotificationHistoryStore.getState().clearHistory();

    expect(mockSetSetting).toHaveBeenCalledWith(STORAGE_KEY, '[]');
    expect(useNotificationHistoryStore.getState().history).toEqual([]);
  });
});

describe('syncFromBackend', () => {
  it('merges remote entries with local ones, sorted by sentAt descending', async () => {
    useNotificationHistoryStore.setState({
      history: [makeEntry({ id: 'local1', title: 'Local', sentAt: 1000 })],
    });
    mockFetchNotificationHistory.mockResolvedValue([
      {
        id: 99,
        token: 'rtok',
        title: 'Remote',
        body: 'RBody',
        data: { minerId: 'm1' },
        sentat: 2000,
        status: 'failed',
      },
    ]);

    await useNotificationHistoryStore.getState().syncFromBackend();

    const history = useNotificationHistoryStore.getState().history;
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ title: 'Remote', sentAt: 2000, status: 'failed', data: {} });
    expect(history[0].id).toContain('notif_');
    expect(history[1].title).toBe('Local');
    expect(mockSetSetting).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(history));
    expect(useNotificationHistoryStore.getState().syncing).toBe(false);
  });

  it('does not duplicate entries already present locally', async () => {
    useNotificationHistoryStore.setState({ history: [makeEntry({ sentAt: 1000 })] });
    mockFetchNotificationHistory.mockResolvedValue([
      { id: 1, token: 'tok1', title: 'Test', body: 'Body', data: {}, sentat: 1000, status: 'sent' },
    ]);

    await useNotificationHistoryStore.getState().syncFromBackend();

    expect(useNotificationHistoryStore.getState().history).toHaveLength(1);
  });

  it('returns early when the remote history is empty', async () => {
    const local = [makeEntry()];
    useNotificationHistoryStore.setState({ history: local });
    mockFetchNotificationHistory.mockResolvedValue([]);

    await useNotificationHistoryStore.getState().syncFromBackend();

    expect(useNotificationHistoryStore.getState().history).toEqual(local);
    expect(mockSetSetting).not.toHaveBeenCalled();
    expect(useNotificationHistoryStore.getState().syncing).toBe(false);
  });

  it('toggles syncing while the request is in flight', async () => {
    let resolveFetch: (value: unknown) => void;
    mockFetchNotificationHistory.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const promise = useNotificationHistoryStore.getState().syncFromBackend();
    expect(useNotificationHistoryStore.getState().syncing).toBe(true);

    resolveFetch!([]);
    await promise;
    expect(useNotificationHistoryStore.getState().syncing).toBe(false);
  });

  it('keeps local history and resets syncing when the fetch fails', async () => {
    const local = [makeEntry()];
    useNotificationHistoryStore.setState({ history: local });
    mockFetchNotificationHistory.mockRejectedValue(new Error('Network Error'));

    await useNotificationHistoryStore.getState().syncFromBackend();

    expect(useNotificationHistoryStore.getState().history).toEqual(local);
    expect(useNotificationHistoryStore.getState().syncing).toBe(false);
  });
});

describe('syncToBackend', () => {
  it('pushes the local history to the backend with mapped fields', async () => {
    useNotificationHistoryStore.setState({
      history: [makeEntry({ token: 't1', title: 'A', body: 'B', sentAt: 1234, status: 'failed' })],
    });
    mockSyncNotificationHistory.mockResolvedValue({ ok: true, inserted: 1 });

    await useNotificationHistoryStore.getState().syncToBackend();

    expect(mockSyncNotificationHistory).toHaveBeenCalledWith([
      { token: 't1', title: 'A', body: 'B', sentAt: 1234, status: 'failed' },
    ]);
  });

  it('does nothing when the local history is empty', async () => {
    await useNotificationHistoryStore.getState().syncToBackend();

    expect(mockSyncNotificationHistory).not.toHaveBeenCalled();
  });

  it('does not throw when the request fails', async () => {
    useNotificationHistoryStore.setState({ history: [makeEntry()] });
    mockSyncNotificationHistory.mockRejectedValue(new Error('Network Error'));

    await expect(useNotificationHistoryStore.getState().syncToBackend()).resolves.toBeUndefined();
  });
});
