import { render, cleanup } from '@testing-library/react-native';
import React from 'react';
import { WorldMap } from '../src/components/WorldMap';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mk = (displayName: string) => {
    const C = (props: any) => React.createElement(View, props);
    C.displayName = displayName;
    return C;
  };
  const SvgComponent = mk('Svg');
  return {
    __esModule: true,
    default: SvgComponent,
    Svg: SvgComponent,
    Path: mk('Path'),
    Circle: mk('Circle'),
    G: mk('G'),
    Line: mk('Line'),
  };
});

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    primaryLight: '#8B85FF',
    surface: '#13132B',
    text: '#FFFFFF',
    textMuted: '#5C5F7A',
  }),
}));

let mockMiners: any[] = [];
jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector: any) => {
    const state = { miners: mockMiners };
    return selector(state);
  },
}));

beforeEach(() => {
  cleanup();
  mockMiners = [];
});

it('renders with miners that have locations', async () => {
  mockMiners = [
    { id: 'm1', name: 'Miner A', isOnline: true, location: 'Home' },
    { id: 'm2', name: 'Miner B', isOnline: true, location: 'Office' },
  ];
  const tree = await render(<WorldMap />);
  expect(tree.toJSON()).toBeTruthy();
});

it('handles empty miners array', async () => {
  const tree = await render(<WorldMap />);
  expect(tree.toJSON()).toBeTruthy();
});

it('handles miners without location data', async () => {
  mockMiners = [
    { id: 'm1', name: 'No Loc', isOnline: true },
    { id: 'm2', name: 'Another', isOnline: false },
  ];
  const tree = await render(<WorldMap />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders miner markers', async () => {
  mockMiners = [
    { id: 'm1', name: 'Miner One', isOnline: true, location: 'Home' },
    { id: 'm2', name: 'Miner Two', isOnline: true, location: 'Lab' },
    { id: 'm3', name: 'Miner Three', isOnline: false, location: 'Garage' },
  ];
  const tree = await render(<WorldMap />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders with mixed locations and unlocated miners', async () => {
  mockMiners = [
    { id: 'm1', name: 'Located', isOnline: true, location: 'Office' },
    { id: 'm2', name: 'Unlocated', isOnline: true },
    { id: 'm3', name: 'Offline Unlocated', isOnline: false },
  ];
  const tree = await render(<WorldMap />);
  expect(tree.toJSON()).toBeTruthy();
});
