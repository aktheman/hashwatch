import { render, screen, fireEvent, act } from '@testing-library/react-native';
import React from 'react';
import { PoolAnalyticsScreen } from '../src/screens/PoolAnalyticsScreen';

jest.setTimeout(30000);

const mockFetchStats = jest.fn();
const mockSaveConfig = jest.fn();
const mockLoadConfig = jest.fn();

let mockStoreState: Record<string, unknown> = {
  stats: [],
  config: [],
  loading: false,
  error: null,
  fetchStats: mockFetchStats,
  saveConfig: mockSaveConfig,
  loadConfig: mockLoadConfig,
};

jest.mock('../src/store/poolAnalytics', () => ({
  usePoolAnalyticsStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    return selector ? selector(mockStoreState) : mockStoreState;
  },
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a1a',
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  }),
}));

describe('PoolAnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      stats: [],
      config: [],
      loading: false,
      error: null,
      fetchStats: mockFetchStats,
      saveConfig: mockSaveConfig,
      loadConfig: mockLoadConfig,
    };
  });

  it('renders the title', async () => {
    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });
    expect(await screen.findByText('poolAnalytics.title')).toBeTruthy();
  });

  it('shows empty state when no config', async () => {
    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });
    expect(await screen.findByText('poolAnalytics.noConfig')).toBeTruthy();
  });

  it('calls loadConfig on mount', async () => {
    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });
    expect(mockLoadConfig).toHaveBeenCalled();
  });

  it('renders provider selector buttons', async () => {
    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });
    expect(screen.getByText('poolAnalytics.braiins')).toBeTruthy();
    expect(screen.getByText('poolAnalytics.luxor')).toBeTruthy();
  });

  it('renders API key and pool user inputs', async () => {
    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });
    expect(screen.getByPlaceholderText('poolAnalytics.apiKeyPlaceholder')).toBeTruthy();
    expect(screen.getByPlaceholderText('poolAnalytics.poolUserPlaceholder')).toBeTruthy();
  });

  it('renders save button', async () => {
    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });
    expect(screen.getByText('poolAnalytics.save')).toBeTruthy();
  });

  it('shows stats when available', async () => {
    mockStoreState = {
      stats: [
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
      ],
      config: [{ id: 1, provider: 'braiins', apiKey: 'k', poolUser: 'u', enabled: true }],
      loading: false,
      error: null,
      fetchStats: mockFetchStats,
      saveConfig: mockSaveConfig,
      loadConfig: mockLoadConfig,
    };

    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });

    expect(screen.getByText('poolAnalytics.stats')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('0.00100000')).toBeTruthy();
    expect(screen.getByText('$50.00')).toBeTruthy();
    expect(screen.getByText('105.0%')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows error when fetch fails', async () => {
    mockStoreState = {
      stats: [],
      config: [],
      loading: false,
      error: 'fetchError',
      fetchStats: mockFetchStats,
      saveConfig: mockSaveConfig,
      loadConfig: mockLoadConfig,
    };

    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });

    expect(screen.getByText('poolAnalytics.fetchError')).toBeTruthy();
  });

  it('saves config when save button pressed', async () => {
    mockSaveConfig.mockResolvedValueOnce(undefined);

    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });

    const apiKeyInput = screen.getByPlaceholderText('poolAnalytics.apiKeyPlaceholder');
    const poolUserInput = screen.getByPlaceholderText('poolAnalytics.poolUserPlaceholder');

    await act(async () => {
      fireEvent.changeText(apiKeyInput, 'my-api-key');
      fireEvent.changeText(poolUserInput, 'my-pool-user');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('poolAnalytics.save'));
    });

    expect(mockSaveConfig).toHaveBeenCalledWith({
      provider: 'braiins',
      apiKey: 'my-api-key',
      poolUser: 'my-pool-user',
    });
  });

  it('toggles provider selection', async () => {
    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });

    await act(async () => {
      fireEvent.press(screen.getByText('poolAnalytics.luxor'));
    });

    expect(screen.getByText('poolAnalytics.luxor')).toBeTruthy();
  });

  it('calls fetchStats when config exists on mount', async () => {
    mockStoreState = {
      stats: [],
      config: [{ id: 1, provider: 'braiins', apiKey: 'k', poolUser: 'u', enabled: true }],
      loading: false,
      error: null,
      fetchStats: mockFetchStats,
      saveConfig: mockSaveConfig,
      loadConfig: mockLoadConfig,
    };

    await act(async () => {
      render(<PoolAnalyticsScreen />);
    });

    expect(mockFetchStats).toHaveBeenCalled();
  });
});
