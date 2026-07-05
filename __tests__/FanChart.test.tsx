import { render, cleanup } from '@testing-library/react-native';
import React from 'react';
import { FanChart } from '../src/components/FanChart';
import { MinerSnapshot } from '../src/types';

jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null,
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    success: '#10B981',
  }),
}));

function makeSnapshot(timestamp: number, fanRpm?: number): MinerSnapshot {
  return {
    minerId: '1',
    timestamp,
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: 50,
    voltage: 1200,
    current: 3.5,
    power: 12,
    sharesAccepted: 100,
    sharesRejected: 1,
    uptimeSeconds: 3600,
    frequency: 400,
    fanRpm: fanRpm,
    fanSpeed: fanRpm ? 80 : undefined,
    coreVoltage: 1200,
  };
}

beforeEach(() => {
  cleanup();
});

it('shows not enough data message when fewer than 2 snapshots', async () => {
  const tree = await render(<FanChart snapshots={[makeSnapshot(1000, 5000)]} />);
  expect(tree.getByText('fanChart.notEnoughData')).toBeTruthy();
});

it('shows not enough data with empty snapshots', async () => {
  const tree = await render(<FanChart snapshots={[]} />);
  expect(tree.getByText('fanChart.notEnoughData')).toBeTruthy();
});

it('renders title when provided', async () => {
  const snapshots = [makeSnapshot(1000, 5000), makeSnapshot(2000, 5100)];
  const tree = await render(<FanChart snapshots={snapshots} title="Fan History" />);
  expect(tree.getByText('Fan History')).toBeTruthy();
});

it('renders chart with sufficient fan data', async () => {
  const snapshots = [makeSnapshot(1000, 5000), makeSnapshot(2000, 5100)];
  const tree = await render(<FanChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeTruthy();
});

it('shows no fan data message when fanRpm is zero or absent', async () => {
  const snapshots = [
    { ...makeSnapshot(1000), fanRpm: 0, fanSpeed: 0 },
    { ...makeSnapshot(2000), fanRpm: 0, fanSpeed: 0 },
  ];
  const tree = await render(<FanChart snapshots={snapshots} />);
  expect(tree.getByText('fanChart.noFanData')).toBeTruthy();
});

it('sorts snapshots by timestamp', async () => {
  const snapshots = [makeSnapshot(3000, 5100), makeSnapshot(1000, 5000), makeSnapshot(2000, 5050)];
  const tree = await render(<FanChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeTruthy();
});
