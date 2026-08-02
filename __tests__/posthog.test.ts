const mockInit = jest.fn();
const mockIdentify = jest.fn();
const mockCapture = jest.fn();
const mockReset = jest.fn();
const mockShutdown = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: (...args: unknown[]) => mockInit(...args),
    identify: (...args: unknown[]) => mockIdentify(...args),
    capture: (...args: unknown[]) => mockCapture(...args),
    reset: () => mockReset(),
    shutdown: () => mockShutdown(),
  },
}));

function loadPosthogModule() {
  return require('../src/services/posthog');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInit.mockReset();
  mockIdentify.mockReset();
  mockCapture.mockReset();
  mockReset.mockReset();
  mockShutdown.mockReset();
  delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
  delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
  jest.resetModules();
});

describe('without a PostHog key', () => {
  it('identifyUser does nothing', async () => {
    const mod = loadPosthogModule();

    await mod.identifyUser('user-1', { plan: 'pro' });

    expect(mockInit).not.toHaveBeenCalled();
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('capture does nothing', async () => {
    const mod = loadPosthogModule();

    await mod.capture('miner_offline', { minerId: 'm1' });

    expect(mockInit).not.toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('resetUser does nothing', async () => {
    const mod = loadPosthogModule();

    await mod.resetUser();

    expect(mockReset).not.toHaveBeenCalled();
  });

  it('shutdownPostHog does nothing', async () => {
    const mod = loadPosthogModule();

    await mod.shutdownPostHog();

    expect(mockShutdown).not.toHaveBeenCalled();
  });
});

describe('with a PostHog key', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test_key';
  });

  it('identifyUser initializes PostHog and calls identify', async () => {
    const mod = loadPosthogModule();

    await mod.identifyUser('user-1', { plan: 'pro' });

    expect(mockInit).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({ api_host: 'https://us.i.posthog.com' }),
    );
    expect(mockIdentify).toHaveBeenCalledWith('user-1', { plan: 'pro' });
  });

  it('capture calls capture with event and properties', async () => {
    const mod = loadPosthogModule();

    await mod.capture('miner_offline', { minerId: 'm1' });

    expect(mockInit).toHaveBeenCalled();
    expect(mockCapture).toHaveBeenCalledWith('miner_offline', { minerId: 'm1' });
  });

  it('resetUser calls reset', async () => {
    const mod = loadPosthogModule();

    await mod.resetUser();

    expect(mockInit).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalled();
  });

  it('shutdownPostHog calls shutdown', async () => {
    const mod = loadPosthogModule();

    await mod.shutdownPostHog();

    expect(mockInit).toHaveBeenCalled();
    expect(mockShutdown).toHaveBeenCalled();
  });

  it('uses the custom host when EXPO_PUBLIC_POSTHOG_HOST is set', async () => {
    process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://custom.posthog.com';
    const mod = loadPosthogModule();

    await mod.capture('evt');

    expect(mockInit).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({ api_host: 'https://custom.posthog.com' }),
    );
  });

  it('only initializes PostHog once across calls', async () => {
    const mod = loadPosthogModule();

    await mod.identifyUser('u1');
    await mod.capture('evt');
    await mod.resetUser();

    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it('does nothing when PostHog init throws', async () => {
    mockInit.mockImplementation(() => {
      throw new Error('init failed');
    });
    const mod = loadPosthogModule();

    await mod.identifyUser('user-1');

    expect(mockInit).toHaveBeenCalled();
    expect(mockIdentify).not.toHaveBeenCalled();
  });
});
