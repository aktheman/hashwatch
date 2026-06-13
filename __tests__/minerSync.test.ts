import {
  syncMinersWithBackend,
  createRemoteMiner,
  deleteRemoteMiner,
} from '../src/services/minerSync';
import { Miner } from '../src/types';

const mockFetchMiners = jest.fn();
const mockCreateMiner = jest.fn();
const mockDeleteMinerAPI = jest.fn();
const mockSaveMiner = jest.fn();

jest.mock('../src/api/client', () => ({
  fetchMiners: () => mockFetchMiners(),
  createMiner: (data: { name: string; ip: string; port: number }) => mockCreateMiner(data),
  deleteMinerAPI: (id: string) => mockDeleteMinerAPI(id),
}));

jest.mock('../src/db/database', () => ({
  saveMiner: (m: Miner) => mockSaveMiner(m),
}));

function makeMiner(id: string, overrides: Partial<Miner> = {}): Miner {
  return {
    id,
    name: `Miner ${id}`,
    ip: `192.168.1.${id.slice(-1)}`,
    port: 80,
    isOnline: true,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('syncMinersWithBackend', () => {
  it('matches local miners to remote by IP:port', async () => {
    mockFetchMiners.mockResolvedValue([
      { id: 'remote-1', ip: '192.168.1.1', port: 80, name: 'M1' },
    ]);

    const local = [makeMiner('local-1', { ip: '192.168.1.1', remoteId: undefined })];
    const result = await syncMinersWithBackend(local);

    expect(result[0].remoteId).toBe('remote-1');
    expect(mockSaveMiner).toHaveBeenCalled();
  });

  it('creates remote miner for local-only miners', async () => {
    mockFetchMiners.mockResolvedValue([]);
    mockCreateMiner.mockResolvedValue({ id: 'new-remote-1' });

    const local = [makeMiner('local-1', { ip: '192.168.1.1' })];
    const result = await syncMinersWithBackend(local);

    expect(mockCreateMiner).toHaveBeenCalledWith(expect.objectContaining({ ip: '192.168.1.1' }));
    expect(result[0].remoteId).toBe('new-remote-1');
  });

  it('keeps existing remoteId when already synced', async () => {
    mockFetchMiners.mockResolvedValue([
      { id: 'remote-1', ip: '192.168.1.1', port: 80, name: 'M1' },
    ]);

    const local = [makeMiner('local-1', { ip: '192.168.1.1', remoteId: 'remote-1' })];
    const result = await syncMinersWithBackend(local);

    expect(result[0].remoteId).toBe('remote-1');
    expect(mockSaveMiner).not.toHaveBeenCalled();
  });

  it('handles API failure gracefully', async () => {
    mockFetchMiners.mockRejectedValue(new Error('network error'));

    const local = [makeMiner('local-1')];
    await expect(syncMinersWithBackend(local)).rejects.toThrow();
  });
});

describe('createRemoteMiner', () => {
  it('creates remote miner and returns id', async () => {
    mockCreateMiner.mockResolvedValue({ id: 'remote-1' });

    const id = await createRemoteMiner(makeMiner('local-1'));

    expect(id).toBe('remote-1');
  });

  it('returns undefined on failure', async () => {
    mockCreateMiner.mockRejectedValue(new Error('fail'));

    const id = await createRemoteMiner(makeMiner('local-1'));

    expect(id).toBeUndefined();
  });
});

describe('deleteRemoteMiner', () => {
  it('calls API to delete remote miner', async () => {
    await deleteRemoteMiner('remote-1');
    expect(mockDeleteMinerAPI).toHaveBeenCalledWith('remote-1');
  });

  it('does not throw on failure', async () => {
    mockDeleteMinerAPI.mockRejectedValue(new Error('fail'));
    await expect(deleteRemoteMiner('remote-1')).resolves.toBeUndefined();
  });
});
