import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { MinerCard } from '../src/components/MinerCard';
import { Miner } from '../src/types';
import { setTheme, darkTheme } from '../src/theme';

const makeMiner = (overrides: Partial<Miner> = {}): Miner => ({
  id: 'm1',
  name: 'Test Miner',
  ip: '192.168.1.10',
  port: 80,
  info: null,
  status: null,
  lastSeen: Date.now(),
  addedAt: Date.now(),
  isOnline: true,
  ...overrides,
});

beforeEach(() => {
  setTheme(darkTheme);
});

it('renders miner name and ip', async () => {
  const miner = makeMiner();
  await render(<MinerCard miner={miner} onPress={jest.fn()} />);
  expect(screen.getByText('Test Miner')).toBeTruthy();
  expect(screen.getByText('192.168.1.10')).toBeTruthy();
});

it('shows hashrate and temp when online with status', async () => {
  const miner = makeMiner({
    status: {
      hashRate: 500,
      hashRateUnit: 'GH/s',
      temperature: 65,
      vrTemp: 0,
      voltage: 1200,
      current: 5000,
      power: 12.5,
      sharesAccepted: 100,
      sharesRejected: 2,
      bestDiff: '1.5M',
      bestSessionDiff: '2.0M',
      uptimeSeconds: 3600,
      coreVoltage: 1200,
      frequency: 400,
      fanSpeed: 50,
      fanRpm: 3000,
      pool: 'stratum.example.com',
      poolPort: 3333,
      poolUser: 'user.worker',
      poolResponseTime: 150,
    },
    isOnline: true,
  });
  await render(<MinerCard miner={miner} onPress={jest.fn()} />);
  expect(screen.getByText('500.0 GH/s')).toBeTruthy();
  expect(screen.getByText('65°C')).toBeTruthy();
});

it('shows offline state with reduced opacity', async () => {
  const miner = makeMiner({ isOnline: false });
  await render(<MinerCard miner={miner} onPress={jest.fn()} />);
  expect(screen.getByText('Test Miner')).toBeTruthy();
});

it('calls onPress when tapped', async () => {
  const onPress = jest.fn();
  const miner = makeMiner();
  await render(<MinerCard miner={miner} onPress={onPress} />);
  fireEvent.press(screen.getByText('Test Miner'));
  expect(onPress).toHaveBeenCalledWith(miner);
});
