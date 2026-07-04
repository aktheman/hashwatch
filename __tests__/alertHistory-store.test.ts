const mockSetSetting = jest.fn().mockResolvedValue(undefined);
const mockGetSetting = jest.fn();
const mockFetchAlertHistory = jest.fn();
const mockSyncAlertsToBackend = jest.fn();

jest.mock('../src/db/database', () => ({
  setSetting: (k: string, v: string) => mockSetSetting(k, v),
  getSetting: (k: string) => mockGetSetting(k),
}));

jest.mock('../src/api/client', () => ({
  pushStats: jest.fn(),
  fetchStats: jest.fn(),
  fetchAlertHistory: () => mockFetchAlertHistory(),
  syncAlertsToBackend: (events: unknown[]) => mockSyncAlertsToBackend(events),
}));

import { useAlertHistoryStore } from '../src/store/alertHistory';

beforeEach(() => {
  useAlertHistoryStore.setState({ events: [] });
  jest.clearAllMocks();
});

describe('loadEvents', () => {
  it('loads events from DB', async () => {
    const events = [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'M1',
        type: 'offline',
        title: 'Offline',
        timestamp: 1000,
        read: false,
      },
    ];
    mockGetSetting.mockResolvedValue(JSON.stringify(events));

    await useAlertHistoryStore.getState().loadEvents();

    expect(useAlertHistoryStore.getState().events).toEqual(events);
  });

  it('does nothing when no stored events', async () => {
    mockGetSetting.mockResolvedValue(null);

    await useAlertHistoryStore.getState().loadEvents();

    expect(useAlertHistoryStore.getState().events).toEqual([]);
  });

  it('handles parse error gracefully', async () => {
    mockGetSetting.mockResolvedValue('invalid json');

    await useAlertHistoryStore.getState().loadEvents();

    expect(useAlertHistoryStore.getState().events).toEqual([]);
  });
});

