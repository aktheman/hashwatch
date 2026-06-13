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

beforeEach(() => {
  jest.clearAllMocks();
  disconnectWebSocket();

  mockWsSend = jest.fn();
  mockWsClose = jest.fn();
  mockWsOnopen = null;
  mockWsOnclose = null;

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
});

describe('disconnectWebSocket', () => {
  it('closes the WebSocket and clears state', () => {
    connectWebSocket('test-token');
    disconnectWebSocket();
    expect(mockWsClose).toHaveBeenCalled();
  });
});
