import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { ImportDataScreen } from '../src/screens/ImportDataScreen';

const mockImport = jest.fn();

jest.mock('../src/utils/export', () => ({
  importFromJSON: (json: string) => mockImport(json),
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

beforeEach(() => {
  jest.clearAllMocks();
  mockImport.mockResolvedValue({ miners: 3, snapshots: 50, wallets: 2 });
});

it('renders import screen', async () => {
  await render(<ImportDataScreen />);
  expect(screen.getAllByText('Import Data').length).toBeGreaterThanOrEqual(1);
});
