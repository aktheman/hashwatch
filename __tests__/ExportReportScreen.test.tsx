import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert.alert = jest.fn();
  return RN;
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({ params: {} }),
}));

const mockGetSnapshots = jest.fn().mockResolvedValue([]);
jest.mock('../src/store/miners', () => ({
  useMinerStore: (sel: (s: Record<string, unknown>) => unknown) =>
    sel({
      miners: [
        {
          id: 'm1',
          name: 'TestMiner',
          ip: '192.168.1.1',
          port: 80,
          isOnline: true,
          group: 'Garage',
          status: {
            hashRate: 500,
            hashRateUnit: 'GH/s',
            temperature: 50,
            power: 12,
            sharesAccepted: 100,
            sharesRejected: 2,
            uptimeSeconds: 3600,
            bestDiff: '1M',
            pool: 'pool.example.com',
            poolPort: 3333,
            poolUser: 'user',
            poolResponseTime: 100,
            fanSpeed: 50,
            fanRpm: 3000,
            coreVoltage: 1200,
            vrTemp: 45,
          },
        },
        {
          id: 'm2',
          name: 'MinerTwo',
          ip: '192.168.1.2',
          port: 80,
          isOnline: false,
          status: null,
        },
      ],
      getSnapshots: mockGetSnapshots,
    }),
}));

jest.mock('../src/utils/reportExport', () => ({
  reportCSV: jest.fn(() => 'mock,csv'),
  reportJSON: jest.fn(() => ({ mock: true })),
  downloadReport: jest.fn(),
}));

import { ExportReportScreen } from '../src/screens/ExportReportScreen';
import { reportCSV, reportJSON, downloadReport } from '../src/utils/reportExport';

describe('ExportReportScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSnapshots.mockResolvedValue([]);
  });

  it('renders the title', async () => {
    const r = await render(
      <ExportReportScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />,
    );
    expect(r.getByText('exportReport.title')).toBeTruthy();
  });

  it('renders date range presets', async () => {
    const r = await render(
      <ExportReportScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />,
    );
    expect(r.getByText('exportReport.last24h')).toBeTruthy();
    expect(r.getByText('exportReport.last7d')).toBeTruthy();
    expect(r.getByText('exportReport.last30d')).toBeTruthy();
  });

  it('shows all miners by default', async () => {
    const r = await render(
      <ExportReportScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />,
    );
    expect(r.getByText('exportReport.allMiners')).toBeTruthy();
  });

  it('renders format selector', async () => {
    const r = await render(
      <ExportReportScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />,
    );
    expect(r.getByText('CSV')).toBeTruthy();
    expect(r.getByText('JSON')).toBeTruthy();
  });

  it('renders section toggles', async () => {
    const r = await render(
      <ExportReportScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />,
    );
    expect(r.getByText('exportReport.snapshots')).toBeTruthy();
    expect(r.getByText('exportReport.earnings')).toBeTruthy();
    expect(r.getByText('exportReport.poolStats')).toBeTruthy();
    expect(r.getByText('exportReport.health')).toBeTruthy();
  });

  it('renders export button', async () => {
    const r = await render(
      <ExportReportScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />,
    );
    expect(r.getByText('exportReport.exportButton')).toBeTruthy();
  });

  it('shows preview section', async () => {
    const r = await render(
      <ExportReportScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />,
    );
    expect(r.getByText('exportReport.preview')).toBeTruthy();
  });

  it('calls reportCSV and downloadReport on export', async () => {
    const r = await render(
      <ExportReportScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />,
    );
    await act(async () => {
      fireEvent.press(r.getByText('exportReport.exportButton'));
    });
    await waitFor(
      () => {
        expect(reportCSV).toHaveBeenCalled();
        expect(downloadReport).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
  });

  it('switches to JSON format', async () => {
    const r = await render(
      <ExportReportScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />,
    );
    await act(async () => {
      fireEvent.press(r.getByText('JSON'));
    });
    await act(async () => {
      fireEvent.press(r.getByText('exportReport.exportButton'));
    });
    await waitFor(
      () => {
        expect(reportJSON).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
  });
});
