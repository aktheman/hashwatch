import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { FirmwareBanner } from '../src/components/FirmwareBanner';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    warning: '#F59E0B',
    textDim: '#888',
    textMuted: '#666',
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
  fetchLatestFirmware: jest.fn().mockResolvedValue('v2.2.1'),
}));

describe('FirmwareBanner', () => {
  it('renders nothing when no version', async () => {
    await render(<FirmwareBanner rawVersion={null} />);
    expect(screen.queryByText('Firmware Update Available')).toBeNull();
  });

  it('renders nothing when version is up to date', async () => {
    await render(<FirmwareBanner rawVersion="v2.2.1" />);
    expect(screen.queryByText('Firmware Update Available')).toBeNull();
  });

  it('shows banner when update is available', async () => {
    await render(<FirmwareBanner rawVersion="v2.0.0" />);
    expect(screen.getByText('Firmware Update Available')).toBeTruthy();
  });
});
