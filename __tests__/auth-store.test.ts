import { useAuthStore, queueSetting } from '../src/store/auth';

const mockSetSetting = jest.fn();
const mockGetSetting = jest.fn();

jest.mock('../src/db/database', () => ({
  setSetting: (k: string, v: string) => mockSetSetting(k, v),
  getSetting: (k: string) => mockGetSetting(k),
}));

const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockGetSettings = jest.fn();
const mockPutSetting = jest.fn();
jest.mock('../src/api/client', () => ({
  login: (e: string, p: string) => mockLogin(e, p),
  register: (e: string, p: string) => mockRegister(e, p),
  getSettings: (...args: unknown[]) => mockGetSettings(...args),
  putSetting: (key: string, value: string) => mockPutSetting(key, value),
  configureClient: jest.fn(),
}));

const mockConnectWS = jest.fn();
const mockDisconnectWS = jest.fn();

jest.mock('../src/services/websocket', () => ({
  connectWebSocket: (t: string) => mockConnectWS(t),
  disconnectWebSocket: () => mockDisconnectWS(),
}));

const mockRegisterPush = jest.fn();
const mockUnregisterPush = jest.fn();

jest.mock('../src/services/pushRegistration', () => ({
  registerPushToken: (token: string | null) => mockRegisterPush(token),
  unregisterPushToken: (token: string | null) => mockUnregisterPush(token),
}));

const mockNotifyAuthLogin = jest.fn();

jest.mock('../src/store/authToken', () => ({
  setTokenGetter: jest.fn(),
  getAuthToken: jest.fn(),
  onAuthLogin: jest.fn(),
  notifyAuthLogin: () => mockNotifyAuthLogin(),
}));

beforeEach(() => {
  useAuthStore.setState({
    token: null,
    userId: null,
    email: null,
    syncing: false,
    synced: false,
    lastSyncTimestamp: null,
  });
  jest.clearAllMocks();
});

describe('login', () => {
  it('stores token, userId, email and syncs', async () => {
    mockLogin.mockResolvedValue({ token: 't1', userId: 'u1' });

    const result = await useAuthStore.getState().login('a@b.com', 'pass');

    expect(result).toBe(true);
    const state = useAuthStore.getState();
    expect(state.token).toBe('t1');
    expect(state.userId).toBe('u1');
    expect(state.email).toBe('a@b.com');
    expect(mockSetSetting).toHaveBeenCalledWith('auth_token', 't1');
    expect(mockSetSetting).toHaveBeenCalledWith('auth_email', 'a@b.com');
    expect(mockConnectWS).toHaveBeenCalledWith('t1');
    expect(mockRegisterPush).toHaveBeenCalled();
    expect(mockNotifyAuthLogin).toHaveBeenCalled();
  });

  it('returns false on failure', async () => {
    mockLogin.mockRejectedValue(new Error('invalid'));

    const result = await useAuthStore.getState().login('a@b.com', 'bad');

    expect(result).toBe(false);
    expect(mockSetSetting).not.toHaveBeenCalled();
  });
});

describe('register', () => {
  it('stores token, userId, email and syncs', async () => {
    mockRegister.mockResolvedValue({ token: 't2', userId: 'u2' });

    const result = await useAuthStore.getState().register('c@d.com', 'pass');

    expect(result).toBe(true);
    const state = useAuthStore.getState();
    expect(state.token).toBe('t2');
    expect(state.userId).toBe('u2');
    expect(state.email).toBe('c@d.com');
    expect(mockNotifyAuthLogin).toHaveBeenCalled();
  });

  it('returns false on failure', async () => {
    mockRegister.mockRejectedValue(new Error('dup'));

    const result = await useAuthStore.getState().register('c@d.com', 'pass');

    expect(result).toBe(false);
  });
});

describe('logout', () => {
  it('clears state, disconnects WS, clears DB', async () => {
    useAuthStore.setState({ token: 't1', userId: 'u1', email: 'a@b.com', synced: true });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.userId).toBeNull();
    expect(state.email).toBeNull();
    expect(state.synced).toBe(false);
    expect(mockUnregisterPush).toHaveBeenCalled();
    expect(mockDisconnectWS).toHaveBeenCalled();
    expect(mockSetSetting).toHaveBeenCalledWith('auth_token', '');
    expect(mockSetSetting).toHaveBeenCalledWith('auth_email', '');
  });
});

describe('restoreSession', () => {
  it('restores session from DB when token exists', async () => {
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'auth_token') return 't1';
      if (k === 'auth_email') return 'a@b.com';
      return null;
    });

    await useAuthStore.getState().restoreSession();

    const state = useAuthStore.getState();
    expect(state.token).toBe('t1');
    expect(state.email).toBe('a@b.com');
    expect(mockConnectWS).toHaveBeenCalledWith('t1');
    expect(mockRegisterPush).toHaveBeenCalled();
  });

  it('does nothing when no token stored', async () => {
    mockGetSetting.mockResolvedValue(null);

    await useAuthStore.getState().restoreSession();

    expect(mockConnectWS).not.toHaveBeenCalled();
  });
});

