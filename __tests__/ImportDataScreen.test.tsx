import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { ImportDataScreen } from '../src/screens/ImportDataScreen';

const mockImport = jest.fn();
let deferredResolve: ((v: unknown) => void) | null = null;

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

afterEach(() => {
  deferredResolve?.(undefined);
  deferredResolve = null;
  cleanup();
});

it('renders import screen', async () => {
  await render(<ImportDataScreen />);
  expect(screen.getAllByText('import.title').length).toBeGreaterThanOrEqual(1);
});

it('shows alert when importing empty text', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<ImportDataScreen />);

  await act(async () => {
    fireEvent.press(screen.getByLabelText('Import data'));
  });

  expect(alertSpy).toHaveBeenCalledWith('import.noData', 'import.noDataBody');
  alertSpy.mockRestore();
});

it('shows Importing... text while import is in progress', async () => {
  mockImport.mockImplementation(
    () =>
      new Promise((resolve) => {
        deferredResolve = resolve;
      }),
  );
  await render(<ImportDataScreen />);

  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('Paste JSON backup data'), '{"valid":"json"}');
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Import data'));
  });

  expect(screen.getByText('import.importing')).toBeTruthy();
});

it('disables button while importing', async () => {
  mockImport.mockImplementation(
    () =>
      new Promise((resolve) => {
        deferredResolve = resolve;
      }),
  );
  await render(<ImportDataScreen />);

  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('Paste JSON backup data'), '{"valid":"json"}');
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Import data'));
  });

  expect(screen.getByLabelText('Import data').props.accessibilityState?.disabled).toBe(true);
});

it('shows success result after import', async () => {
  await render(<ImportDataScreen />);

  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('Paste JSON backup data'), '{"valid":"json"}');
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Import data'));
  });

  await waitFor(() => {
    expect(screen.getByText('import.success')).toBeTruthy();
    expect(screen.getByText('import.minersImported')).toBeTruthy();
    expect(screen.getByText('import.snapshotsImported')).toBeTruthy();
    expect(screen.getByText('import.walletsImported')).toBeTruthy();
  });
});

it('shows singular noun for single miner', async () => {
  mockImport.mockResolvedValue({ miners: 1, snapshots: 1, wallets: 1 });
  await render(<ImportDataScreen />);

  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('Paste JSON backup data'), 'data');
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Import data'));
  });

  await waitFor(() => {
    expect(screen.getByText('import.minersImported')).toBeTruthy();
    expect(screen.getByText('import.snapshotsImported')).toBeTruthy();
    expect(screen.getByText('import.walletsImported')).toBeTruthy();
  });
});

it('shows alert when import fails', async () => {
  mockImport.mockRejectedValue(new Error('Invalid JSON format'));
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  await render(<ImportDataScreen />);

  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('Paste JSON backup data'), 'bad data');
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Import data'));
  });

  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('import.failed', 'Invalid JSON format');
  });
  alertSpy.mockRestore();
});

it('shows generic error alert for non-Error throws', async () => {
  mockImport.mockRejectedValue('string error');
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  await render(<ImportDataScreen />);

  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('Paste JSON backup data'), 'data');
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Import data'));
  });

  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('import.failed', 'import.invalidData');
  });
  alertSpy.mockRestore();
});
