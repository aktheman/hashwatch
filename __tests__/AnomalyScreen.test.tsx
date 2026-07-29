import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { AnomalyScreen } from '../src/screens/AnomalyScreen';

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
    t: (key, fallback) => fallback || key,
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

let mockMiners: any[] = [];
jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector?: (s: any) => any) => {
    const state = { miners: mockMiners };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../src/db/database', () => ({
  getSnapshots: jest.fn().mockResolvedValue([]),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockMiners = [
    { id: 'm1', name: 'Miner 1', isOnline: true, status: { hashRate: 500, temperature: 65 } },
  ];
});

it('renders the screen title', async () => {
  await render(<AnomalyScreen />);
  expect(screen.getByText('anomalyDetection.title')).toBeTruthy();
});

it('shows no anomalies empty state with no snapshots', async () => {
  await render(<AnomalyScreen />);
  await waitFor(() => {
    expect(screen.getByText('anomalyDetection.noAnomalies')).toBeTruthy();
  });
});

it('shows healthy miner message', async () => {
  await render(<AnomalyScreen />);
  await waitFor(() => {
    expect(screen.getByText('anomalyDetection.healthyMiner')).toBeTruthy();
  });
});

it('shows failure probability gauge', async () => {
  await render(<AnomalyScreen />);
  expect(screen.getByText('anomalyDetection.failureProbability')).toBeTruthy();
});

it('shows health trend indicator', async () => {
  await render(<AnomalyScreen />);
  expect(screen.getByText(/anomalyDetection.healthTrend/)).toBeTruthy();
});

it('shows miner selector chips when miners exist', async () => {
  await render(<AnomalyScreen />);
  expect(screen.getByLabelText('Select miner Miner 1')).toBeTruthy();
});

it('renders with empty miners list', async () => {
  mockMiners = [];
  await render(<AnomalyScreen />);
  await waitFor(() => {
    expect(screen.getByText('anomalyDetection.title')).toBeTruthy();
  });
});

it('tapping miner chip selects it', async () => {
  mockMiners = [
    { id: 'm1', name: 'Miner A', isOnline: true, status: { hashRate: 500 } },
    { id: 'm2', name: 'Miner B', isOnline: true, status: { hashRate: 300 } },
  ];
  await render(<AnomalyScreen />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Select miner Miner B'));
  });
  expect(screen.getByLabelText('Select miner Miner B')).toBeTruthy();
});
