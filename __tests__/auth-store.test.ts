import { useAuthStore } from '../src/store/auth';

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
  registerPushToken: () => mockRegisterPush(),
  unregisterPushToken: () => mockUnregisterPush(),
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
