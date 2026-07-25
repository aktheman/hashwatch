import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import React from 'react';
import { DashboardBuilderScreen } from '../src/screens/DashboardBuilderScreen';

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
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
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
  selectionToggleHaptic: jest.fn(),
  destructiveActionHaptic: jest.fn(),
}));

jest.mock('../src/store/miners', () => ({
  useMinerStore: jest.fn((sel: (s: { miners: unknown[] }) => unknown) => sel({ miners: [] })),
}));

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
});

it('renders the screen', async () => {
  const tree = await render(<DashboardBuilderScreen />);
  expect(tree.toJSON()).toBeTruthy();
});

it('shows layout controls', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('Layout Controls')).toBeTruthy();
  expect(screen.getByText('Columns')).toBeTruthy();
  expect(screen.getByText('Compact')).toBeTruthy();
  expect(screen.getByText('1')).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
});

it('shows widget library', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('Widget Library')).toBeTruthy();
  expect(screen.getByText('Total Hashrate')).toBeTruthy();
  expect(screen.getByText('Temperature Overview')).toBeTruthy();
  expect(screen.getByText('Power Usage')).toBeTruthy();
  expect(screen.getByText('Earnings Estimate')).toBeTruthy();
  expect(screen.getByText('Fleet Health')).toBeTruthy();
  expect(screen.getByText('Hashrate Trend')).toBeTruthy();
  expect(screen.getByText('Alert Summary')).toBeTruthy();
  expect(screen.getByText('Pool Distribution')).toBeTruthy();
  expect(screen.getByText('Map Widget')).toBeTruthy();
  expect(screen.getByText('Miner List')).toBeTruthy();
});

it('shows preview section', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('Live Preview')).toBeTruthy();
  expect(screen.getByText(/7 widgets enabled/)).toBeTruthy();
});

it('shows save button', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('Save Layout')).toBeTruthy();
});

it('shows reset button', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('Reset')).toBeTruthy();
});

it('renders default widgets', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('14.2 TH/s')).toBeTruthy();
  expect(screen.getByText('32 miners online')).toBeTruthy();
  expect(screen.getByText('Avg: 62°C')).toBeTruthy();
  expect(screen.getByText('Max: 78°C')).toBeTruthy();
  expect(screen.getByText('5.4 kW total')).toBeTruthy();
  expect(screen.getByText('$4.32/day')).toBeTruthy();
});
