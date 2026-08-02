import { render, screen, fireEvent, act, cleanup } from '@testing-library/react-native';
import React from 'react';
import { UpdateBanner } from '../src/components/UpdateBanner';
import { setTheme, darkTheme } from '../src/theme';

const mockInstallUpdate = jest.fn();
const mockOnCheckForUpdate = jest.fn();
const mockOnUpdateDownloaded = jest.fn();
const cleanupAvail = jest.fn();
const cleanupDownloaded = jest.fn();

let availableCb: ((info: { version: string; url: string }) => void) | null = null;
let downloadedCb: (() => void) | null = null;

beforeEach(() => {
  cleanup();
  setTheme(darkTheme);
  jest.clearAllMocks();
  availableCb = null;
  downloadedCb = null;
  mockOnCheckForUpdate.mockImplementation(
    (cb: (info: { version: string; url: string }) => void) => {
      availableCb = cb;
      return cleanupAvail;
    },
  );
  mockOnUpdateDownloaded.mockImplementation((cb: () => void) => {
    downloadedCb = cb;
    return cleanupDownloaded;
  });
  (globalThis as any).window = {
    electronAPI: {
      onCheckForUpdate: mockOnCheckForUpdate,
      onUpdateDownloaded: mockOnUpdateDownloaded,
      installUpdate: mockInstallUpdate,
    },
  };
});

afterEach(() => {
  delete (globalThis as any).window;
});

describe('UpdateBanner', () => {
  it('renders nothing when there is no update', async () => {
    await render(<UpdateBanner />);
    expect(screen.queryByText('update.available')).toBeNull();
    expect(screen.queryByText('update.downloaded')).toBeNull();
  });

  it('renders nothing when electron API is unavailable', async () => {
    (globalThis as any).window = {};
    await render(<UpdateBanner />);
    expect(screen.queryByText('update.available')).toBeNull();
  });

  it('shows update text when an update is announced', async () => {
    await render(<UpdateBanner />);
    await act(async () => {
      availableCb?.({ version: '1.2.3', url: 'https://example.com' });
    });
    expect(screen.getByText('update.available')).toBeTruthy();
    expect(screen.getByText('update.availableBody')).toBeTruthy();
  });

  it('dismisses the banner when dismiss is pressed', async () => {
    await render(<UpdateBanner />);
    await act(async () => {
      availableCb?.({ version: '1.2.3', url: 'https://example.com' });
    });
    await fireEvent.press(screen.getByLabelText('Dismiss update'));
    expect(screen.queryByText('update.available')).toBeNull();
  });

  it('shows downloaded state with install and later buttons', async () => {
    await render(<UpdateBanner />);
    await act(async () => {
      availableCb?.({ version: '2.0.0', url: 'https://example.com' });
    });
    await act(async () => {
      downloadedCb?.();
    });
    expect(screen.getByText('update.downloaded')).toBeTruthy();
    expect(screen.getByText('update.downloadedBody')).toBeTruthy();
    expect(screen.getByLabelText('Download update')).toBeTruthy();
    expect(screen.getByLabelText('Dismiss update')).toBeTruthy();
  });

  it('installs the update when install is pressed', async () => {
    await render(<UpdateBanner />);
    await act(async () => {
      availableCb?.({ version: '2.0.0', url: 'https://example.com' });
    });
    await act(async () => {
      downloadedCb?.();
    });
    await fireEvent.press(screen.getByLabelText('Download update'));
    expect(mockInstallUpdate).toHaveBeenCalled();
  });

  it('dismisses the banner after download', async () => {
    await render(<UpdateBanner />);
    await act(async () => {
      availableCb?.({ version: '2.0.0', url: 'https://example.com' });
    });
    await act(async () => {
      downloadedCb?.();
    });
    await fireEvent.press(screen.getByLabelText('Dismiss update'));
    expect(screen.queryByText('update.downloaded')).toBeNull();
  });

  it('unsubscribes listeners on unmount', async () => {
    const { unmount } = await render(<UpdateBanner />);
    await unmount();
    expect(cleanupAvail).toHaveBeenCalled();
    expect(cleanupDownloaded).toHaveBeenCalled();
  });
});
