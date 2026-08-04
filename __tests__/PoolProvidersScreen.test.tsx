import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import React from 'react';
import { PoolProvidersScreen } from '../src/screens/PoolProvidersScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a24',
    border: '#2a2940',
    text: '#e2e0ff',
    textDim: '#9694b0',
    textMuted: '#6b6990',
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    accent: '#6c63ff',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
    glow: '#6c63ff',
    glowSuccess: '#22c55e',
    glowDanger: '#ef4444',
    glowWarning: '#f59e0b',
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

jest.mock('../src/services/poolProviders', () => ({
  getAvailableProviders: jest.fn().mockReturnValue([]),
  fetchAllPoolStats: jest.fn().mockResolvedValue({}),
}));

const mockHistory = [
  {
    id: 'p1',
    provider: 'braiins',
    amount: 0.004,
    timestamp: 1700000000000,
    recordedAt: 1700000005000,
  },
  {
    id: 'p2',
    provider: 'luxor',
    amount: 0.002,
    timestamp: 1690000000000,
    recordedAt: 1690000005000,
  },
];

jest.mock('../src/services/payoutHistory', () => ({
  getPayoutHistory: jest.fn().mockResolvedValue(mockHistory),
  recordPoolSnapshot: jest.fn().mockResolvedValue(undefined),
  summarizePayouts: jest.fn((history: typeof mockHistory) => ({
    totalPaid: history.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0),
    count: history.length,
    lastPayoutAt: history.length > 0 ? Math.max(...history.map((e) => e.timestamp)) : 0,
  })),
  clearPayoutHistory: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

let mockGetPayoutHistory: jest.Mock;
let mockClearPayoutHistory: jest.Mock;

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockGetPayoutHistory = jest.requireMock('../src/services/payoutHistory').getPayoutHistory;
  mockClearPayoutHistory = jest.requireMock('../src/services/payoutHistory').clearPayoutHistory;
  mockGetPayoutHistory.mockResolvedValue(mockHistory);
});

it('renders the payout history section with summary and entries', async () => {
  await render(<PoolProvidersScreen />);
  expect(await screen.findByText('poolProviders.payoutHistory')).toBeTruthy();
  expect(screen.getByText('poolProviders.totalPaid')).toBeTruthy();
  expect(screen.getByText('poolProviders.payouts')).toBeTruthy();
  expect(screen.getByText('poolProviders.lastPayout')).toBeTruthy();
  expect(screen.getByText('6.00 mBTC')).toBeTruthy();
  expect(screen.getByText('Braiins')).toBeTruthy();
  expect(screen.getByText('Luxor')).toBeTruthy();
  expect(screen.getByText('4.00 mBTC')).toBeTruthy();
  expect(screen.getByText('2.00 mBTC')).toBeTruthy();
});

it('hides the payout history section when empty', async () => {
  mockGetPayoutHistory.mockResolvedValue([]);
  await render(<PoolProvidersScreen />);
  expect(screen.queryByText('poolProviders.payoutHistory')).toBeNull();
});

it('clears the payout history', async () => {
  await render(<PoolProvidersScreen />);
  await fireEvent.press(screen.getByLabelText('poolProviders.clearPayouts'));
  await waitFor(() => {
    expect(mockClearPayoutHistory).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(screen.queryByText('poolProviders.payoutHistory')).toBeNull();
  });
});
