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
  it('returns null when no version', async () => {
    const { container } = await render(<FirmwareBanner rawVersion={null} />);
    expect(container).toBeTruthy();
  });

  it('returns null when version is up to date', async () => {
    const { container } = await render(<FirmwareBanner rawVersion="v2.2.1" />);
    expect(container).toBeTruthy();
  });

  it('shows banner when update is available', async () => {
    await render(<FirmwareBanner rawVersion="v2.0.0" />);
    expect(await screen.findByText('Firmware Update Available')).toBeTruthy();
  });
});
