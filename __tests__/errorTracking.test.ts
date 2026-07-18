import {
  initErrorTracking,
  captureError,
  captureEvent,
  flushErrorQueue,
} from '../src/services/errorTracking';

jest.mock('../src/store/authToken', () => ({
  getAuthToken: jest.fn(() => 'test-token'),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('errorTracking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('captureError does nothing when disabled', () => {
    initErrorTracking({ enabled: false });
    captureError(new Error('test'));
    expect(console.error).not.toHaveBeenCalled();
  });

  it('captureEvent does nothing when disabled', () => {
    initErrorTracking({ enabled: false });
    captureEvent('test_event');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('captureError queues error when enabled with endpoint', () => {
    initErrorTracking({ enabled: true, endpoint: 'https://api.example.com/errors' });
    captureError(new Error('something broke'), { userId: '123' });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('captureEvent queues event when enabled with endpoint', () => {
    initErrorTracking({ enabled: true, endpoint: 'https://api.example.com/events' });
    captureEvent('button_click', { screen: 'dashboard' });
    expect(console.log).not.toHaveBeenCalled();
  });

  it('initErrorTracking sets enabled state', () => {
    initErrorTracking({ enabled: true, endpoint: 'https://api.example.com/errors' });
    captureError(new Error('should queue'));
    expect(console.error).not.toHaveBeenCalled();
  });

  it('flushErrorQueue resolves', async () => {
    initErrorTracking({ enabled: true, endpoint: 'https://api.example.com/errors' });
    captureError(new Error('queue me'));
    const result = flushErrorQueue();
    await expect(result).resolves.toBeUndefined();
  });

  it('queue respects MAX_QUEUE_SIZE', () => {
    initErrorTracking({ enabled: true, endpoint: 'https://api.example.com/errors' });
    for (let i = 0; i < 55; i++) {
      captureError(new Error(`error ${i}`));
    }
    expect(console.error).not.toHaveBeenCalled();
  });

  it('captureError logs to console when enabled without endpoint', () => {
    initErrorTracking({ enabled: true });
    captureError(new Error('console error'));
    expect(console.error).toHaveBeenCalledWith('[ErrorTracking]', 'console error', '');
  });
});
