import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { WalletsScreen } from '../src/screens/WalletsScreen';

jest.setTimeout(30000);

const mockLoadWallets = jest.fn();
const mockSaveWallet = jest.fn();
const mockDeleteWallet = jest.fn();
const mockIsValid = jest.fn();

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

jest.mock('../src/utils/bitcoin', () => ({
  isValidBitcoinAddress: (...args: unknown[]) => mockIsValid(...args),
}));

describe('WalletsScreen', () => {
  beforeEach(() => {
    mockLoadWallets.mockClear();
    mockSaveWallet.mockClear();
    mockDeleteWallet.mockClear();
    mockIsValid.mockClear().mockReturnValue(true);
  });

  it('shows empty state when no wallets', async () => {
    mockLoadWallets.mockResolvedValue([]);
    await render(<WalletsScreen />);
    expect(await screen.findByText('wallets.noWallets')).toBeTruthy();
  });

  it('renders list of wallets', async () => {
    mockLoadWallets.mockResolvedValue([
      { id: 'w1', name: 'Main Wallet', address: 'bc1q...', color: '#6C63FF', createdAt: 1000 },
    ]);
    await render(<WalletsScreen />);
    expect(await screen.findByText('Main Wallet')).toBeTruthy();
    expect(screen.getByText('wallets.walletCount')).toBeTruthy();
  });

  it('shows plural wallet count', async () => {
    mockLoadWallets.mockResolvedValue([
      { id: 'w1', name: 'W1', address: 'bc1q...', color: '#6C63FF', createdAt: 1000 },
      { id: 'w2', name: 'W2', address: 'bc1q...', color: '#10B981', createdAt: 2000 },
    ]);
    await render(<WalletsScreen />);
    expect(await screen.findByText('wallets.walletCount')).toBeTruthy();
  });

  it('can open create wallet modal', async () => {
    mockLoadWallets.mockResolvedValue([]);
    await render(<WalletsScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByText('wallets.createWallet'));
    });
    await waitFor(() => expect(screen.getByText('wallets.newWallet')).toBeTruthy());
  });

  it('shows Add Wallet button when list is visible', async () => {
    mockLoadWallets.mockResolvedValue([
      { id: 'w1', name: 'Existing', address: 'bc1q...', color: '#6C63FF', createdAt: 1000 },
    ]);
    await render(<WalletsScreen />);
    expect(await screen.findByText('wallets.addWallet')).toBeTruthy();
  });

  it('saves a new wallet with valid inputs', async () => {
    mockLoadWallets
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'w1', name: 'Test Wallet', address: 'bc1q...', color: '#6C63FF', createdAt: 2000 },
      ]);
    mockSaveWallet.mockResolvedValue(undefined);

    await render(<WalletsScreen />);

    await act(async () => {
      fireEvent.press(await screen.findByText('wallets.createWallet'));
    });
    await waitFor(() => expect(screen.getByText('wallets.newWallet')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Wallet name input'), 'Test Wallet');
    });
    await act(async () => {
      fireEvent.changeText(
        screen.getByLabelText('Bitcoin address input'),
        'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      );
    });
    await act(async () => {
      fireEvent.press(screen.getByText('common.save'));
    });

    await waitFor(() => {
      expect(mockSaveWallet).toHaveBeenCalled();
    });
    expect(mockSaveWallet).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test Wallet' }));
  }, 15000);

  it('shows validation alert when name is empty', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockLoadWallets.mockResolvedValue([]);

    await render(<WalletsScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByText('wallets.createWallet'));
    });
    await waitFor(() => expect(screen.getByText('wallets.newWallet')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Bitcoin address input'), 'bc1q...');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('common.save'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('wallets.validation', 'wallets.validationBody');
    });
    alertSpy.mockRestore();
  });

  it('shows validation alert when address is empty', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockLoadWallets.mockResolvedValue([]);

    await render(<WalletsScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByText('wallets.createWallet'));
    });
    await waitFor(() => expect(screen.getByText('wallets.newWallet')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Wallet name input'), 'Test');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('common.save'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('wallets.validation', 'wallets.validationBody');
    });
    alertSpy.mockRestore();
  });

  it('shows invalid address alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockLoadWallets.mockResolvedValue([]);
    mockIsValid.mockReturnValue(false);

    await render(<WalletsScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByText('wallets.createWallet'));
    });
    await waitFor(() => expect(screen.getByText('wallets.newWallet')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Wallet name input'), 'Test');
    });
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Bitcoin address input'), 'invalid');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('common.save'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('wallets.invalidAddress', expect.any(String));
    });
    alertSpy.mockRestore();
  });

  it('edits an existing wallet', async () => {
    const wallet = {
      id: 'w1',
      name: 'Old Name',
      address: 'bc1qold',
      color: '#10B981',
      createdAt: 1000,
    };
    mockLoadWallets
      .mockResolvedValueOnce([wallet])
      .mockResolvedValueOnce([{ ...wallet, name: 'Updated Name' }]);
    mockSaveWallet.mockResolvedValue(undefined);

    await render(<WalletsScreen />);
    expect(await screen.findByText('Old Name')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Edit wallet: Old Name'));
    });
    await waitFor(() => expect(screen.getByText('wallets.editWallet')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Wallet name input'), 'Updated Name');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('common.save'));
    });

    await waitFor(() => {
      expect(mockSaveWallet).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'w1', name: 'Updated Name' }),
      );
    });
  });

  it('deletes a wallet', async () => {
    const wallet = {
      id: 'w1',
      name: 'Delete Me',
      address: 'bc1qdel',
      color: '#EF4444',
      createdAt: 1000,
    };
    mockDeleteWallet.mockResolvedValue(undefined);
    mockLoadWallets.mockResolvedValueOnce([wallet]).mockResolvedValueOnce([]);

    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(
        (_title: string, _msg: string, buttons?: { text?: string; onPress?: () => void }[]) => {
          const deleteBtn = buttons?.find((b) => b.text === 'common.delete');
          if (deleteBtn?.onPress) deleteBtn.onPress();
        },
      );

    await render(<WalletsScreen />);
    expect(await screen.findByText('Delete Me')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Delete wallet: Delete Me'));
    });
    await waitFor(() => expect(mockDeleteWallet).toHaveBeenCalledWith('w1'));
    await waitFor(() => expect(screen.queryByText('Delete Me')).toBeNull());
    expect(screen.getByText('wallets.noWallets')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('cancels the modal', async () => {
    mockLoadWallets.mockResolvedValue([]);

    await render(<WalletsScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByText('wallets.createWallet'));
    });
    await waitFor(() => expect(screen.getByText('wallets.newWallet')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Cancel'));
    });
    await waitFor(() => {
      expect(screen.queryByText('wallets.newWallet')).toBeNull();
    });
  });

  it('cancels delete via Alert Cancel button', async () => {
    const wallet = {
      id: 'w1',
      name: 'Keep Me',
      address: 'bc1qkeep',
      color: '#6C63FF',
      createdAt: 1000,
    };
    mockLoadWallets.mockResolvedValue([wallet]);

    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(
        (_title: string, _msg: string, buttons?: { text?: string; onPress?: () => void }[]) => {
          const cancelBtn = buttons?.find((b) => b.text === 'common.cancel');
          if (cancelBtn?.onPress) cancelBtn.onPress();
        },
      );

    await render(<WalletsScreen />);
    expect(await screen.findByText('Keep Me')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Delete wallet: Keep Me'));
    });
    expect(mockDeleteWallet).not.toHaveBeenCalled();
    expect(screen.getByText('Keep Me')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('selects a color in the modal', async () => {
    mockLoadWallets.mockResolvedValue([]);
    mockSaveWallet.mockResolvedValue(undefined);

    await render(<WalletsScreen />);
    await act(async () => {
      fireEvent.press(await screen.findByText('wallets.createWallet'));
    });
    await waitFor(() => expect(screen.getByText('wallets.newWallet')).toBeTruthy());

    const colorCircles = screen.getAllByLabelText('Select color');
    expect(colorCircles.length).toBe(8);
    await act(async () => {
      fireEvent.press(colorCircles[1]);
    });
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Wallet name input'), 'Color Wallet');
    });
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Bitcoin address input'), 'bc1qcolor');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('common.save'));
    });

    await waitFor(() => {
      expect(mockSaveWallet).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#10B981', name: 'Color Wallet' }),
      );
    });
  });
});
