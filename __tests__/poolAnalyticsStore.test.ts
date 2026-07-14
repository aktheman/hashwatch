import * as API from '../src/api/client';

jest.mock('../src/api/client');

const mockFetchPoolAnalytics = API.fetchPoolAnalytics as jest.MockedFunction<
  typeof API.fetchPoolAnalytics
>;
const mockSavePoolConfig = API.savePoolConfig as jest.MockedFunction<typeof API.savePoolConfig>;
const mockFetchPoolConfigs = API.fetchPoolConfigs as jest.MockedFunction<
  typeof API.fetchPoolConfigs
>;

import { usePoolAnalyticsStore } from '../src/store/poolAnalytics';

beforeEach(() => {
  jest.clearAllMocks();
  usePoolAnalyticsStore.setState({ stats: [], config: [], loading: false, error: null });
});

describe('poolAnalytics store', () => {
  describe('fetchStats', () => {
    it('fetches stats and configs', async () => {
      const mockStats = [
        {
          provider: 'braiins',
          hashrate: 100,
          hashrateUnit: 'TH/s',
          btcEarned: 0.001,
          usdEarned: 50,
          luck: 105,
          activeWorkers: 3,
          lastUpdated: Date.now(),
        },
      ];
      const mockConfigs = [
        { id: 1, provider: 'braiins', apiKey: 'k', poolUser: 'u', enabled: true },
      ];
      mockFetchPoolAnalytics.mockResolvedValueOnce({ stats: mockStats, configs: mockConfigs });

      await usePoolAnalyticsStore.getState().fetchStats();

      const state = usePoolAnalyticsStore.getState();
      expect(state.stats).toEqual(mockStats);
      expect(state.config).toEqual(mockConfigs);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      mockFetchPoolAnalytics.mockRejectedValueOnce(new Error('network'));

      await usePoolAnalyticsStore.getState().fetchStats();

      const state = usePoolAnalyticsStore.getState();
      expect(state.error).toBe('fetchError');
      expect(state.loading).toBe(false);
    });

    it('sets loading to true while fetching', async () => {
      let resolveFetch!: (v: unknown) => void;
      mockFetchPoolAnalytics.mockReturnValueOnce(
        new Promise((r) => {
          resolveFetch = r;
        }) as Promise<{ stats: API.PoolAnalyticsStats[]; configs: API.PoolConfig[] }>,
      );

      const promise = usePoolAnalyticsStore.getState().fetchStats();
      expect(usePoolAnalyticsStore.getState().loading).toBe(true);

      resolveFetch({ stats: [], configs: [] });
      await promise;

      expect(usePoolAnalyticsStore.getState().loading).toBe(false);
    });
  });

  describe('saveConfig', () => {
    it('adds new config to state', async () => {
      const newConfig = { id: 5, provider: 'luxor', apiKey: 'lk', poolUser: 'lu', enabled: true };
      mockSavePoolConfig.mockResolvedValueOnce(newConfig);

      await usePoolAnalyticsStore.getState().saveConfig({
        provider: 'luxor',
        apiKey: 'lk',
        poolUser: 'lu',
      });

      const state = usePoolAnalyticsStore.getState();
      expect(state.config).toHaveLength(1);
      expect(state.config[0]).toEqual(newConfig);
    });

    it('sets error on failure', async () => {
      mockSavePoolConfig.mockRejectedValueOnce(new Error('fail'));

      await usePoolAnalyticsStore.getState().saveConfig({
        provider: 'braiins',
        apiKey: 'k',
        poolUser: 'u',
      });

      expect(usePoolAnalyticsStore.getState().error).toBe('configSaveError');
    });
  });

  describe('loadConfig', () => {
    it('loads configs from API', async () => {
      const configs = [{ id: 1, provider: 'braiins', apiKey: 'k', poolUser: 'u', enabled: true }];
      mockFetchPoolConfigs.mockResolvedValueOnce(configs);

      await usePoolAnalyticsStore.getState().loadConfig();

      expect(usePoolAnalyticsStore.getState().config).toEqual(configs);
    });

    it('sets error on failure', async () => {
      mockFetchPoolConfigs.mockRejectedValueOnce(new Error('fail'));

      await usePoolAnalyticsStore.getState().loadConfig();

      expect(usePoolAnalyticsStore.getState().error).toBe('configLoadError');
    });
  });
});
