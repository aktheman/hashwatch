jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
}));

jest.mock('../src/store/miners', () => ({
  useMinerStore: jest.fn((sel) => {
    const state = {
      miners: [
        {
          id: 'm1',
          name: 'Miner A',
          ip: '10.0.0.1',
          port: 80,
          isOnline: true,
          status: {
            hashRate: 1.2e12,
            hashRateUnit: 'TH/s',
            power: 120,
            temperature: 62,
            pool: 'braiins',
          },
        },
        {
          id: 'm2',
          name: 'Miner B',
          ip: '10.0.0.2',
          port: 80,
          isOnline: false,
          status: null,
        },
      ],
    };
    return sel(state);
  }),
}));

jest.mock('../src/api/client', () => ({
  contributeDarkPool: jest.fn().mockResolvedValue({ ok: true, id: 1 }),
  getDarkPoolAggregate: jest.fn().mockResolvedValue({
    totalHashrate: 5e12,
    avgPower: 150,
    avgTemp: 65,
    contributorCount: 12,
    poolBreakdown: { braiins: 3e12, luxor: 2e12 },
    regionBreakdown: { NA: 3e12, EU: 2e12 },
    period: '24h',
  }),
  getDarkPoolMyContributions: jest.fn().mockResolvedValue([]),
  deleteDarkPoolMyContributions: jest.fn().mockResolvedValue({ ok: true, deleted: 0 }),
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
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#3B82F6',
    info: '#06B6D4',
  }),
}));

import { render, fireEvent, act } from '@testing-library/react-native';
import { DarkPoolScreen } from '../src/screens/DarkPoolScreen';

afterEach(() => {
  jest.clearAllMocks();
});

describe('DarkPoolScreen', () => {
  it('renders title and opt-in toggle', async () => {
    const tree = await render(<DarkPoolScreen />);
    expect(tree.getByText('darkPool.title')).toBeTruthy();
    expect(tree.getByText('darkPool.description')).toBeTruthy();
  });

  it('shows opt-in switch', async () => {
    const tree = await render(<DarkPoolScreen />);
    expect(tree.getByRole('switch')).toBeTruthy();
  });

  it('shows miners section when opted in', async () => {
    const tree = await render(<DarkPoolScreen />);
    const toggle = tree.getByRole('switch');
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });
    expect(tree.getByText('darkPool.yourMiners')).toBeTruthy();
    expect(tree.getByText('darkPool.networkStats')).toBeTruthy();
  });

  it('shows contribute button when opted in', async () => {
    const tree = await render(<DarkPoolScreen />);
    const toggle = tree.getByRole('switch');
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });
    expect(tree.getByText('darkPool.contributeNow')).toBeTruthy();
  });

  it('shows period selector when opted in', async () => {
    const tree = await render(<DarkPoolScreen />);
    const toggle = tree.getByRole('switch');
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });
    expect(tree.getByText('1h')).toBeTruthy();
    expect(tree.getByText('24h')).toBeTruthy();
    expect(tree.getByText('7d')).toBeTruthy();
    expect(tree.getByText('30d')).toBeTruthy();
  });

  it('hides miner section when opted out', async () => {
    const tree = await render(<DarkPoolScreen />);
    expect(tree.queryByText('darkPool.yourMiners')).toBeNull();
  });

  it('renders with empty miners', async () => {
    const { useMinerStore } = require('../src/store/miners');
    useMinerStore.mockImplementation((sel: (s: { miners: unknown[] }) => unknown) =>
      sel({ miners: [] }),
    );
    const tree = await render(<DarkPoolScreen />);
    expect(tree.getByText('darkPool.title')).toBeTruthy();
  });
});
