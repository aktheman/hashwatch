import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MinerHealthScore } from '../src/components/MinerHealthScore';
import { Miner } from '../src/types';

jest.setTimeout(30000);

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a1a',
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#ffffff',
    textDim: '#888888',
    textMuted: '#666666',
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
  }),
}));

const onlineMiner: Miner = {
  id: 'miner-1',
  ip: '192.168.1.100',
  name: 'TestMiner',
  isOnline: true,
  lastSeen: Date.now(),
  status: {
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: 55,
    power: 120,
    voltage: 12000,
    frequency: 500,
    sharesAccepted: 1000,
    sharesRejected: 5,
    uptimeSeconds: 86400,
    fanSpeed: 80,
    fanRpm: 3000,
    coreVoltage: 1200,
    bestDiff: '0',
    bestSessionDiff: '0',
    pool: 'stratum+tcp://pool.example.com:3333',
  },
} as Miner;

const offlineMiner: Miner = {
  id: 'miner-2',
  ip: '192.168.1.101',
  name: 'OfflineMiner',
  isOnline: false,
  lastSeen: Date.now() - 3600000,
} as Miner;

describe('MinerHealthScore', () => {
  test('renders health score for online miner', async () => {
    await render(<MinerHealthScore miner={onlineMiner} />);
    expect(screen.getByText('health.title')).toBeTruthy();
  });

  test('renders grade badge for online miner', async () => {
    await render(<MinerHealthScore miner={onlineMiner} />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  test('renders F grade for offline miner', async () => {
    await render(<MinerHealthScore miner={offlineMiner} />);
    expect(screen.getByText('F')).toBeTruthy();
  });

  test('renders all factor labels', async () => {
    await render(<MinerHealthScore miner={onlineMiner} />);
    expect(screen.getByText('health.temperature')).toBeTruthy();
    expect(screen.getByText('health.uptime')).toBeTruthy();
    expect(screen.getByText('health.shares')).toBeTruthy();
    expect(screen.getByText('health.hashrate')).toBeTruthy();
    expect(screen.getByText('health.power')).toBeTruthy();
  });

  test('renders offline miner with zeros', async () => {
    await render(<MinerHealthScore miner={offlineMiner} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(5);
  });
});
