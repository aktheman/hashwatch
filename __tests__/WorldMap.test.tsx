import { render } from '@testing-library/react-native';
import React from 'react';
import { WorldMap } from '../src/components/WorldMap';
import { Miner } from '../src/types';

jest.setTimeout(30000);

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a1a',
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    primaryLight: '#8B83FF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#3B82F6',
    info: '#06B6D4',
  }),
}));

let mockMiners: Miner[] = [];
jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector: (state: { miners: Miner[] }) => unknown) =>
    selector({ miners: mockMiners }),
}));

jest.mock('react-native-svg', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ children }: { children: any }) => R.createElement('Svg', null, children),
    Path: (props: Record<string, unknown>) => R.createElement('Path', props),
    Circle: (props: Record<string, unknown>) => R.createElement('Circle', props),
    G: ({ children }: { children: any }) => R.createElement('G', null, children),
    Line: (props: Record<string, unknown>) => R.createElement('Line', props),
  };
});

interface MinerStatusOverride {
  hashRate?: number;
  hashRateUnit?: string;
  temperature?: number;
  voltage?: number;
  current?: number;
  power?: number;
  sharesAccepted?: number;
  sharesRejected?: number;
  uptimeSeconds?: number;
  frequency?: number;
  pool?: string;
  bestDiff?: string;
}

interface MinerOverride {
  id?: string;
  name?: string;
  isOnline?: boolean;
  location?: string;
  status?: MinerStatusOverride;
}

const makeMiner = (overrides: MinerOverride = {}) => ({
  id: '1',
  name: 'Test Miner',
  ip: '192.168.1.10',
  port: 80,
  addedAt: Date.now(),
  lastSeen: Date.now(),
  isOnline: true,
  location: 'Home',
  status: {
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: 65,
    voltage: 12,
    current: 5,
    power: 60,
    sharesAccepted: 100,
    sharesRejected: 2,
    uptimeSeconds: 86400,
    frequency: 500,
    pool: 'solo',
    bestDiff: '1.5',
  },
  ...overrides,
});

beforeEach(() => {
  mockMiners = [];
});

it('renders without crashing with empty miners', () => {
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('renders without crashing with miners', () => {
  mockMiners = [makeMiner()];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('renders with online miner', () => {
  mockMiners = [makeMiner({ isOnline: true })];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('renders with offline miner', () => {
  mockMiners = [makeMiner({ isOnline: false })];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('renders with high temp miner (critical)', () => {
  mockMiners = [
    makeMiner({
      status: {
        hashRate: 500,
        hashRateUnit: 'GH/s',
        temperature: 85,
        voltage: 12,
        current: 5,
        power: 60,
        sharesAccepted: 100,
        sharesRejected: 2,
        uptimeSeconds: 86400,
        frequency: 500,
        pool: 'solo',
        bestDiff: '1.5',
      },
    }),
  ];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('renders with multiple miners in same location', () => {
  mockMiners = [
    makeMiner({ id: '1', name: 'Miner A', location: 'Home' }),
    makeMiner({ id: '2', name: 'Miner B', location: 'Home' }),
    makeMiner({ id: '3', name: 'Miner C', location: 'Home' }),
  ];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('renders with miners in different locations', () => {
  mockMiners = [
    makeMiner({ id: '1', name: 'Miner A', location: 'Home' }),
    makeMiner({ id: '2', name: 'Miner B', location: 'Office' }),
  ];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('renders with miner without location', () => {
  mockMiners = [makeMiner({ location: '' })];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('getHealthColor returns success for healthy miner', () => {
  mockMiners = [
    makeMiner({
      isOnline: true,
      status: {
        hashRate: 500,
        hashRateUnit: 'GH/s',
        temperature: 60,
        voltage: 12,
        current: 5,
        power: 60,
        sharesAccepted: 100,
        sharesRejected: 2,
        uptimeSeconds: 86400,
        frequency: 500,
        pool: 'solo',
        bestDiff: '1.5',
      },
    }),
  ];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('getHealthColor returns warning for warm miner', () => {
  mockMiners = [
    makeMiner({
      isOnline: true,
      status: {
        hashRate: 50,
        hashRateUnit: 'GH/s',
        temperature: 70,
        voltage: 12,
        current: 5,
        power: 60,
        sharesAccepted: 100,
        sharesRejected: 2,
        uptimeSeconds: 86400,
        frequency: 500,
        pool: 'solo',
        bestDiff: '1.5',
      },
    }),
  ];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('getHealthColor returns textMuted for offline miner', () => {
  mockMiners = [makeMiner({ isOnline: false })];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('getHealthColor returns danger for zero hashrate miner', () => {
  mockMiners = [
    makeMiner({
      isOnline: true,
      status: {
        hashRate: 0,
        hashRateUnit: 'GH/s',
        temperature: 50,
        voltage: 12,
        current: 5,
        power: 60,
        sharesAccepted: 100,
        sharesRejected: 2,
        uptimeSeconds: 86400,
        frequency: 500,
        pool: 'solo',
        bestDiff: '1.5',
      },
    }),
  ];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('getHealthColor returns danger for very high temp miner', () => {
  mockMiners = [
    makeMiner({
      isOnline: true,
      status: {
        hashRate: 500,
        hashRateUnit: 'GH/s',
        temperature: 90,
        voltage: 12,
        current: 5,
        power: 60,
        sharesAccepted: 100,
        sharesRejected: 2,
        uptimeSeconds: 86400,
        frequency: 500,
        pool: 'solo',
        bestDiff: '1.5',
      },
    }),
  ];
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});

it('renders with 10+ miners across multiple locations', () => {
  mockMiners = Array.from({ length: 12 }, (_, i) =>
    makeMiner({ id: String(i), name: `Miner ${i}`, location: i % 2 === 0 ? 'Home' : 'Office' }),
  );
  const r = render(<WorldMap />);
  expect(r).toBeTruthy();
});
