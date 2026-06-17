import { connectWebSocket, disconnectWebSocket } from '../src/services/websocket';

const mockApply = jest.fn();

jest.mock('../src/store/miners', () => ({
  useMinerStore: {
    getState: () => ({
      miners: [{ id: 'local-1', remoteId: 'remote-1' }],
      applyRemoteSnapshot: (id: string) => mockApply(id),
    }),
  },
}));

jest.mock('../src/constants', () => ({
  getExtra: () => ({ apiUrl: 'http://localhost:4000' }),
}));

let mockWsSend: jest.Mock;
let mockWsClose: jest.Mock;
let mockWsOnopen: (() => void) | null;
let mockWsOnclose: (() => void) | null;
let mockWsOnmessage: ((event: { data: string }) => void) | null;
let mockWsOnerror: (() => void) | null;

beforeEach(() => {
  jest.clearAllMocks();
  disconnectWebSocket();

  mockWsSend = jest.fn();
  mockWsClose = jest.fn();
  mockWsOnopen = null;
  mockWsOnclose = null;
  mockWsOnmessage = null;
  mockWsOnerror = null;

  (global as any).WebSocket = jest.fn().mockImplementation(() => ({
    send: mockWsSend,
    close: mockWsClose,
    get onopen() {
      return mockWsOnopen;
    },
    set onopen(fn) {
      mockWsOnopen = fn;
    },
    get onclose() {
      return mockWsOnclose;
    },
    set onclose(fn) {
      mockWsOnclose = fn;
    },
    get onmessage() {
      return mockWsOnmessage;
    },
    set onmessage(fn) {
      mockWsOnmessage = fn;
    },
    get onerror() {
      return mockWsOnerror;
    },
    set onerror(fn) {
      mockWsOnerror = fn;
    },
  }));
});

describe('connectWebSocket', () => {
  it('creates a WebSocket connection', () => {
    connectWebSocket('test-token');
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:4000/ws');
  });

  it('sends auth message on open', () => {
    connectWebSocket('test-token');
    mockWsOnopen?.();
    expect(mockWsSend).toHaveBeenCalledWith(JSON.stringify({ type: 'auth', token: 'test-token' }));
  });

  it('handles snapshot messages', () => {
    connectWebSocket('test-token');
    const snapshot = { minerId: 'remote-1', hashRate: 500, timestamp: Date.now() };
    mockWsOnmessage?.({ data: JSON.stringify({ type: 'snapshot', snapshot }) });
    expect(mockApply).toHaveBeenCalledWith('local-1');
  });

  it('ignores non-snapshot messages', () => {
    connectWebSocket('test-token');
    mockWsOnmessage?.({ data: JSON.stringify({ type: 'ping' }) });
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('handles invalid JSON messages', () => {
    connectWebSocket('test-token');
    mockWsOnmessage?.({ data: 'not json' });
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('reconnects on close', () => {
    jest.useFakeTimers();
    connectWebSocket('test-token');
    mockWsOnclose?.();
    jest.advanceTimersByTime(5000);
    expect(global.WebSocket).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
    disconnectWebSocket();
  });

  it('closes existing connection before reconnecting', () => {
    connectWebSocket('test-token');
    connectWebSocket('new-token');
    expect(mockWsClose).toHaveBeenCalled();
  });

  it('clears reconnect timer when reconnecting after disconnect', () => {
    jest.useFakeTimers();
    connectWebSocket('test-token');
    mockWsOnclose?.();
    jest.advanceTimersByTime(1000);
    connectWebSocket('new-token');
    jest.advanceTimersByTime(6000);
    expect(global.WebSocket).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
    disconnectWebSocket();
  });
});

describe('WebSocket error handling', () => {
  it('closes WebSocket on error', () => {
    connectWebSocket('test-token');
    mockWsOnerror?.();
    expect(mockWsClose).toHaveBeenCalled();
  });

  it('schedules reconnect when WebSocket constructor throws', () => {
    jest.useFakeTimers();
    (global as any).WebSocket = jest.fn().mockImplementation(() => {
      throw new Error('constructor failed');
    });

    connectWebSocket('test-token');
    jest.advanceTimersByTime(5000);
    expect(global.WebSocket).toHaveBeenCalled();

    disconnectWebSocket();
    jest.useRealTimers();
  });
});

describe('disconnectWebSocket', () => {
  it('closes the WebSocket and clears state', () => {
    connectWebSocket('test-token');
    disconnectWebSocket();
    expect(mockWsClose).toHaveBeenCalled();
  });

  it('clears reconnect timer if active', () => {
    jest.useFakeTimers();
    connectWebSocket('test-token');
    mockWsOnclose?.();
    jest.advanceTimersByTime(1000);
    disconnectWebSocket();
    jest.advanceTimersByTime(5000);
    expect(global.WebSocket).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
