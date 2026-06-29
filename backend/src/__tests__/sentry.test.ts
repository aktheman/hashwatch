describe('sentry service', () => {
  const mockInit = jest.fn();
  const mockWithScope = jest.fn().mockImplementation((fn) => {
    const scope = { setExtras: jest.fn(), setLevel: jest.fn() };
    fn(scope);
    return scope;
  });
  const mockCaptureException = jest.fn();
  const mockCaptureMessage = jest.fn();

  jest.mock('@sentry/node', () => ({
    init: mockInit,
    withScope: mockWithScope,
    captureException: mockCaptureException,
    captureMessage: mockCaptureMessage,
  }));

  afterEach(() => {
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    delete process.env.SENTRY_PROFILES_SAMPLE_RATE;
    jest.clearAllMocks();
    jest.resetModules();
  });

  const withFreshModule = async (env: Record<string, string | undefined>) => {
    Object.entries(env).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
    jest.resetModules();
    return import('../services/sentry') as Promise<typeof import('../services/sentry')>;
  };

  it('returns early when DSN is missing', async () => {
    const { initSentry } = await withFreshModule({ SENTRY_DSN: undefined });
    initSentry();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('initializes Sentry with expected config', async () => {
    const { initSentry } = await withFreshModule({
      SENTRY_DSN: 'https://example@sentry.io/123',
      SENTRY_TRACES_SAMPLE_RATE: '0.1',
      SENTRY_PROFILES_SAMPLE_RATE: '0.2',
    });
    initSentry();

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://example@sentry.io/123',
        environment: expect.any(String),
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.2,
        sendDefaultPii: false,
      }),
    );
  });

  it('initializes Sentry with default sample rates', async () => {
    const { initSentry } = await withFreshModule({
      SENTRY_DSN: 'https://example@sentry.io/123',
      SENTRY_TRACES_SAMPLE_RATE: undefined,
      SENTRY_PROFILES_SAMPLE_RATE: undefined,
    });
    initSentry();

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0,
        profilesSampleRate: 0,
      }),
    );
  });

  it('reports enabled status from SENTRY_DSN', async () => {
    const withoutDsn = await withFreshModule({ SENTRY_DSN: undefined });
    expect(withoutDsn.isSentryEnabled()).toBe(false);

    const withDsn = await withFreshModule({ SENTRY_DSN: 'https://example@sentry.io/123' });
    expect(withDsn.isSentryEnabled()).toBe(true);
  });

  it('captureException forwards context extras when provided', async () => {
    const { captureException } = await withFreshModule({
      SENTRY_DSN: 'https://example@sentry.io/123',
    });
    captureException(new Error('boom'), { foo: 'bar' });
    expect(mockWithScope).toHaveBeenCalledTimes(1);
    const scopeCb = mockWithScope.mock.calls[0][0];
    const scope = { setExtras: jest.fn() };
    scopeCb(scope);
    expect(scope.setExtras).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('captureMessage uses default info level and forwards context', async () => {
    const { captureMessage } = await withFreshModule({
      SENTRY_DSN: 'https://example@sentry.io/123',
    });
    captureMessage('hello', 'warning', { a: 1 });
    expect(mockWithScope).toHaveBeenCalledTimes(1);
    const scopeCb = mockWithScope.mock.calls[0][0];
    const scope = { setExtras: jest.fn(), setLevel: jest.fn() };
    scopeCb(scope);
    expect(scope.setExtras).toHaveBeenCalledWith({ a: 1 });
    expect(scope.setLevel).toHaveBeenCalledWith('warning');
    expect(mockCaptureMessage).toHaveBeenCalledWith('hello', 'warning');
  });

  it('skips Sentry calls when DSN is missing', async () => {
    const { captureException, captureMessage } = await withFreshModule({ SENTRY_DSN: undefined });
    captureException(new Error('no-dsn'));
    captureMessage('no-dsn');
    expect(mockWithScope).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('initializes Sentry with explicit production environment', async () => {
    const { initSentry } = await withFreshModule({
      SENTRY_DSN: 'https://example@sentry.io/123',
      NODE_ENV: 'production',
    });
    initSentry();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://example@sentry.io/123',
        environment: 'production',
        tracesSampleRate: 0,
        profilesSampleRate: 0,
        sendDefaultPii: false,
      }),
    );
  });

  it('captureException skips call when Sentry is disabled', async () => {
    const { captureException } = await withFreshModule({ SENTRY_DSN: undefined });
    captureException(new Error('silent'));
    expect(mockWithScope).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('captureMessage skips call when Sentry is disabled', async () => {
    const { captureMessage } = await withFreshModule({ SENTRY_DSN: undefined });
    captureMessage('silent');
    expect(mockWithScope).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });
});