describe('addEvent', () => {
  it('adds an event with generated id, timestamp and read=false', () => {
    jest.useFakeTimers({ now: 5000 });

    useAlertHistoryStore.getState().addEvent({
      minerId: 'm1',
      minerName: 'TestMiner',
      type: 'offline',
      title: 'Miner went offline',
    });

    const events = useAlertHistoryStore.getState().events;
    expect(events).toHaveLength(1);
    expect(events[0].minerId).toBe('m1');
    expect(events[0].minerName).toBe('TestMiner');
    expect(events[0].type).toBe('offline');
    expect(events[0].title).toBe('Miner went offline');
    expect(events[0].timestamp).toBe(5000);
    expect(events[0].read).toBe(false);
    expect(events[0].id).toContain('alert_');
    expect(mockSetSetting).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('prepends events to the list', () => {
    useAlertHistoryStore.setState({
      events: [
        {
          id: 'old',
          minerId: 'm1',
          minerName: 'M1',
          type: 'online',
          title: 'Online',
          timestamp: 100,
          read: true,
        },
      ],
    });

    useAlertHistoryStore.getState().addEvent({
      minerId: 'm2',
      minerName: 'M2',
      type: 'offline',
      title: 'Offline',
    });

    const events = useAlertHistoryStore.getState().events;
    expect(events).toHaveLength(2);
    expect(events[0].minerId).toBe('m2');
    expect(events[1].minerId).toBe('m1');
  });
});

describe('markRead', () => {
  it('marks a specific event as read', () => {
    useAlertHistoryStore.setState({
      events: [
        {
          id: 'a1',
          minerId: 'm1',
          minerName: 'M1',
          type: 'offline',
          title: 'Off',
          timestamp: 100,
          read: false,
        },
        {
          id: 'a2',
          minerId: 'm1',
          minerName: 'M1',
          type: 'online',
          title: 'On',
          timestamp: 200,
          read: false,
        },
      ],
    });

    useAlertHistoryStore.getState().markRead('a1');

    const events = useAlertHistoryStore.getState().events;
    expect(events.find((e) => e.id === 'a1')?.read).toBe(true);
    expect(events.find((e) => e.id === 'a2')?.read).toBe(false);
    expect(mockSetSetting).toHaveBeenCalled();
  });

  it('does nothing for unknown id', () => {
    useAlertHistoryStore.setState({
      events: [
        {
          id: 'a1',
          minerId: 'm1',
          minerName: 'M1',
          type: 'offline',
          title: 'Off',
          timestamp: 100,
          read: false,
        },
      ],
    });

    useAlertHistoryStore.getState().markRead('nonexistent');

    expect(useAlertHistoryStore.getState().events[0].read).toBe(false);
  });
});

describe('markAllRead', () => {
  it('marks all events as read', () => {
    useAlertHistoryStore.setState({
      events: [
        {
          id: 'a1',
          minerId: 'm1',
          minerName: 'M1',
          type: 'offline',
          title: 'Off',
          timestamp: 100,
          read: false,
        },
        {
          id: 'a2',
          minerId: 'm1',
          minerName: 'M1',
          type: 'warning',
          title: 'Warn',
          timestamp: 200,
          read: false,
        },
      ],
    });

    useAlertHistoryStore.getState().markAllRead();

    expect(useAlertHistoryStore.getState().events.every((e) => e.read)).toBe(true);
    expect(mockSetSetting).toHaveBeenCalled();
  });
});

describe('clearAll', () => {
  it('clears all events', () => {
    useAlertHistoryStore.setState({
      events: [
        {
          id: 'a1',
          minerId: 'm1',
          minerName: 'M1',
          type: 'offline',
          title: 'Off',
          timestamp: 100,
          read: false,
        },
      ],
    });

    useAlertHistoryStore.getState().clearAll();

    expect(useAlertHistoryStore.getState().events).toEqual([]);
    expect(mockSetSetting).toHaveBeenCalledWith('hashwatch_alert_history', '[]');
  });
});

describe('syncFromBackend', () => {
  it('merges remote events with local events', async () => {
    useAlertHistoryStore.setState({
      events: [
        {
          id: 'local1',
          minerId: 'm1',
          minerName: 'M1',
          type: 'offline',
          title: 'Local offline',
          timestamp: 100,
          read: true,
        },
      ],
    });

    mockFetchAlertHistory.mockResolvedValue([
      {
        minerid: 'm2',
        eventtype: 'online',
        title: 'M2 online',
        timestamp: 200,
        read: false,
      },
    ]);

    await useAlertHistoryStore.getState().syncFromBackend();

    const events = useAlertHistoryStore.getState().events;
    expect(events).toHaveLength(2);
    expect(events[0].minerId).toBe('m2');
    expect(events[1].minerId).toBe('m1');
    expect(mockSetSetting).toHaveBeenCalled();
  });

  it('does not add duplicate remote events', async () => {
    useAlertHistoryStore.setState({
      events: [
        {
          id: 'existing',
          minerId: 'm1',
          minerName: 'M1',
          type: 'offline',
          title: 'Off',
          timestamp: 100,
          read: false,
        },
      ],
    });

    mockFetchAlertHistory.mockResolvedValue([
      {
        minerid: 'm1',
        eventtype: 'offline',
        title: 'Off',
        timestamp: 100,
        read: false,
      },
    ]);

    await useAlertHistoryStore.getState().syncFromBackend();

    expect(useAlertHistoryStore.getState().events).toHaveLength(1);
  });

  it('sets syncing flag during fetch', async () => {
    let resolvePromise!: (v: unknown) => void;
    mockFetchAlertHistory.mockReturnValue(
      new Promise((r) => {
        resolvePromise = r;
      }),
    );

    const promise = useAlertHistoryStore.getState().syncFromBackend();
    expect(useAlertHistoryStore.getState().syncing).toBe(true);
    resolvePromise([]);
    await promise;
    expect(useAlertHistoryStore.getState().syncing).toBe(false);
  });

  it('handles fetch error gracefully', async () => {
    mockFetchAlertHistory.mockRejectedValue(new Error('network error'));

    await useAlertHistoryStore.getState().syncFromBackend();

    expect(useAlertHistoryStore.getState().syncing).toBe(false);
    expect(useAlertHistoryStore.getState().events).toEqual([]);
  });
});

describe('syncToBackend', () => {
  it('sends unread events to backend', async () => {
    useAlertHistoryStore.setState({
      events: [
        {
          id: 'a1',
          minerId: 'm1',
          minerName: 'M1',
          type: 'offline',
          title: 'Off',
          timestamp: 100,
          read: false,
        },
        {
          id: 'a2',
          minerId: 'm1',
          minerName: 'M1',
          type: 'online',
          title: 'On',
          timestamp: 200,
          read: true,
        },
      ],
    });

    await useAlertHistoryStore.getState().syncToBackend();

    expect(mockSyncAlertsToBackend).toHaveBeenCalledTimes(1);
    const sent = mockSyncAlertsToBackend.mock.calls[0][0];
    expect(sent).toHaveLength(1);
    expect(sent[0].minerId).toBe('m1');
    expect(sent[0].eventType).toBe('offline');
  });

  it('does nothing when no unread events', async () => {
    useAlertHistoryStore.setState({
      events: [
        {
          id: 'a1',
          minerId: 'm1',
          minerName: 'M1',
          type: 'offline',
          title: 'Off',
          timestamp: 100,
          read: true,
        },
      ],
    });

    await useAlertHistoryStore.getState().syncToBackend();

    expect(mockSyncAlertsToBackend).not.toHaveBeenCalled();
  });

  it('handles backend error gracefully', async () => {
    useAlertHistoryStore.setState({
      events: [
        {
          id: 'a1',
          minerId: 'm1',
          minerName: 'M1',
          type: 'offline',
          title: 'Off',
          timestamp: 100,
          read: false,
        },
      ],
    });

    mockSyncAlertsToBackend.mockRejectedValue(new Error('server error'));

    await expect(useAlertHistoryStore.getState().syncToBackend()).resolves.toBeUndefined();
  });
});