describe('syncSettingsFromBackend', () => {
  it('fetches settings from API and saves to DB on login', async () => {
    mockLogin.mockResolvedValue({ token: 't1', userId: 'u1' });
    mockGetSettings.mockResolvedValue({ theme: 'dark', auto_scan: 'true' });

    await useAuthStore.getState().login('a@b.com', 'pass');
    await Promise.resolve();

    expect(mockGetSettings).toHaveBeenCalled();
    expect(mockSetSetting).toHaveBeenCalledWith('theme', 'dark');
    expect(mockSetSetting).toHaveBeenCalledWith('auto_scan', 'true');
  });

  it('ignores non-string values from settings', async () => {
    mockLogin.mockResolvedValue({ token: 't1', userId: 'u1' });
    mockGetSettings.mockResolvedValue({ theme: 'dark', count: 42 });

    await useAuthStore.getState().login('a@b.com', 'pass');
    await Promise.resolve();

    expect(mockSetSetting).toHaveBeenCalledWith('theme', 'dark');
    expect(mockSetSetting).not.toHaveBeenCalledWith('count', 42);
  });

  it('handles settings fetch failure gracefully', async () => {
    mockLogin.mockResolvedValue({ token: 't1', userId: 'u1' });
    mockGetSettings.mockRejectedValue(new Error('network error'));

    await useAuthStore.getState().login('a@b.com', 'pass');
    await Promise.resolve();

    expect(mockGetSettings).toHaveBeenCalled();
  });
});

describe('syncNow', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 't1',
      userId: 'u1',
      email: 'a@b.com',
      syncing: false,
      synced: false,
      lastSyncTimestamp: null,
    });
  });

  it('pushes settings to backend, pulls from backend, and sets synced', async () => {
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'theme_mode') return 'dark';
      if (k === 'power_cost') return '0.15';
      if (k === 'auto_scan') return 'true';
      return null;
    });
    mockGetSettings.mockResolvedValue({
      theme_mode: 'dark',
      power_cost: '0.15',
      auto_scan: 'true',
    });

    await useAuthStore.getState().syncNow();

    expect(mockPutSetting).toHaveBeenCalledWith('theme_mode', 'dark');
    expect(mockPutSetting).toHaveBeenCalledWith('power_cost', '0.15');
    expect(mockPutSetting).toHaveBeenCalledWith('auto_scan', 'true');
    expect(mockGetSettings).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.syncing).toBe(false);
    expect(state.synced).toBe(true);
    expect(state.lastSyncTimestamp).not.toBeNull();
  });

  it('skips backend push when no local settings exist', async () => {
    mockGetSetting.mockResolvedValue(null);
    mockGetSettings.mockResolvedValue({});

    await useAuthStore.getState().syncNow();

    expect(mockPutSetting).not.toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.synced).toBe(true);
  });

  it('handles push failure gracefully and still pulls from backend', async () => {
    mockGetSetting.mockResolvedValue('dark');
    mockPutSetting.mockRejectedValue(new Error('network error'));
    mockGetSettings.mockResolvedValue({ theme_mode: 'dark' });

    await useAuthStore.getState().syncNow();

    expect(mockPutSetting).toHaveBeenCalled();
    expect(mockGetSettings).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.synced).toBe(true);
  });
});

describe('queueSetting', () => {
  beforeEach(async () => {
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'settings_queue') return '[]';
      return null;
    });
    await useAuthStore.getState().restoreSession();
  });

  it('adds a setting to the queue and persists to DB', async () => {
    await queueSetting('theme_mode', 'dark');

    const lastCall = mockSetSetting.mock.calls.find(([k]) => k === 'settings_queue');
    expect(lastCall).toBeDefined();
    const parsed = JSON.parse(lastCall![1] as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].key).toBe('theme_mode');
    expect(parsed[0].value).toBe('dark');
    expect(parsed[0].timestamp).toBeGreaterThan(0);
  });

  it('appends to existing queue', async () => {
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'settings_queue')
        return JSON.stringify([{ key: 'power_cost', value: '0.15', timestamp: 100 }]);
      return null;
    });
    await useAuthStore.getState().restoreSession();

    await queueSetting('theme_mode', 'dark');

    const lastCall = mockSetSetting.mock.calls.find(([k]) => k === 'settings_queue');
    expect(lastCall).toBeDefined();
    const parsed = JSON.parse(lastCall![1] as string);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].key).toBe('power_cost');
    expect(parsed[1].key).toBe('theme_mode');
  });

  it('handles multiple queue items', async () => {
    await queueSetting('theme_mode', 'dark');
    await queueSetting('power_cost', '0.15');

    const calls = mockSetSetting.mock.calls.filter(([k]) => k === 'settings_queue');
    const lastParsed = JSON.parse(calls[calls.length - 1][1] as string);
    expect(lastParsed).toHaveLength(2);
  });
});

