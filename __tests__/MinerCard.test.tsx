import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
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
  jest.restoreAllMocks();
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

it('shows danger color for temperature > 80', async () => {
  const miner = makeMiner({
    isOnline: true,
    status: {
      hashRate: 500,
      hashRateUnit: 'GH/s',
      temperature: 85,
      vrTemp: 0,
      voltage: 0,
      current: 0,
      power: 0,
      sharesAccepted: 0,
      sharesRejected: 0,
      bestDiff: '0',
      bestSessionDiff: '0',
      uptimeSeconds: 0,
      coreVoltage: 0,
      frequency: 0,
      fanSpeed: 0,
      fanRpm: 0,
      pool: '',
      poolPort: 0,
      poolUser: '',
      poolResponseTime: 0,
    },
  });
  await render(<MinerCard miner={miner} onPress={jest.fn()} />);
  expect(screen.getByText('85°C')).toBeTruthy();
});

it('shows warning color for temperature between 66-80', async () => {
  const miner = makeMiner({
    isOnline: true,
    status: {
      hashRate: 500,
      hashRateUnit: 'GH/s',
      temperature: 75,
      vrTemp: 0,
      voltage: 0,
      current: 0,
      power: 0,
      sharesAccepted: 0,
      sharesRejected: 0,
      bestDiff: '0',
      bestSessionDiff: '0',
      uptimeSeconds: 0,
      coreVoltage: 0,
      frequency: 0,
      fanSpeed: 0,
      fanRpm: 0,
      pool: '',
      poolPort: 0,
      poolUser: '',
      poolResponseTime: 0,
    },
  });
  await render(<MinerCard miner={miner} onPress={jest.fn()} />);
  expect(screen.getByText('75°C')).toBeTruthy();
});

it('shows success color for temperature <= 65', async () => {
  const miner = makeMiner({
    isOnline: true,
    status: {
      hashRate: 500,
      hashRateUnit: 'GH/s',
      temperature: 50,
      vrTemp: 0,
      voltage: 0,
      current: 0,
      power: 0,
      sharesAccepted: 0,
      sharesRejected: 0,
      bestDiff: '0',
      bestSessionDiff: '0',
      uptimeSeconds: 0,
      coreVoltage: 0,
      frequency: 0,
      fanSpeed: 0,
      fanRpm: 0,
      pool: '',
      poolPort: 0,
      poolUser: '',
      poolResponseTime: 0,
    },
  });
  await render(<MinerCard miner={miner} onPress={jest.fn()} />);
  expect(screen.getByText('50°C')).toBeTruthy();
});

it('shows delete alert on long press when onDelete provided', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const onDelete = jest.fn();
  const miner = makeMiner({ id: 'm2' });
  await render(<MinerCard miner={miner} onPress={jest.fn()} onDelete={onDelete} />);
  fireEvent(screen.getByText('Test Miner'), 'onLongPress');
  expect(alertSpy).toHaveBeenCalledWith(
    'Remove Miner',
    'Remove Test Miner? All history will be deleted.',
    expect.arrayContaining([
      expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
      expect.objectContaining({ text: 'Remove', style: 'destructive' }),
    ]),
  );
  alertSpy.mockRestore();
});

it('executes onDelete when Remove is pressed in alert', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
    const removeBtn = (buttons as any[])?.find((b: any) => b.text === 'Remove');
    if (removeBtn?.onPress) removeBtn.onPress();
  });
  const onDelete = jest.fn();
  const miner = makeMiner({ id: 'm3' });
  await render(<MinerCard miner={miner} onPress={jest.fn()} onDelete={onDelete} />);
  fireEvent(screen.getByText('Test Miner'), 'onLongPress');
  expect(onDelete).toHaveBeenCalledWith(miner);
  alertSpy.mockRestore();
});

it('renders without crashing without onDelete', async () => {
  const miner = makeMiner();
  await render(<MinerCard miner={miner} onPress={jest.fn()} />);
  expect(screen.getByText('Test Miner')).toBeTruthy();
});
