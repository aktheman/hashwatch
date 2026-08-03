import {
  initCrashReporting,
  captureError,
  captureMessage,
  getCrashReports,
  clearCrashReports,
  getCrashReportCount,
  setCrashUser,
  clearCrashUser,
} from '../src/utils/crash';

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  clearCrashReports();
  initCrashReporting({ enabled: true });
});

describe('crash utils', () => {
  test('captureError creates report', () => {
    const report = captureError(new Error('test error'));
    expect(report).not.toBeNull();
    expect(report!.message).toBe('test error');
    expect(report!.id).toContain('crash_');
  });

  test('captureError with string message', () => {
    const report = captureError('string error');
    expect(report!.message).toBe('string error');
    expect(report!.stack).toBeUndefined();
  });

  test('captureError with context', () => {
    const report = captureError('err', 'error', { screen: 'Dashboard' });
    expect(report!.context).toMatchObject({ screen: 'Dashboard', severity: 'error' });
  });

  test('captureMessage creates report', () => {
    const report = captureMessage('info msg', 'info');
    expect(report!.message).toBe('info msg');
  });

  test('disabled returns null', () => {
    initCrashReporting({ enabled: false });
    const report = captureError(new Error('disabled'));
    expect(report).toBeNull();
  });

  test('getCrashReports returns stored reports', () => {
    captureError(new Error('one'));
    captureError(new Error('two'));
    expect(getCrashReports()).toHaveLength(2);
  });

  test('getCrashReportCount', () => {
    captureError(new Error('a'));
    expect(getCrashReportCount()).toBe(1);
  });

  test('clearCrashReports empties storage', () => {
    captureError(new Error('x'));
    clearCrashReports();
    expect(getCrashReports()).toHaveLength(0);
  });

  test('includes userId when set', () => {
    setCrashUser('user123');
    const report = captureError(new Error('auth err'));
    expect(report!.context).toMatchObject({ userId: 'user123' });
  });

  test('clearCrashUser removes userId', () => {
    setCrashUser('user123');
    clearCrashUser();
    const report = captureError(new Error('no user'));
    expect(report!.context).toMatchObject({ userId: null });
  });

  test('limits to 50 reports', () => {
    for (let i = 0; i < 60; i++) {
      captureError(new Error(`err${i}`));
    }
    expect(getCrashReports()).toHaveLength(50);
  });
});

describe('crash utils with localStorage', () => {
  function createLocalStorage() {
    const store = new Map<string, string>();
    return {
      getItem: jest.fn((k: string) => store.get(k) ?? null),
      setItem: jest.fn((k: string, v: string) => {
        store.set(k, v);
      }),
      removeItem: jest.fn((k: string) => {
        store.delete(k);
      }),
      _store: store,
    };
  }

  let storage: ReturnType<typeof createLocalStorage>;

  beforeEach(() => {
    storage = createLocalStorage();
    (globalThis as any).localStorage = storage;
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  test('captureError persists to localStorage', () => {
    captureError(new Error('persisted'));
    expect(storage.setItem).toHaveBeenCalled();
    const [key, value] = storage.setItem.mock.calls[0];
    expect(key).toBe('crash_reports');
    const parsed = JSON.parse(value);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].message).toBe('persisted');
  });

  test('getCrashReports reads persisted JSON from localStorage', () => {
    storage._store.set('crash_reports', JSON.stringify([{ id: 'old', message: 'old error' }]));
    const reports = getCrashReports();
    expect(reports).toHaveLength(1);
    expect(reports[0].message).toBe('old error');
  });

  test('getCrashReports returns empty array when nothing stored', () => {
    expect(getCrashReports()).toEqual([]);
  });

  test('clearCrashReports removes the key from localStorage', () => {
    storage._store.set('crash_reports', '[]');
    clearCrashReports();
    expect(storage.removeItem).toHaveBeenCalledWith('crash_reports');
    expect(getCrashReports()).toEqual([]);
  });

  test('caps reports at 50 via localStorage', () => {
    for (let i = 0; i < 60; i++) {
      captureError(new Error(`ls${i}`));
    }
    expect(getCrashReports()).toHaveLength(50);
  });
});
