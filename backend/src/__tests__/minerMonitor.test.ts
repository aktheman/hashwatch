const mockQuery = jest.fn();
const mockSendOffline = jest.fn();
const mockSendOnline = jest.fn();
const mockSendHot = jest.fn();
const mockSendHashrateDrop = jest.fn();
const mockSendPoolChange = jest.fn();

jest.mock('../db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

jest.mock('../services/pushNotifications', () => ({
  sendMinerOfflineNotification: mockSendOffline,
  sendMinerOnlineNotification: mockSendOnline,
  sendMinerHotNotification: mockSendHot,
  sendHashrateDropNotification: mockSendHashrateDrop,
  sendPoolChangeNotification: mockSendPoolChange,
}));

import { checkMinerStatus } from '../services/minerMonitor';

beforeEach(async () => {
  jest.clearAllMocks();
  mockQuery.mockRejectedValue(new Error('DB unavailable'));
});

describe('checkMinerStatus', () => {
  it('stores initial state and does not notify', async () => {
    await checkMinerStatus('u1', 'm1', 'MyMiner', '192.168.1.100', true, 50, 500);

    expect(mockSendOffline).not.toHaveBeenCalled();
    expect(mockSendOnline).not.toHaveBeenCalled();
    expect(mockSendHot).not.toHaveBeenCalled();
    expect(mockSendHashrateDrop).not.toHaveBeenCalled();
  });

  it('notifies when miner goes offline', async () => {
    await checkMinerStatus('u2', 'm2', 'MyMiner', '192.168.1.100', true, 50, 500);
    jest.clearAllMocks();

    await checkMinerStatus('u2', 'm2', 'MyMiner', '192.168.1.100', false, 50, 0);

    expect(mockSendOffline).toHaveBeenCalledWith('u2', 'MyMiner', '192.168.1.100', 'm2');
  });

  it('notifies when miner comes back online', async () => {
    await checkMinerStatus('u3', 'm3', 'MyMiner', '192.168.1.100', false, 50, 0);
    jest.clearAllMocks();

    await checkMinerStatus('u3', 'm3', 'MyMiner', '192.168.1.100', true, 50, 500);

    expect(mockSendOnline).toHaveBeenCalledWith('u3', 'MyMiner', '192.168.1.100', 'm3');
  });

  it('does not notify offline if already offline', async () => {
    await checkMinerStatus('u4', 'm4', 'MyMiner', '192.168.1.100', false, 50, 0);
    jest.clearAllMocks();

    await checkMinerStatus('u4', 'm4', 'MyMiner', '192.168.1.100', false, 50, 0);

    expect(mockSendOffline).not.toHaveBeenCalled();
  });

  it('notifies when temperature exceeds 70 for the first time', async () => {
    await checkMinerStatus('u5', 'm5', 'MyMiner', '192.168.1.100', true, 50, 500);
    jest.clearAllMocks();

    await checkMinerStatus('u5', 'm5', 'MyMiner', '192.168.1.100', true, 85, 500);

    expect(mockSendHot).toHaveBeenCalledWith('u5', 'MyMiner', '192.168.1.100', 85, 'm5');
  });

  it('does not notify hot if temperature stays above 70', async () => {
    await checkMinerStatus('u6', 'm6', 'MyMiner', '192.168.1.100', true, 80, 500);
    jest.clearAllMocks();

    await checkMinerStatus('u6', 'm6', 'MyMiner', '192.168.1.100', true, 85, 500);

    expect(mockSendHot).not.toHaveBeenCalled();
  });

  it('notifies hashrate drop when hashrate halves', async () => {
    await checkMinerStatus('u7', 'm7', 'MyMiner', '192.168.1.100', true, 50, 500);
    jest.clearAllMocks();

    await checkMinerStatus('u7', 'm7', 'MyMiner', '192.168.1.100', true, 50, 200);

    expect(mockSendHashrateDrop).toHaveBeenCalledWith('u7', 'MyMiner', 'm7', 60);
  });

  it('does not notify hashrate drop when hashrate is zero', async () => {
    await checkMinerStatus('u8', 'm8', 'MyMiner', '192.168.1.100', true, 50, 500);
    jest.clearAllMocks();

    await checkMinerStatus('u8', 'm8', 'MyMiner', '192.168.1.100', true, 50, 0);

    expect(mockSendHashrateDrop).not.toHaveBeenCalled();
  });

  it('respects cooldown for offline notifications', async () => {
    await checkMinerStatus('u9', 'm9', 'MyMiner', '192.168.1.100', true, 50, 500);
    jest.clearAllMocks();

    await checkMinerStatus('u9', 'm9', 'MyMiner', '192.168.1.100', false, 50, 0);
    expect(mockSendOffline).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    await checkMinerStatus('u9', 'm9', 'MyMiner', '192.168.1.100', true, 50, 500);
    jest.clearAllMocks();

    await checkMinerStatus('u9', 'm9', 'MyMiner', '192.168.1.100', false, 50, 0);
    expect(mockSendOffline).not.toHaveBeenCalled();
  });
});
