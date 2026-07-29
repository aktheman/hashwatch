import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { ProfitabilitySwitchScreen } from '../src/screens/ProfitabilitySwitchScreen';

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
}));

jest.mock('../src/utils/profitabilitySwitch', () => ({
  rankPoolsByProfitability: (candidates: any[], hashrate: number, btcPrice: number) =>
    candidates.map((c, i) => ({
      pool: c,
      score: Math.round(100 - i * 10),
      estimatedDailyBtc: (0.0001 - i * 0.00001).toFixed(8),
      reasons: i === 0 ? ['Lowest fee'] : [],
    })),
}));

jest.mock('../src/api/client', () => ({
  fetchPoolAnalytics: jest.fn().mockResolvedValue({ stats: [] }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders the screen title', async () => {
  await render(<ProfitabilitySwitchScreen />);
  expect(screen.getByText('profitabilitySwitch.title')).toBeTruthy();
});

it('shows current pool card', async () => {
  await render(<ProfitabilitySwitchScreen />);
  expect(screen.getByText('profitabilitySwitch.currentPool')).toBeTruthy();
  expect(screen.getAllByText('Braiins Pool').length).toBeGreaterThanOrEqual(1);
});

it('shows auto-switch toggle', async () => {
  await render(<ProfitabilitySwitchScreen />);
  expect(screen.getByText('profitabilitySwitch.autoSwitch')).toBeTruthy();
  expect(screen.getByLabelText('Toggle auto-switch')).toBeTruthy();
});

it('toggles auto-switch', async () => {
  await render(<ProfitabilitySwitchScreen />);
  const toggle = screen.getByLabelText('Toggle auto-switch');
  fireEvent(toggle, 'onValueChange', true);
});

it('shows threshold chips', async () => {
  await render(<ProfitabilitySwitchScreen />);
  expect(screen.getByText('profitabilitySwitch.threshold: 10%')).toBeTruthy();
  expect(screen.getByText('10%')).toBeTruthy();
});

it('selects a different threshold', async () => {
  await render(<ProfitabilitySwitchScreen />);
  await act(async () => {
    fireEvent.press(screen.getByText('25%'));
  });
  expect(screen.getByText('profitabilitySwitch.threshold: 25%')).toBeTruthy();
});

it('shows ranked pools list', async () => {
  await render(<ProfitabilitySwitchScreen />);
  expect(screen.getAllByText('Braiins Pool').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Luxor')).toBeTruthy();
  expect(screen.getByText('F2Pool')).toBeTruthy();
  expect(screen.getByText('ViaBTC')).toBeTruthy();
});

it('shows switch history section', async () => {
  await render(<ProfitabilitySwitchScreen />);
  expect(screen.getByText('profitabilitySwitch.switchHistory')).toBeTruthy();
  expect(screen.getByText('profitabilitySwitch.noHistory')).toBeTruthy();
});

it('shows how it works section', async () => {
  await render(<ProfitabilitySwitchScreen />);
  expect(screen.getByText('How It Works')).toBeTruthy();
});
