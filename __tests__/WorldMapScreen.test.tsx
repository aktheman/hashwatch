import { render, screen, cleanup } from '@testing-library/react-native';
import React from 'react';
import { WorldMapScreen } from '../src/screens/WorldMapScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    text: '#e2e0ff',
    textDim: '#9694b0',
    primary: '#6c63ff',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    border: '#2a2940',
    surfaceLight: '#1a1a24',
    textMuted: '#6b6990',
    glowSuccess: 'rgba(34,197,94,0.3)',
    glowWarning: 'rgba(245,158,11,0.3)',
    glowDanger: 'rgba(239,68,68,0.3)',
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      fallbackOrOpts?: string | Record<string, unknown>,
      maybeOpts?: Record<string, unknown>,
    ) => {
      const opts = typeof fallbackOrOpts === 'object' ? fallbackOrOpts : maybeOpts;
      const fallback = typeof fallbackOrOpts === 'string' ? fallbackOrOpts : undefined;
      const base = fallback || key;
      if (opts) {
        return Object.entries(opts).reduce((s, [k, v]) => s.replace(`{{${k}}}`, String(v)), base);
      }
      return base;
    },
  }),
}));

jest.mock('../src/utils/haptics', () => ({
  light: jest.fn(),
  medium: jest.fn(),
  heavy: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  selection: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockMiners = [
  {
    id: 'm1',
    name: 'Miner A',
    ip: '10.0.0.1',
    isOnline: true,
    location: 'US-East',
    status: { temperature: 62, hashRate: 140 },
  },
  {
    id: 'm2',
    name: 'Miner B',
    ip: '10.0.0.2',
    isOnline: false,
    location: 'US-East',
    status: { temperature: 85, hashRate: 0 },
  },
  {
    id: 'm3',
    name: 'Miner C',
    ip: '10.0.0.3',
    isOnline: true,
    location: 'EU-West',
    status: { temperature: 55, hashRate: 200 },
  },
];

let mockMinerState = { miners: mockMiners };

jest.mock('../src/store/miners', () => ({
  useMinerStore: jest.fn((sel: (s: typeof mockMinerState) => unknown) => sel(mockMinerState)),
}));

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockMinerState = { miners: mockMiners };
});

it('renders the screen', async () => {
  const tree = await render(<WorldMapScreen />);
  expect(tree.toJSON()).toBeTruthy();
});

it('shows map area', async () => {
  await render(<WorldMapScreen />);
  expect(screen.getByText('World Map')).toBeTruthy();
  expect(screen.getByText('3 miners')).toBeTruthy();
});

it('shows filter buttons', async () => {
  await render(<WorldMapScreen />);
  expect(screen.getByText('Show All')).toBeTruthy();
  expect(screen.getByText('Online Only')).toBeTruthy();
  expect(screen.getByText('Critical Only')).toBeTruthy();
});

it('shows empty state with no miners', async () => {
  mockMinerState = { miners: [] };
  await render(<WorldMapScreen />);
  expect(screen.getByText('World Map')).toBeTruthy();
  expect(screen.getByText('Add miners to see their locations on the world map.')).toBeTruthy();
});

it('renders miner dots on map', async () => {
  await render(<WorldMapScreen />);
  expect(screen.getByLabelText('Miner A, healthy')).toBeTruthy();
  expect(screen.getByLabelText('Miner B, critical')).toBeTruthy();
  expect(screen.getByLabelText('Miner C, healthy')).toBeTruthy();
});

it('shows legend', async () => {
  await render(<WorldMapScreen />);
  expect(screen.getByText('Healthy')).toBeTruthy();
  expect(screen.getByText('Warning')).toBeTruthy();
  expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(1);
});

it('shows location list', async () => {
  await render(<WorldMapScreen />);
  expect(screen.getAllByText('Locations').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('US-East')).toBeTruthy();
  expect(screen.getByText('EU-West')).toBeTruthy();
});

it('renders without crashing', async () => {
  const tree = await render(<WorldMapScreen />);
  expect(tree.toJSON()).toBeTruthy();
});
