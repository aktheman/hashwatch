import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert.alert = jest.fn();
  RN.Share.share = jest.fn().mockResolvedValue({ action: 'sharedAction' });
  return RN;
});

jest.mock('../src/store/subscription', () => {
  const store = { isPro: true, tier: 'pro', maxMiners: 999, loading: false, initialized: true };
  const useStore = (sel?: (s: typeof store) => unknown) => (sel ? sel(store) : store);
  return { useSubscriptionStore: useStore };
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

jest.mock('../src/utils/pdfExport', () => ({
  generateMinerReport: jest.fn().mockResolvedValue({ uri: 'test.pdf' }),
}));

import { ExportReportScreen } from '../src/screens/ExportReportScreen';
import { reportCSV, reportJSON, downloadReport } from '../src/utils/reportExport';
import { generateMinerReport } from '../src/utils/pdfExport';

const renderScreen = () =>
  render(<ExportReportScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />);

describe('ExportReportScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSnapshots.mockResolvedValue([]);
  });

  it('renders the title', async () => {
    const r = await renderScreen();
    expect(r.getByText('exportReport.title')).toBeTruthy();
  });

  it('renders date range presets', async () => {
    const r = await renderScreen();
    expect(r.getByText('exportReport.last24h')).toBeTruthy();
    expect(r.getByText('exportReport.last7d')).toBeTruthy();
    expect(r.getByText('exportReport.last30d')).toBeTruthy();
  });

  it('shows all miners by default', async () => {
    const r = await renderScreen();
    expect(r.getByText('exportReport.allMiners')).toBeTruthy();
  });

  it('renders format selector', async () => {
    const r = await renderScreen();
    expect(r.getByText('CSV')).toBeTruthy();
    expect(r.getByText('JSON')).toBeTruthy();
    expect(r.getByText('PDF')).toBeTruthy();
  });

  it('renders section toggles', async () => {
    const r = await renderScreen();
    expect(r.getByText('exportReport.snapshots')).toBeTruthy();
    expect(r.getByText('exportReport.earnings')).toBeTruthy();
    expect(r.getByText('exportReport.poolStats')).toBeTruthy();
    expect(r.getByText('exportReport.health')).toBeTruthy();
  });

  it('renders export button', async () => {
    const r = await renderScreen();
    expect(r.getByText('exportReport.exportButton')).toBeTruthy();
  });

  it('shows preview section', async () => {
    const r = await renderScreen();
    expect(r.getByText('exportReport.preview')).toBeTruthy();
  });

  it('previews miners with online status', async () => {
    const r = await renderScreen();
    expect(r.getByText('TestMiner · 192.168.1.1 · common.online')).toBeTruthy();
    expect(r.getByText('MinerTwo · 192.168.1.2 · common.offline')).toBeTruthy();
  });

  it('calls reportCSV and downloadReport on export', async () => {
    const r = await renderScreen();
    await fireEvent.press(r.getByText('exportReport.exportButton'));
    await waitFor(
      () => {
        expect(reportCSV).toHaveBeenCalled();
        expect(downloadReport).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
  });

  it('fetches snapshots for every miner on export', async () => {
    const r = await renderScreen();
    await fireEvent.press(r.getByText('exportReport.exportButton'));
    await waitFor(
      () => {
        expect(mockGetSnapshots).toHaveBeenCalledWith('m1', 10000);
        expect(mockGetSnapshots).toHaveBeenCalledWith('m2', 10000);
      },
      { timeout: 5000 },
    );
  });

  it('passes the selected date preset into the report options', async () => {
    const r = await renderScreen();
    await fireEvent.press(r.getByLabelText('exportReport.last24h'));
    await fireEvent.press(r.getByLabelText('exportReport.exportButton'));
    await waitFor(
      () => {
        expect(reportCSV).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
    const options = (reportCSV as jest.Mock).mock.calls[0][2];
    const now = Date.now();
    expect(Math.abs(options.dateRange.from - (now - 24 * 60 * 60 * 1000))).toBeLessThan(10000);
    expect(Math.abs(options.dateRange.to - now)).toBeLessThan(10000);
  });

  it('passes toggled section options into the report', async () => {
    const r = await renderScreen();
    await fireEvent(r.getByLabelText('Toggle earnings'), 'valueChange', true);
    await fireEvent(r.getByLabelText('Toggle health'), 'valueChange', true);
    await fireEvent.press(r.getByLabelText('exportReport.exportButton'));
    await waitFor(
      () => {
        expect(reportCSV).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
    const options = (reportCSV as jest.Mock).mock.calls[0][2];
    expect(options.includeSnapshots).toBe(true);
    expect(options.includeEarnings).toBe(true);
    expect(options.includePoolStats).toBe(true);
    expect(options.includeHealth).toBe(true);
  });

  it('deselects all and exports only the selected miner', async () => {
    const r = await renderScreen();
    await fireEvent(r.getByLabelText('Select all miners'), 'valueChange', false);
    expect(r.getByLabelText('MinerTwo not selected')).toBeTruthy();
    await fireEvent.press(r.getByLabelText('MinerTwo not selected'));
    expect(r.getByLabelText('MinerTwo selected')).toBeTruthy();
    await fireEvent.press(r.getByLabelText('exportReport.exportButton'));
    await waitFor(
      () => {
        expect(reportCSV).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
    const options = (reportCSV as jest.Mock).mock.calls[0][2];
    expect(options.minerIds).toEqual(['m2']);
  });

  it('switches to JSON format', async () => {
    const r = await renderScreen();
    await fireEvent.press(r.getByText('JSON'));
    await fireEvent.press(r.getByText('exportReport.exportButton'));
    await waitFor(
      () => {
        expect(reportJSON).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
    expect(downloadReport).toHaveBeenCalledWith(
      expect.objectContaining({ mock: true }),
      expect.stringMatching(/\.json$/),
      'application/json',
    );
  });

  it('includes snapshots in the CSV export', async () => {
    mockGetSnapshots.mockImplementation((minerId: string) =>
      minerId === 'm1'
        ? Promise.resolve([
            {
              minerId: 'm1',
              timestamp: Date.now(),
              hashRate: 500,
              hashRateUnit: 'GH/s',
              temperature: 50,
              voltage: 1200,
              current: 3,
              power: 12,
              sharesAccepted: 100,
              sharesRejected: 2,
              uptimeSeconds: 3600,
              frequency: 550,
              fanSpeed: 50,
              fanRpm: 3000,
              coreVoltage: 1200,
            },
          ])
        : Promise.resolve([]),
    );
    const r = await renderScreen();
    await fireEvent.press(r.getByLabelText('exportReport.exportButton'));
    await waitFor(
      () => {
        expect(reportCSV).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
    expect((reportCSV as jest.Mock).mock.calls[0][1]).toHaveLength(1);
    expect(downloadReport).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/\.csv$/),
      'text/csv',
    );
  });

  it('shows error alert when CSV export throws', async () => {
    (reportCSV as jest.Mock).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const r = await renderScreen();
    await fireEvent.press(r.getByLabelText('exportReport.exportButton'));
    await waitFor(
      () => {
        expect(Alert.alert).toHaveBeenCalledWith('exportReport.exportError', '');
      },
      { timeout: 5000 },
    );
  });

  it('generates a PDF report and downloads it', async () => {
    const r = await renderScreen();
    await fireEvent.press(r.getByLabelText('PDF'));
    await fireEvent.press(r.getByLabelText('exportReport.generate'));
    await waitFor(
      () => {
        expect(generateMinerReport).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith('exportReport.reportGenerated', '');
      },
      { timeout: 5000 },
    );
    expect(generateMinerReport).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1' }),
      [],
      expect.anything(),
      expect.any(String),
      expect.any(String),
    );
    expect(r.getByText('exportReport.avgHashrate')).toBeTruthy();
    expect(r.getAllByText('0.0 H/s')).toHaveLength(2);
    expect(r.getByText('0.0°C')).toBeTruthy();
    expect(r.getByText('0h')).toBeTruthy();
    expect(r.getByText('N/A')).toBeTruthy();
    await fireEvent.press(r.getByLabelText('exportReport.download'));
    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith({
        message: 'test.pdf',
        title: 'HashWatch Report',
      });
    });
  });

  it('alerts when generating a PDF with no miner selected', async () => {
    const r = await renderScreen();
    await fireEvent(r.getByLabelText('Select all miners'), 'valueChange', false);
    await fireEvent.press(r.getByLabelText('PDF'));
    await fireEvent.press(r.getByLabelText('exportReport.generate'));
    await waitFor(
      () => {
        expect(Alert.alert).toHaveBeenCalledWith('common.error', 'exportReport.noData');
      },
      { timeout: 5000 },
    );
    expect(generateMinerReport).not.toHaveBeenCalled();
  });
});
