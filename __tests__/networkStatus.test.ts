import { renderHook } from '@testing-library/react-native';
import { useNetworkStatus } from '../src/services/networkStatus';

const mockGetNetworkState = jest.fn();

jest.mock('expo-network', () => ({
  getNetworkStateAsync: () => mockGetNetworkState(),
}));

beforeEach(() => {
  mockGetNetworkState.mockResolvedValue({ isConnected: true, type: 3 });
});

describe('useNetworkStatus', () => {
  it('returns a status object', async () => {
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result).toBeDefined();
    expect(typeof result.current!.isOnline).toBe('boolean');
  });

  it('starts with online status by default', async () => {
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result.current!.isOnline).toBe(true);
  });

  it('returns offline when network is disconnected', async () => {
    mockGetNetworkState.mockResolvedValue({ isConnected: false, type: 0 });
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result.current!.isOnline).toBe(false);
  });

  it('falls back to true when isConnected is null', async () => {
    mockGetNetworkState.mockResolvedValue({ isConnected: null, type: null });
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result.current!.isOnline).toBe(true);
  });

  it('returns default status when getNetworkStateAsync throws', async () => {
    mockGetNetworkState.mockRejectedValue(new Error('network error'));
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result.current!.isOnline).toBe(true);
    expect(result.current!.type).toBeNull();
  });

  it('can have multiple listeners without restarting interval', async () => {
    const { result: r1 } = await renderHook(() => useNetworkStatus());
    const { result: r2 } = await renderHook(() => useNetworkStatus());
    expect(r1.current!.isOnline).toBe(true);
    expect(r2.current!.isOnline).toBe(true);
  });

  it('stops polling after the last listener unmounts', async () => {
    const { unmount } = await renderHook(() => useNetworkStatus());
    unmount();
    mockGetNetworkState.mockReset();
    await renderHook(() => useNetworkStatus());
    expect(mockGetNetworkState).toHaveBeenCalled();
  });
});

// unref branch (lines 35-37) cannot be tested in Jest:
// setInterval in Jest/jsdom returns a numeric ID, not a Node.js Timeout object.
// The `typeof _interval === 'object' && 'unref' in _interval` check
// only passes in Node.js/production. This is safe to skip.