describe('processQueue (via syncNow)', () => {
  beforeEach(async () => {
    useAuthStore.setState({
      token: 't1',
      userId: 'u1',
      email: 'a@b.com',
      syncing: false,
      synced: false,
      lastSyncTimestamp: null,
    });
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'theme_mode') return 'dark';
      if (k === 'power_cost') return '0.15';
      if (k === 'auto_scan') return 'true';
      if (k === 'settings_queue') return '[]';
      return null;
    });
    mockGetSettings.mockResolvedValue({});
    mockPutSetting.mockResolvedValue(undefined);
    await useAuthStore.getState().restoreSession();
  });

  it('processes queued settings during syncNow', async () => {
    await queueSetting('theme_mode', 'dark');
    await queueSetting('power_cost', '0.15');

    await useAuthStore.getState().syncNow();

    expect(mockPutSetting).toHaveBeenCalledWith('theme_mode', 'dark');
    expect(mockPutSetting).toHaveBeenCalledWith('power_cost', '0.15');
  });

  it('re-queues items when processing fails', async () => {
    mockPutSetting.mockRejectedValueOnce(new Error('network error'));

    await queueSetting('theme_mode', 'dark');
    await queueSetting('power_cost', '0.15');

    await useAuthStore.getState().syncNow();

    expect(mockPutSetting).toHaveBeenCalledWith('theme_mode', 'dark');
    expect(mockPutSetting).toHaveBeenCalledWith('power_cost', '0.15');
    const lastCall = mockSetSetting.mock.calls.find(([k]) => k === 'settings_queue');
    expect(lastCall).toBeDefined();
    const parsed = JSON.parse(lastCall![1] as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].key).toBe('theme_mode');
  });

  it('processes queue before syncing SYNCED_SETTINGS', async () => {
    mockPutSetting.mockResolvedValue(undefined);

    await queueSetting('auto_scan', 'false');

    await useAuthStore.getState().syncNow();

    const putSettingCalls = mockPutSetting.mock.calls.map(([k]) => k);
    expect(putSettingCalls.filter((k) => k === 'auto_scan').length).toBe(2);
  });

  it('handles empty queue gracefully during syncNow', async () => {
    await useAuthStore.getState().syncNow();

    expect(mockPutSetting).toHaveBeenCalledWith('theme_mode', 'dark');
    expect(mockPutSetting).toHaveBeenCalledWith('power_cost', '0.15');
    expect(mockPutSetting).toHaveBeenCalledWith('auto_scan', 'true');
  });
});

describe('restoreSession with queue', () => {
  beforeEach(() => {
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'auth_token') return 't1';
      if (k === 'auth_email') return 'a@b.com';
      if (k === 'settings_queue')
        return JSON.stringify([{ key: 'theme_mode', value: 'dark', timestamp: Date.now() }]);
      return null;
    });
  });

  it('loads queue from DB during restoreSession', async () => {
    await useAuthStore.getState().restoreSession();

    mockPutSetting.mockResolvedValue(undefined);
    mockGetSettings.mockResolvedValue({});
    await useAuthStore.getState().syncNow();

    expect(mockPutSetting).toHaveBeenCalledWith('theme_mode', 'dark');
  });

  it('starts with empty queue when no stored queue', async () => {
    mockGetSetting.mockReset();
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'auth_token') return 't1';
      if (k === 'auth_email') return 'a@b.com';
      return null;
    });

    await useAuthStore.getState().restoreSession();

    mockPutSetting.mockClear();
    mockPutSetting.mockResolvedValue(undefined);
    mockGetSettings.mockResolvedValue({});

    const previousPutCalls = [...mockPutSetting.mock.calls];
    await useAuthStore.getState().syncNow();

    for (const call of mockPutSetting.mock.calls.slice(previousPutCalls.length)) {
      expect(call[0]).not.toBe('theme_mode');
    }
  });
});

describe('loadQueue edge cases', () => {
  it('handles loadQueue failure when getSetting throws', async () => {
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'settings_queue') throw new Error('DB error');
      return null;
    });
    await expect(useAuthStore.getState().restoreSession()).resolves.toBeUndefined();
  });

  it('handles loadQueue failure when JSON is invalid', async () => {
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'settings_queue') return 'not-json';
      return null;
    });
    await expect(useAuthStore.getState().restoreSession()).resolves.toBeUndefined();
  });
});

describe('restoreSession JWT decode', () => {
  it('decodes userId from valid JWT token', async () => {
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ userId: 'u42' }));
    const validJwt = `${header}.${payload}.signature`;
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'auth_token') return validJwt;
      if (k === 'auth_email') return 'a@b.com';
      return null;
    });

    await useAuthStore.getState().restoreSession();

    const state = useAuthStore.getState();
    expect(state.token).toBe(validJwt);
    expect(state.userId).toBe('u42');
  });

  it('sets userId to null when JWT has no userId claim', async () => {
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ sub: 'u42' }));
    const jwt = `${header}.${payload}.signature`;
    mockGetSetting.mockImplementation((k: string) => {
      if (k === 'auth_token') return jwt;
      if (k === 'auth_email') return 'a@b.com';
      return null;
    });

    await useAuthStore.getState().restoreSession();

    const state = useAuthStore.getState();
    expect(state.userId).toBeNull();
  });
});
