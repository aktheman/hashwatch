import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { EarningsCard } from '../src/components/EarningsCard';
import { Miner } from '../src/types';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    border: '#2a2a4e',
    textDim: '#888',
    accent: '#6C63FF',
    text: '#fff',
    textMuted: '#666',
  }),
}));

function makeMiner(hashRate: number, unit = 'GH/s'): Miner {
  return {
    id: '1',
    name: 'Test',
    ip: '192.168.1.1',
    port: 80,
    isOnline: true,
    status: {
      hashRate,
      hashRateUnit: unit,
      temperature: 50,
      vrTemp: 0,
      voltage: 1200,
      current: 3.5,
      power: 12,
      sharesAccepted: 100,
      sharesRejected: 1,
      bestDiff: '0',
      bestSessionDiff: '0',
      uptimeSeconds: 3600,
      coreVoltage: 1200,
      frequency: 400,
      fanSpeed: 50,
      fanRpm: 3000,
      pool: 'pool.com',
      poolPort: 3333,
      poolUser: 'u.1',
      poolResponseTime: 100,
    },
  };
}

describe('EarningsCard', () => {
  it('renders title', async () => {
    await render(<EarningsCard miners={[makeMiner(500)]} />);
    expect(await screen.findByText('earningsCard.title')).toBeTruthy();
  });

  it('renders custom title', async () => {
    await render(<EarningsCard miners={[makeMiner(500)]} title="My Earnings" />);
    expect(await screen.findByText('My Earnings')).toBeTruthy();
  });

  it('shows dash when no hashrate', async () => {
    await render(<EarningsCard miners={[makeMiner(0)]} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('shows BTC and USD for valid hashrate', async () => {
    await render(<EarningsCard miners={[makeMiner(500)]} />);
    const satElements = screen.getAllByText(/sat/);
    expect(satElements.length).toBeGreaterThan(0);
    const usdElements = screen.getAllByText(/\$/);
    expect(usdElements.length).toBeGreaterThan(0);
  });

  it('aggregates multiple miners', async () => {
    await render(<EarningsCard miners={[makeMiner(500), makeMiner(500)]} />);
    expect(await screen.findByText(/earningsCard\.satDay/)).toBeTruthy();
  });
});
