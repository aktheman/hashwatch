import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

const mockCheckForFirmwareUpdate = jest.fn();
const mockFlashFirmware = jest.fn();
const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();

jest.mock('../src/services/firmwareUpdate', () => ({
  checkForFirmwareUpdate: (...args: unknown[]) => mockCheckForFirmwareUpdate(...args),
  flashFirmware: (...args: unknown[]) => mockFlashFirmware(...args),
}));

jest.mock('../src/db/database', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
  setSetting: (...args: unknown[]) => mockSetSetting(...args),
}));

jest.mock('../src/utils/version', () => ({
  LATEST_FIRMWARE: 'v2.2.1',
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    primary: '#6C63FF',
    textDim: '#888',
    textMuted: '#666',
    surfaceLight: '#2a2a4e',
    border: '#ddd',
    success: '#22c55e',
    danger: '#EF4444',
  }),
}));

import { FirmwareUpdateBanner, _resetSessionCheck } from '../src/components/FirmwareUpdateBanner';

const mockUpdate: any = {
  version: 'v2.2.1',
  releaseDate: '2026-06-01',
  downloadUrl: 'https://example.com/bitaxe-v2.2.1.bin',
  changelog: 'Bug fixes',
  sha256: 'abc',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSetting.mockResolvedValue(null);
  mockCheckForFirmwareUpdate.mockResolvedValue(null);
  mockFlashFirmware.mockResolvedValue(true);
  _resetSessionCheck();
});

describe('FirmwareUpdateBanner', () => {
  it('renders nothing when no update available', async () => {
    await render(<FirmwareUpdateBanner currentVersion="v2.2.1" />);
    expect(screen.queryByTestId('firmware-update-banner')).toBeNull();
  });

  it('renders banner with update info', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(mockUpdate);
    await render(<FirmwareUpdateBanner currentVersion="v2.2.0" />);
    expect(screen.getByTestId('firmware-update-banner')).toBeTruthy();
    expect(screen.getByText('firmwareBanner.updateAvailable')).toBeTruthy();
  });

  it('shows skip button', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(mockUpdate);
    await render(<FirmwareUpdateBanner currentVersion="v2.2.0" />);
    expect(screen.getByTestId('firmware-skip-btn')).toBeTruthy();
  });

  it('skips version on dismiss', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(mockUpdate);
    await render(<FirmwareUpdateBanner currentVersion="v2.2.0" />);
    await act(async () => fireEvent.press(screen.getByTestId('firmware-skip-btn')));
    expect(mockSetSetting).toHaveBeenCalledWith('firmware_skip_version', 'v2.2.1');
    expect(screen.queryByTestId('firmware-update-banner')).toBeNull();
  });

  it('shows changelog when available', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue({
      ...mockUpdate,
      changelog: 'Bug fixes and performance improvements',
    });
    await render(<FirmwareUpdateBanner currentVersion="v2.2.0" />);
    expect(screen.getByText('Bug fixes and performance improvements')).toBeTruthy();
  });

  it('does not show changelog when empty', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue({ ...mockUpdate, changelog: '' });
    await render(<FirmwareUpdateBanner currentVersion="v2.2.0" />);
    expect(screen.getByTestId('firmware-update-banner')).toBeTruthy();
  });

  it('skips version when already skipped', async () => {
    mockGetSetting.mockResolvedValue('v2.2.1');
    mockCheckForFirmwareUpdate.mockResolvedValue(mockUpdate);
    await render(<FirmwareUpdateBanner currentVersion="v2.2.0" />);
    expect(screen.queryByTestId('firmware-update-banner')).toBeNull();
  });

  it('renders update button', async () => {
    mockCheckForFirmwareUpdate.mockResolvedValue(mockUpdate);
    await render(<FirmwareUpdateBanner currentVersion="v2.2.0" />);
    expect(screen.getByTestId('firmware-update-btn')).toBeTruthy();
  });

  it('shows error when flash fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockCheckForFirmwareUpdate.mockResolvedValue(mockUpdate);
    mockFlashFirmware.mockResolvedValue(false);
    await render(<FirmwareUpdateBanner currentVersion="v2.2.0" />);

    await act(async () => fireEvent.press(screen.getByTestId('firmware-update-btn')));

    const alertCall = alertSpy.mock.calls[0];
    expect(alertCall).toBeDefined();
    const flashButton = alertCall[2].find((b: any) => b.text === 'firmwareBanner.flash');
    await act(async () => flashButton.onPress());

    expect(screen.getByTestId('firmware-error')).toBeTruthy();
    expect(screen.getByText('firmwareBanner.flashFailed')).toBeTruthy();
  });

  it('shows success after flash', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockCheckForFirmwareUpdate.mockResolvedValue(mockUpdate);
    mockFlashFirmware.mockResolvedValue(true);
    await render(<FirmwareUpdateBanner currentVersion="v2.2.0" />);

    await act(async () => fireEvent.press(screen.getByTestId('firmware-update-btn')));

    const alertCall = alertSpy.mock.calls[0];
    expect(alertCall).toBeDefined();
    const flashButton = alertCall[2].find((b: any) => b.text === 'firmwareBanner.flash');
    await act(async () => flashButton.onPress());

    expect(screen.getByTestId('firmware-success')).toBeTruthy();
    expect(screen.getByText('firmwareBanner.flashSent')).toBeTruthy();
  });
});
