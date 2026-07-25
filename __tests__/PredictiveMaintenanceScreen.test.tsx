import { render, screen, cleanup } from '@testing-library/react-native';
import React from 'react';
import { PredictiveMaintenanceScreen } from '../src/screens/PredictiveMaintenanceScreen';

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
    info: '#06b6d4',
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

jest.mock('../src/db/database', () => ({
  getSnapshots: jest
    .fn()
    .mockResolvedValue([
      { id: 's1', minerId: 'm1', timestamp: Date.now(), hashRate: 1.2, temperature: 62 },
    ]),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/utils/predictiveMaintenance', () => ({
  forecastUptime: jest.fn().mockReturnValue({
    minerId: 'm1',
    predictedUptime30d: 95.2,
    predictedDowntimeHours: 3.5,
    confidence: 0.87,
    riskFactors: [{ factor: 'High temp', impact: 2.1 }],
  }),
  generateMaintenanceSchedule: jest.fn().mockReturnValue([
    {
      minerId: 'm1',
      type: 'clean',
      title: 'Clean fans',
      description: 'Fans need cleaning',
      priority: 'medium',
      dueDate: Date.now() + 86400000 * 3,
      estimatedDuration: 30,
      estimatedCost: 0,
      status: 'pending',
    },
  ]),
  checkWeatherAlerts: jest.fn().mockReturnValue([]),
}));

const mockMiners = [
  {
    id: 'm1',
    name: 'Miner A',
    ip: '10.0.0.1',
    isOnline: true,
    status: { temperature: 62, hashRate: 1.2 },
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

it('renders the screen title', async () => {
  await render(<PredictiveMaintenanceScreen />);
  expect(screen.getByText('Predictive Maintenance')).toBeTruthy();
});

it('shows summary stats section', async () => {
  await render(<PredictiveMaintenanceScreen />);
  expect(screen.getByText('Pending')).toBeTruthy();
  expect(screen.getByText('Overdue')).toBeTruthy();
  expect(screen.getByText('Avg Uptime')).toBeTruthy();
  expect(screen.getByText('Alerts')).toBeTruthy();
});

it('shows weather section', async () => {
  await render(<PredictiveMaintenanceScreen />);
  expect(screen.getByText('Temperature')).toBeTruthy();
  expect(screen.getByText('Humidity')).toBeTruthy();
  expect(screen.getByText('28°C')).toBeTruthy();
  expect(screen.getByText('65%')).toBeTruthy();
});

it('shows uptime forecasts section', async () => {
  await render(<PredictiveMaintenanceScreen />);
  expect(screen.getByText('Uptime Forecast')).toBeTruthy();
  expect(screen.getAllByText('Miner A').length).toBeGreaterThanOrEqual(1);
});

it('shows maintenance schedule section', async () => {
  await render(<PredictiveMaintenanceScreen />);
  expect(screen.getByText('Maintenance Schedule')).toBeTruthy();
  expect(screen.getByText('Clean fans')).toBeTruthy();
});

it('renders with no miners (empty state)', async () => {
  mockMinerState = { miners: [] };
  await render(<PredictiveMaintenanceScreen />);
  expect(screen.getByText('No miner data available for forecasting')).toBeTruthy();
  expect(screen.getByText('No pending maintenance tasks')).toBeTruthy();
});

it('temperature display shows default value', async () => {
  await render(<PredictiveMaintenanceScreen />);
  expect(screen.getByText('28°C')).toBeTruthy();
  expect(screen.getByText('65%')).toBeTruthy();
});

it('renders without crashing', async () => {
  const tree = await render(<PredictiveMaintenanceScreen />);
  expect(tree.toJSON()).toBeTruthy();
});
