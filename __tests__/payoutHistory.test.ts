jest.mock('../src/db/database', () => ({
  getSetting: jest.fn(),
  setSetting: jest.fn(),
}));

describe('payoutHistory', () => {
  const DB = jest.requireMock('../src/db/database') as {
    getSetting: jest.Mock;
    setSetting: jest.Mock;
  };

  const store: Record<string, string> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(store)) delete store[k];
    DB.getSetting.mockImplementation(async (key: string) => store[key] ?? null);
    DB.setSetting.mockImplementation(async (key: string, value: string) => {
      store[key] = value;
    });
  });

  describe('getPayoutHistory', () => {
    it('returns an empty list when nothing is stored', async () => {
      const { getPayoutHistory } = await import('../src/services/payoutHistory');
      expect(await getPayoutHistory()).toEqual([]);
    });

    it('returns stored entries', async () => {
      const entries = [
        { id: 'p1', provider: 'braiins', amount: 0.001, timestamp: 1, recordedAt: 2 },
      ];
      DB.getSetting.mockResolvedValue(JSON.stringify(entries));
      const { getPayoutHistory } = await import('../src/services/payoutHistory');
      expect(await getPayoutHistory()).toEqual(entries);
    });

    it('returns empty on corrupt JSON', async () => {
      DB.getSetting.mockResolvedValue('{not json');
      const { getPayoutHistory } = await import('../src/services/payoutHistory');
      expect(await getPayoutHistory()).toEqual([]);
    });
  });

  describe('recordPoolSnapshot', () => {
    it('ignores snapshots without a payout timestamp', async () => {
      const { recordPoolSnapshot } = await import('../src/services/payoutHistory');
      await recordPoolSnapshot('braiins', 0, 0.5);
      expect(DB.setSetting).not.toHaveBeenCalled();
    });

    it('records the first payout and stores pending', async () => {
      const { recordPoolSnapshot, getPayoutHistory } =
        await import('../src/services/payoutHistory');
      await recordPoolSnapshot('braiins', 1700000000000, 0.002);
      const history = await getPayoutHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(
        expect.objectContaining({
          provider: 'braiins',
          amount: 0.002,
          timestamp: 1700000000000,
        }),
      );
      expect(DB.setSetting).toHaveBeenCalledWith(
        'payout_snapshots',
        JSON.stringify({ braiins: { lastPayoutAt: 1700000000000, pending: 0.002 } }),
      );
    });

    it('does not duplicate the same payout timestamp', async () => {
      const { recordPoolSnapshot, getPayoutHistory } =
        await import('../src/services/payoutHistory');
      DB.getSetting.mockImplementation(async (key: string) => {
        if (key === 'payout_history') return JSON.stringify([]);
        if (key === 'payout_snapshots')
          return JSON.stringify({ braiins: { lastPayoutAt: 1700000000000, pending: 0.001 } });
        return null;
      });
      await recordPoolSnapshot('braiins', 1700000000000, 0.003);
      const history = await getPayoutHistory();
      expect(history).toHaveLength(0);
      expect(DB.setSetting).toHaveBeenCalledWith(
        'payout_snapshots',
        JSON.stringify({ braiins: { lastPayoutAt: 1700000000000, pending: 0.003 } }),
      );
    });

    it('estimates the payout amount from the prior pending balance', async () => {
      const { recordPoolSnapshot, getPayoutHistory } =
        await import('../src/services/payoutHistory');
      store['payout_snapshots'] = JSON.stringify({
        braiins: { lastPayoutAt: 1700000000000, pending: 0.004 },
      });
      await recordPoolSnapshot('braiins', 1700000100000, 0.0001);
      const history = await getPayoutHistory();
      expect(history[0].amount).toBe(0.004);
      expect(history[0].timestamp).toBe(1700000100000);
    });

    it('caps history at the max entry count', async () => {
      const { recordPoolSnapshot, getPayoutHistory } =
        await import('../src/services/payoutHistory');
      const existing = Array.from({ length: 199 }, (_, i) => ({
        id: `old-${i}`,
        provider: 'braiins',
        amount: 0.001,
        timestamp: i,
        recordedAt: i,
      }));
      store['payout_history'] = JSON.stringify(existing);
      await recordPoolSnapshot('luxor', 1700000200000, 0.005);
      const history = await getPayoutHistory();
      expect(history).toHaveLength(200);
      expect(history[0].provider).toBe('luxor');
      expect(history[history.length - 1].id).toBe('old-198');
    });
  });

  describe('summarizePayouts', () => {
    it('sums totals and returns latest payout timestamp', async () => {
      const { summarizePayouts } = await import('../src/services/payoutHistory');
      const summary = summarizePayouts([
        { id: 'a', provider: 'braiins', amount: 0.001, timestamp: 100, recordedAt: 0 },
        { id: 'b', provider: 'luxor', amount: 0.002, timestamp: 200, recordedAt: 0 },
      ]);
      expect(summary).toEqual({ totalPaid: 0.003, count: 2, lastPayoutAt: 200 });
    });

    it('handles an empty history', async () => {
      const { summarizePayouts } = await import('../src/services/payoutHistory');
      expect(summarizePayouts([])).toEqual({ totalPaid: 0, count: 0, lastPayoutAt: 0 });
    });
  });

  describe('clearPayoutHistory', () => {
    it('persists an empty list', async () => {
      const { clearPayoutHistory } = await import('../src/services/payoutHistory');
      await clearPayoutHistory();
      expect(DB.setSetting).toHaveBeenCalledWith('payout_history', '[]');
    });
  });
});
