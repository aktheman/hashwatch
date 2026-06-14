import { renderHook } from '@testing-library/react-native';
import { useNetworkStatus } from '../src/services/networkStatus';

const mockGetNetworkState = jest.fn();

jest.mock('expo-network', () => ({
  getNetworkStateAsync: () => mockGetNetworkState(),
}));

describe('useNetworkStatus', () => {
  beforeEach(() => {
    mockGetNetworkState.mockResolvedValue({ isConnected: true, type: 3 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a status object', async () => {
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result).toBeDefined();
    expect(typeof result.current!.isOnline).toBe('boolean');
  });

  it('starts with online status by default', async () => {
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result.current!.isOnline).toBe(true);
  });
});
