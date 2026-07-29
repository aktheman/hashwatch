import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { PublicDashboardScreen } from '../src/screens/PublicDashboardScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    text: '#e2e0ff',
    textDim: '#9694b0',
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    border: '#2a2940',
    surfaceLight: '#1a1a24',
    textMuted: '#6b6990',
    glow: '#6c63ff33',
  }),
}));

const stableT = (key: string, fallback?: string) => fallback || key;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: stableT }),
}));

const mockGetPublicDashboard = jest.fn();
jest.mock('../src/api/client', () => ({
  getPublicDashboard: (...args: any[]) => mockGetPublicDashboard(...args),
}));

jest.mock('../src/utils/formatters', () => ({
  formatHashrate: (v: number) => `${v} GH/s`,
  formatTemperature: (v: number) => `${v}°C`,
  formatVoltage: (v: number) => `${v}V`,
  formatPower: (v: number) => `${v}W`,
  formatUptime: (v: number) => `${Math.round(v / 3600)}h`,
  formatNumber: (v: number) => String(v),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders loading state', async () => {
  mockGetPublicDashboard.mockReturnValue(new Promise(() => {}));
  await render(<PublicDashboardScreen route={{ params: { token: 'abc123' } }} />);
  expect(screen.getByText('HashWatch')).toBeTruthy();
});

it('displays miner data after loading', async () => {
  mockGetPublicDashboard.mockResolvedValue({
    minerName: 'My Miner',
    snapshot: {
      hashRate: 500,
      hashRateUnit: 'GH/s',
      temperature: 65,
      voltage: 11.8,
      power: 120,
      uptimeSeconds: 86400,
      sharesAccepted: 1500,
      sharesRejected: 10,
      timestamp: Date.now(),
    },
    createdAt: Date.now() - 100000,
  });
  await render(<PublicDashboardScreen route={{ params: { token: 'abc123' } }} />);
  await waitFor(() => {
    expect(screen.getByText('My Miner')).toBeTruthy();
  });
});

it('shows error on fetch failure', async () => {
  mockGetPublicDashboard.mockRejectedValue(new Error('Not found'));
  await render(<PublicDashboardScreen route={{ params: { token: 'bad-token' } }} />);
  await waitFor(() => {
    expect(screen.getAllByText('common.error').length).toBeGreaterThanOrEqual(1);
  });
});

it('shows shared by label', async () => {
  mockGetPublicDashboard.mockResolvedValue({
    minerName: 'Test Miner',
    snapshot: {
      hashRate: 300,
      hashRateUnit: 'GH/s',
      temperature: 60,
      voltage: 12.0,
      power: 100,
      uptimeSeconds: 3600,
      sharesAccepted: 100,
      sharesRejected: 0,
      timestamp: Date.now(),
    },
    createdAt: Date.now(),
  });
  await render(<PublicDashboardScreen route={{ params: { token: 'abc123' } }} />);
  await waitFor(() => {
    expect(screen.getAllByText(/publicDashboard.sharedBy/).length).toBeGreaterThanOrEqual(1);
  });
});

it('shows stat labels', async () => {
  mockGetPublicDashboard.mockResolvedValue({
    minerName: 'Stats Miner',
    snapshot: {
      hashRate: 600,
      hashRateUnit: 'GH/s',
      temperature: 70,
      voltage: 11.5,
      power: 150,
      uptimeSeconds: 172800,
      sharesAccepted: 3000,
      sharesRejected: 50,
      timestamp: Date.now(),
    },
    createdAt: Date.now(),
  });
  await render(<PublicDashboardScreen route={{ params: { token: 'abc' } }} />);
  await waitFor(() => {
    expect(screen.getByText('minerDetail.hashrate')).toBeTruthy();
    expect(screen.getByText('minerDetail.boardTemp')).toBeTruthy();
    expect(screen.getByText('minerDetail.voltage')).toBeTruthy();
    expect(screen.getByText('minerDetail.power')).toBeTruthy();
  });
});

it('shows offline state when no snapshot', async () => {
  mockGetPublicDashboard.mockResolvedValue({
    minerName: 'Offline Miner',
    snapshot: null,
    createdAt: Date.now(),
  });
  await render(<PublicDashboardScreen route={{ params: { token: 'abc' } }} />);
  await waitFor(() => {
    expect(screen.getByText('minerDetail.offline')).toBeTruthy();
  });
});
