import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { FirmwareBanner } from '../src/components/FirmwareBanner';
import { Linking } from 'react-native';

const mockOpenURL = jest.fn().mockResolvedValue(undefined);
jest.spyOn(Linking, 'openURL').mockImplementation(mockOpenURL);

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    warning: '#F59E0B',
    textDim: '#888',
    textMuted: '#666',
    text: '#111',
    surfaceLight: '#f5f5f5',
    border: '#ddd',
    success: '#22c55e',
    primary: '#3b82f6',
  }),
}));

jest.mock('../src/utils/version', () => ({
  parseVersion: (v: string) => {
    const match = v.match(/v?(\d+\.\d+\.\d+)/);
    return match ? `v${match[1]}` : null;
  },
  needsUpdate: (cur: string, lat: string) => cur !== lat,
  LATEST_FIRMWARE: 'v2.2.1',
  getFirmwareUrl: () => 'https://github.com/skot/bitaxe/releases/latest',
  getFirmwareBinaryUrl: (v: string) =>
    `https://github.com/skot/bitaxe/releases/download/${v}/bitaxe-${v}.bin`,
  fetchLatestFirmware: jest.fn().mockResolvedValue('v2.2.1'),
}));

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: jest.fn().mockImplementation(() => ({
    flashFirmware: jest.fn().mockResolvedValue(true),
  })),
}));

const defaultProps = {
  minerIp: '192.168.1.100',
  minerPort: 80,
  apiPath: '/api/system/info',
  statusPath: '/api/system/status',
};

describe('FirmwareBanner', () => {
  it('renders nothing when no version', async () => {
    await render(<FirmwareBanner rawVersion={null} {...defaultProps} />);
    expect(screen.queryByText('firmwareBanner.title')).toBeNull();
  });

  it('renders nothing when version is up to date', async () => {
    await render(<FirmwareBanner rawVersion="v2.2.1" {...defaultProps} />);
    expect(screen.queryByText('firmwareBanner.updateTo')).toBeNull();
  });

  it('shows firmware section when version is outdated', async () => {
    await render(<FirmwareBanner rawVersion="v2.0.0" {...defaultProps} />);
    expect(screen.getByText('firmwareBanner.title')).toBeTruthy();
  });

  it('shows current and latest version', async () => {
    await render(<FirmwareBanner rawVersion="v2.0.0" {...defaultProps} />);
    expect(screen.getByText('v2.0.0')).toBeTruthy();
    expect(screen.getByText('v2.2.1')).toBeTruthy();
  });

  it('shows update button for outdated version', async () => {
    await render(<FirmwareBanner rawVersion="v2.0.0" {...defaultProps} />);
    expect(screen.getByText('firmwareBanner.updateTo')).toBeTruthy();
  });

  it('has release notes link with correct URL', async () => {
    await render(<FirmwareBanner rawVersion="v2.0.0" {...defaultProps} />);
    fireEvent.press(screen.getByText(/viewReleaseNotes/));
    expect(mockOpenURL).toHaveBeenCalledWith('https://github.com/skot/bitaxe/releases/latest');
  });

  it('renders nothing when version cannot be parsed', async () => {
    await render(<FirmwareBanner rawVersion="invalid" {...defaultProps} />);
    expect(screen.queryByText('firmwareBanner.title')).toBeNull();
  });

  it('renders with just v prefix version', async () => {
    await render(<FirmwareBanner rawVersion="v1.0.0" {...defaultProps} />);
    expect(screen.getByText('firmwareBanner.title')).toBeTruthy();
  });

  it('handles URL open failure gracefully', async () => {
    mockOpenURL.mockRejectedValueOnce(new Error('fail'));
    await render(<FirmwareBanner rawVersion="v2.0.0" {...defaultProps} />);
    fireEvent.press(screen.getByText(/viewReleaseNotes/));
    expect(mockOpenURL).toHaveBeenCalled();
  });
});
