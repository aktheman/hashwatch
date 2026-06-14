import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { GroupsScreen } from '../src/screens/GroupsScreen';

const mockMiners = [
  { id: 'm1', name: 'Miner A', ip: '10.0.0.1', port: 80, isOnline: true, group: 'Garage' },
  { id: 'm2', name: 'Miner B', ip: '10.0.0.2', port: 80, isOnline: false, group: 'Garage' },
  { id: 'm3', name: 'Miner C', ip: '10.0.0.3', port: 80, isOnline: true, group: 'Basement' },
  { id: 'm4', name: 'Miner D', ip: '10.0.0.4', port: 80, isOnline: true },
];

const mockSetMinerGroup = jest.fn();

jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector: any) =>
    selector({
      miners: mockMiners,
      setMinerGroup: (id: string, group: string | undefined) => mockSetMinerGroup(id, group),
    }),
}));

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
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#3B82F6',
    info: '#06B6D4',
  }),
}));

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate } as any;

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders groups header', async () => {
  await render(<GroupsScreen navigation={mockNavigation} />);
  expect(screen.getByText('Group Management')).toBeTruthy();
});

it('shows all groups with miner counts', async () => {
  await render(<GroupsScreen navigation={mockNavigation} />);
  expect(screen.getByText(/Garage/)).toBeTruthy();
  expect(screen.getByText(/Basement/)).toBeTruthy();
  expect(screen.getByText(/Ungrouped/)).toBeTruthy();
  expect(screen.getByText(/2 miners/)).toBeTruthy();
});

it('shows miners within groups', async () => {
  await render(<GroupsScreen navigation={mockNavigation} />);
  expect(screen.getByText(/Miner A/)).toBeTruthy();
  expect(screen.getByText(/Miner B/)).toBeTruthy();
  expect(screen.getByText(/Miner C/)).toBeTruthy();
  expect(screen.getByText(/Miner D/)).toBeTruthy();
});

it('renders remove buttons for non-ungrouped miners', async () => {
  await render(<GroupsScreen navigation={mockNavigation} />);
  expect(screen.getAllByText('Remove').length).toBeGreaterThanOrEqual(3);
});
