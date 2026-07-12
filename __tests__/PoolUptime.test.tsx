import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PoolUptime } from '../src/components/PoolUptime';
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

const miners: Miner[] = [
  {
    id: '1', ip: '192.168.1.1', name: 'M1', isOnline: true, lastSeen: Date.now(),
    status: { hashRate: 500, hashRateUnit: 'GH/s', temperature: 55, power: 120, pool: 'stratum+tcp://pool1.com:3333', sharesAccepted: 100, sharesRejected: 0, uptimeSeconds: 86400 } as any,
  } as Miner,
  {
    id: '2', ip: '192.168.1.2', name: 'M2', isOnline: true, lastSeen: Date.now(),
    status: { hashRate: 400, hashRateUnit: 'GH/s', temperature: 60, power: 110, pool: 'stratum+tcp://pool1.com:3333', sharesAccepted: 80, sharesRejected: 2, uptimeSeconds: 72000 } as any,
  } as Miner,
  {
    id: '3', ip: '192.168.1.3', name: 'M3', isOnline: true, lastSeen: Date.now(),
    status: { hashRate: 300, hashRateUnit: 'GH/s', temperature: 50, power: 90, pool: 'stratum+tcp://pool2.com:3333', sharesAccepted: 50, sharesRejected: 0, uptimeSeconds: 50000 } as any,
  } as Miner,
];

describe('PoolUptime', () => {
  test('renders empty state when no miners', async () => {
    await render(<PoolUptime miners={[]} />);
    expect(screen.getByText('pool.pools')).toBeTruthy();
    expect(screen.getByText('pool.noData')).toBeTruthy();
  });

  test('renders pool data for online miners', async () => {
    await render(<PoolUptime miners={miners} />);
    expect(screen.getByText('pool.pools')).toBeTruthy();
  });

  test('shows miner count per pool', async () => {
    await render(<PoolUptime miners={miners} />);
    const poolMiners = screen.getAllByText(/miner/);
    expect(poolMiners.length).toBeGreaterThanOrEqual(2);
  });

  test('renders percentage bars', async () => {
    await render(<PoolUptime miners={miners} />);
    expect(screen.getByText('67%')).toBeTruthy();
    expect(screen.getByText('33%')).toBeTruthy();
  });

  test('handles offline miners only', async () => {
    const offlineMiners: Miner[] = [
      { id: '1', ip: '192.168.1.1', name: 'M1', isOnline: false, lastSeen: Date.now() - 3600000 } as Miner,
    ];
    await render(<PoolUptime miners={offlineMiners} />);
    expect(screen.getByText('pool.noData')).toBeTruthy();
  });
});
