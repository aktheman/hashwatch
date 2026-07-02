import { render, cleanup, waitFor } from '@testing-library/react-native';
import React from 'react';
import { PoolChangeHistory } from '../src/components/PoolChangeHistory';

jest.mock('../src/api/client', () => ({
  fetchPoolChanges: jest.fn(),
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    warning: '#F59E0B',
  }),
}));

const mockFetchPoolChanges = jest.requireMock('../src/api/client').fetchPoolChanges as jest.Mock;

beforeEach(() => {
  cleanup();
  mockFetchPoolChanges.mockReset();
});

it('shows loading indicator initially', async () => {
  mockFetchPoolChanges.mockReturnValue(new Promise(() => {}));
  const tree = await render(<PoolChangeHistory minerId="m1" />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders list of pool changes after loading', async () => {
  mockFetchPoolChanges.mockResolvedValue([
    { previouspool: 'Pool A', newpool: 'Pool B', changedat: Date.now() - 60000 },
    { previouspool: 'Old Pool', newpool: 'New Pool', changedat: Date.now() - 120000 },
  ]);
  const tree = await render(<PoolChangeHistory minerId="m1" />);
  await waitFor(() => {
    expect(tree.getByText('minerDetail.recentPoolChanges')).toBeTruthy();
  });
  expect(tree.getByText('Pool A')).toBeTruthy();
  expect(tree.getByText('Pool B')).toBeTruthy();
  expect(tree.getByText('Old Pool')).toBeTruthy();
  expect(tree.getByText('New Pool')).toBeTruthy();
});

it('shows previous → new pool with relative time', async () => {
  mockFetchPoolChanges.mockResolvedValue([
    { previouspool: 'Stratum A', newpool: 'Stratum B', changedat: Date.now() - 30000 },
  ]);
  const tree = await render(<PoolChangeHistory minerId="m1" />);
  await waitFor(() => {
    expect(tree.getByText('Stratum A')).toBeTruthy();
  });
  expect(tree.getByText('Stratum B')).toBeTruthy();
});

it('returns null when changes array is empty', async () => {
  mockFetchPoolChanges.mockResolvedValue([]);
  const tree = await render(<PoolChangeHistory minerId="m1" />);
  await waitFor(() => {
    expect(tree.toJSON()).toBeNull();
  });
});

it('returns null on fetch error', async () => {
  mockFetchPoolChanges.mockRejectedValue(new Error('Network error'));
  const tree = await render(<PoolChangeHistory minerId="m1" />);
  await waitFor(() => {
    expect(tree.toJSON()).toBeNull();
  });
});
