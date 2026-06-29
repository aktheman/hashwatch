import {
  setPoolStatus,
  getPoolStatus,
  listPoolStats,
  resetPoolStatus,
} from '../services/minerState';

describe('services/minerState', () => {
  afterEach(() => {
    resetPoolStatus();
  });

  describe('setPoolStatus', () => {
    it('stores pool status as-is when hashrate and pool are valid', () => {
      setPoolStatus('miner-1', {
        miner: 'miner-1',
        pool: 'stratum+tcp://pool.example.com',
        hashrate: 123,
        lastSeen: 1_700_000_000,
      });

      expect(getPoolStatus('miner-1')).toEqual({
        miner: 'miner-1',
        pool: 'stratum+tcp://pool.example.com',
        hashrate: 123,
        lastSeen: 1_700_000_000,
      });
    });

    it('normalises hashrate 0 to 0 when passed as 0', () => {
      setPoolStatus('miner-2', {
        miner: 'miner-2',
        pool: null,
        hashrate: 0,
        lastSeen: 0,
      });

      expect(getPoolStatus('miner-2').hashrate).toBe(0);
    });

    it('normalises hashrate null to 0', () => {
      setPoolStatus('miner-3', {
        miner: 'miner-3',
        pool: 'pool',
        hashrate: null as unknown as number,
        lastSeen: 0,
      });

      expect(getPoolStatus('miner-3').hashrate).toBe(0);
    });

    it('normalises pool null to null (no fallback to unknown on set)', () => {
      setPoolStatus('miner-4', {
        miner: 'miner-4',
        pool: null,
        hashrate: 10,
        lastSeen: 5,
      });

      expect(getPoolStatus('miner-4').pool).toBeNull();
    });
  });

  describe('getPoolStatus', () => {
    it('returns a default object when miner has no stored status', () => {
      const result = getPoolStatus('missing-miner');

      expect(result).toEqual({
        miner: 'missing-miner',
        pool: null,
        hashrate: 0,
        lastSeen: 0,
      });
    });

    it('returns the previously stored status', () => {
      setPoolStatus('miner-5', {
        miner: 'miner-5',
        pool: 'pool-b',
        hashrate: 50,
        lastSeen: 99,
      });

      expect(getPoolStatus('miner-5')).toEqual({
        miner: 'miner-5',
        pool: 'pool-b',
        hashrate: 50,
        lastSeen: 99,
      });
    });
  });

  describe('listPoolStats', () => {
    it('returns an empty array when no statuses are stored', () => {
      expect(listPoolStats()).toEqual([]);
    });

    it('aggregates miners into a single pool bucket', () => {
      setPoolStatus('miner-a', {
        miner: 'miner-a',
        pool: 'pool-x',
        hashrate: 100,
        lastSeen: 1,
      });
      setPoolStatus('miner-b', {
        miner: 'miner-b',
        pool: 'pool-x',
        hashrate: 200,
        lastSeen: 2,
      });

      const stats = listPoolStats();

      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({
        pool: 'pool-x',
        minerCount: 2,
        totalHashrate: 300,
        miners: ['miner-a', 'miner-b'],
      });
    });

    it('maps null pool to the unknown bucket', () => {
      setPoolStatus('miner-c', {
        miner: 'miner-c',
        pool: null,
        hashrate: 10,
        lastSeen: 0,
      });

      const stats = listPoolStats();

      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({
        pool: 'unknown',
        minerCount: 1,
        totalHashrate: 10,
        miners: ['miner-c'],
      });
    });

    it('keeps separate buckets for different pools', () => {
      setPoolStatus('miner-d', {
        miner: 'miner-d',
        pool: 'pool-1',
        hashrate: 10,
        lastSeen: 0,
      });
      setPoolStatus('miner-e', {
        miner: 'miner-e',
        pool: 'pool-2',
        hashrate: 20,
        lastSeen: 0,
      });

      const stats = listPoolStats();

      expect(stats).toHaveLength(2);
      expect(
        stats.some((s) => s.pool === 'pool-1' && s.minerCount === 1 && s.totalHashrate === 10),
      ).toBe(true);
      expect(
        stats.some((s) => s.pool === 'pool-2' && s.minerCount === 1 && s.totalHashrate === 20),
      ).toBe(true);
    });

    it('does not reuse previous test data after a fresh run (module-level state)', () => {
      setPoolStatus('isolated-1', {
        miner: 'isolated-1',
        pool: 'iso-pool',
        hashrate: 5,
        lastSeen: 0,
      });

      const stats = listPoolStats();

      expect(stats.some((s) => s.pool === 'iso-pool')).toBe(true);
    });
  });
});
