import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { WalletsScreen } from '../src/screens/WalletsScreen';

jest.setTimeout(20000);

const mockLoadWallets = jest.fn();
const mockSaveWallet = jest.fn();
const mockDeleteWallet = jest.fn();

jest.mock('../src/db/database', () => ({
  loadWallets: () => mockLoadWallets(),
  saveWallet: (w: unknown) => mockSaveWallet(w),
  deleteWallet: (id: string) => mockDeleteWallet(id),
}));

jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector?: (s: { miners: unknown[] }) => unknown) => {
    const state = { miners: [] };
    return selector ? selector(state) : state;
  },
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
    danger: '#EF4444',
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WalletsScreen', () => {
  it('shows empty state when no wallets', async () => {
    mockLoadWallets.mockResolvedValue([]);
    await render(<WalletsScreen />);
    expect(await screen.findByText('No Wallets')).toBeTruthy();
  });

  it('renders list of wallets', async () => {
    mockLoadWallets.mockResolvedValue([
      { id: 'w1', name: 'Main Wallet', address: 'bc1q...', color: '#6C63FF', createdAt: 1000 },
    ]);
    await render(<WalletsScreen />);
    expect(await screen.findByText('Main Wallet')).toBeTruthy();
  });

  it('can open create wallet modal', async () => {
    mockLoadWallets.mockResolvedValue([]);
    await render(<WalletsScreen />);
    const createBtn = await screen.findByText('Create Wallet');
    fireEvent.press(createBtn);
    await waitFor(() => {
      expect(screen.getByText('New Wallet')).toBeTruthy();
    });
  });
});
