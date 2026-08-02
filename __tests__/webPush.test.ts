jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('../src/api/client', () => ({
  BASE_URL: 'http://localhost:4000',
}));

jest.mock('../src/store/authToken', () => ({
  getAuthToken: jest.fn(),
}));

import axios from 'axios';
import { getAuthToken } from '../src/store/authToken';
import { registerWebPush, unsubscribeWebPush } from '../src/services/webPush';

const mockPost = axios.post as jest.Mock;
const mockGetAuthToken = getAuthToken as jest.Mock;

const originalNavigator = (globalThis as { navigator?: unknown }).navigator;
const originalPushManager = (window as { PushManager?: unknown }).PushManager;

function setupPushEnvironment(withSubscription = true) {
  const subscription = {
    endpoint: 'https://push.example.com/endpoint',
    keys: { auth: 'auth-key', p256dh: 'p256dh-key' },
  };
  const mockSubscribe = jest.fn().mockResolvedValue(subscription);
  const mockUnsubscribe = jest.fn().mockResolvedValue(true);
  const fullSubscription = { ...subscription, unsubscribe: mockUnsubscribe };
  const mockGetSubscription = jest
    .fn()
    .mockResolvedValue(withSubscription ? fullSubscription : null);
  const registration = {
    pushManager: { subscribe: mockSubscribe, getSubscription: mockGetSubscription },
  };
  (navigator as { serviceWorker?: unknown }).serviceWorker = {
    ready: Promise.resolve(registration),
  };
  Object.defineProperty(window, 'PushManager', {
    configurable: true,
    writable: true,
    value: function PushManager() {},
  });
  return { mockSubscribe, mockGetSubscription, mockUnsubscribe, subscription };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthToken.mockReturnValue(null);
  mockPost.mockResolvedValue({});
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: {},
  });
  delete (window as { PushManager?: unknown }).PushManager;
});

afterEach(() => {
  if (originalNavigator === undefined) {
    delete (globalThis as { navigator?: unknown }).navigator;
  } else {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: originalNavigator,
    });
  }
  if (originalPushManager === undefined) {
    delete (window as { PushManager?: unknown }).PushManager;
  } else {
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      writable: true,
      value: originalPushManager,
    });
  }
});

describe('registerWebPush', () => {
  it('returns false when serviceWorker is not available', async () => {
    delete (window as { PushManager?: unknown }).PushManager;

    const result = await registerWebPush();

    expect(result).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns false when PushManager is not available', async () => {
    (navigator as { serviceWorker?: unknown }).serviceWorker = {
      ready: Promise.resolve({ pushManager: {} }),
    };
    delete (window as { PushManager?: unknown }).PushManager;

    const result = await registerWebPush();

    expect(result).toBe(false);
  });

  it('subscribes with userVisibleOnly and the application server key', async () => {
    const { mockSubscribe, subscription } = setupPushEnvironment();
    mockGetAuthToken.mockReturnValue('token-123');

    const result = await registerWebPush();

    expect(result).toBe(true);
    expect(mockSubscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(ArrayBuffer),
    });
    expect(mockPost).toHaveBeenCalledWith(
      'http://localhost:4000/api/push/web-subscribe',
      { subscription },
      { headers: { Authorization: 'Bearer token-123' } },
    );
  });

  it('returns false when there is no auth token', async () => {
    setupPushEnvironment();
    mockGetAuthToken.mockReturnValue(null);

    const result = await registerWebPush();

    expect(result).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns false when subscribing throws', async () => {
    const { mockSubscribe } = setupPushEnvironment();
    mockGetAuthToken.mockReturnValue('token-123');
    mockSubscribe.mockRejectedValue(new Error('denied'));

    const result = await registerWebPush();

    expect(result).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('unsubscribeWebPush', () => {
  it('returns false when serviceWorker is not available', async () => {
    delete (window as { PushManager?: unknown }).PushManager;

    const result = await unsubscribeWebPush();

    expect(result).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns false when there is no subscription', async () => {
    const { mockGetSubscription, mockUnsubscribe } = setupPushEnvironment(false);
    mockGetAuthToken.mockReturnValue('token-123');

    const result = await unsubscribeWebPush();

    expect(result).toBe(false);
    expect(mockGetSubscription).toHaveBeenCalled();
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('unsubscribes and notifies the server when a token exists', async () => {
    const { mockUnsubscribe } = setupPushEnvironment();
    mockGetAuthToken.mockReturnValue('token-123');

    const result = await unsubscribeWebPush();

    expect(result).toBe(true);
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(
      'http://localhost:4000/api/push/web-unsubscribe',
      {},
      { headers: { Authorization: 'Bearer token-123' } },
    );
  });

  it('returns false without an auth token after unsubscribing', async () => {
    setupPushEnvironment();
    mockGetAuthToken.mockReturnValue(null);

    const result = await unsubscribeWebPush();

    expect(result).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns false when unsubscribing throws', async () => {
    const { mockUnsubscribe } = setupPushEnvironment();
    mockGetAuthToken.mockReturnValue('token-123');
    mockUnsubscribe.mockRejectedValue(new Error('nope'));

    const result = await unsubscribeWebPush();

    expect(result).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });
});
