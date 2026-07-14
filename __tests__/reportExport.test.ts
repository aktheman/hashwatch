jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return 'web';
    },
    select: (obj: Record<string, unknown>) => obj.web || obj.default,
  },
  Share: { share: jest.fn() },
}));

import { Miner, MinerSnapshot } from '../src/types';
import { reportCSV, reportJSON, downloadReport } from '../src/utils/reportExport';

const sampleMiner: Miner = {
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
    vrTemp: 45,
    voltage: 1200,
    current: 3.5,
    power: 12,
    sharesAccepted: 100,
    sharesRejected: 2,
    bestDiff: '1.5M',
    bestSessionDiff: '800K',
    uptimeSeconds: 7200,
    coreVoltage: 1200,
    frequency: 400,
    fanSpeed: 50,
    fanRpm: 3000,
    pool: 'stratum.solomining.io',
    poolPort: 3333,
    poolUser: 'user.worker',
    poolResponseTime: 100,
  },
};

const sampleMiner2: Miner = {
  id: 'm2',
  name: 'MinerTwo',
  ip: '192.168.1.2',
  port: 80,
  isOnline: false,
  group: 'Office',
  status: {
    hashRate: 0,
    hashRateUnit: 'GH/s',
    temperature: 0,
    vrTemp: 0,
    voltage: 0,
    current: 0,
    power: 0,
    sharesAccepted: 50,
    sharesRejected: 5,
    bestDiff: '100K',
    bestSessionDiff: '50K',
    uptimeSeconds: 0,
    coreVoltage: 0,
    frequency: 0,
    fanSpeed: 0,
    fanRpm: 0,
    pool: 'stratum.example.com',
    poolPort: 3333,
    poolUser: 'user2',
    poolResponseTime: 200,
  },
};

const sampleSnapshot: MinerSnapshot = {
  minerId: 'm1',
  timestamp: Date.now() - 1000,
  hashRate: 500,
  hashRateUnit: 'GH/s',
  temperature: 50,
  voltage: 1200,
  current: 3.5,
  power: 12,
  sharesAccepted: 100,
  sharesRejected: 2,
  uptimeSeconds: 7200,
  frequency: 400,
};

const sampleSnapshotOld: MinerSnapshot = {
  minerId: 'm1',
  timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
  hashRate: 400,
  hashRateUnit: 'GH/s',
  temperature: 55,
  voltage: 1200,
  current: 3.0,
  power: 10,
  sharesAccepted: 80,
  sharesRejected: 1,
  uptimeSeconds: 3600,
  frequency: 400,
};

describe('reportCSV', () => {
  const baseOptions = {
    format: 'csv' as const,
    dateRange: { from: Date.now() - 7 * 24 * 60 * 60 * 1000, to: Date.now() },
    includeSnapshots: false,
    includeEarnings: false,
    includePoolStats: false,
    includeHealth: false,
  };

  it('generates CSV with correct headers', () => {
    const csv = reportCSV([sampleMiner], [sampleSnapshot], baseOptions);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Miner Name');
    expect(lines[0]).toContain('IP');
    expect(lines[0]).toContain('Group');
    expect(lines[0]).toContain('Online');
    expect(lines[0]).toContain('Hashrate');
    expect(lines[0]).toContain('Temperature');
    expect(lines[0]).toContain('Power');
    expect(lines[0]).toContain('Efficiency (W/TH)');
    expect(lines[0]).toContain('Shares Accepted');
    expect(lines[0]).toContain('Shares Rejected');
    expect(lines[0]).toContain('Accept Rate %');
    expect(lines[0]).toContain('Uptime');
    expect(lines[0]).toContain('Pool');
    expect(lines[0]).toContain('Best Diff');
    expect(lines[0]).toContain('Estimated BTC/Day');
    expect(lines[0]).toContain('Estimated USD/Day');
  });

  it('generates CSV with correct data', () => {
    const csv = reportCSV([sampleMiner], [sampleSnapshot], baseOptions);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('TestMiner');
    expect(lines[1]).toContain('192.168.1.1');
    expect(lines[1]).toContain('Garage');
    expect(lines[1]).toContain('Yes');
  });

  it('filters miners by minerIds', () => {
    const csv = reportCSV([sampleMiner, sampleMiner2], [sampleSnapshot], {
      ...baseOptions,
      minerIds: ['m2'],
    });
    const lines = csv.split('\n');
    expect(lines[1]).toContain('MinerTwo');
    expect(lines.length).toBe(2); // header + 1 row
  });

  it('filters snapshots by date range', () => {
    const csv = reportCSV([sampleMiner], [sampleSnapshot, sampleSnapshotOld], {
      ...baseOptions,
      dateRange: { from: Date.now() - 10000, to: Date.now() },
      includeSnapshots: true,
    });
    expect(csv).toContain('1');
  });

  it('includes snapshot count when includeSnapshots is true', () => {
    const csv = reportCSV([sampleMiner], [sampleSnapshot], {
      ...baseOptions,
      includeSnapshots: true,
    });
    expect(csv).toContain('Snapshot Count');
  });

  it('includes pool stats when includePoolStats is true', () => {
    const csv = reportCSV([sampleMiner], [sampleSnapshot], {
      ...baseOptions,
      includePoolStats: true,
    });
    expect(csv).toContain('Pool Port');
    expect(csv).toContain('Pool User');
  });

  it('includes health when includeHealth is true', () => {
    const csv = reportCSV([sampleMiner], [sampleSnapshot], {
      ...baseOptions,
      includeHealth: true,
    });
    expect(csv).toContain('Fan Speed');
    expect(csv).toContain('Core Voltage');
  });

  it('handles offline miner', () => {
    const csv = reportCSV([sampleMiner2], [], baseOptions);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('No');
    expect(lines[1]).toContain('MinerTwo');
  });

  it('handles empty miners list', () => {
    const csv = reportCSV([], [], baseOptions);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
  });

  it('escapes CSV values with commas', () => {
    const minerWithComma = { ...sampleMiner, name: 'Miner, A' };
    const csv = reportCSV([minerWithComma], [], baseOptions);
    expect(csv).toContain('"Miner, A"');
  });

  it('computes accept rate correctly', () => {
    const csv = reportCSV([sampleMiner], [], baseOptions);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('98.0');
  });
});

describe('reportJSON', () => {
  const baseOptions = {
    format: 'json' as const,
    dateRange: { from: Date.now() - 7 * 24 * 60 * 60 * 1000, to: Date.now() },
    includeSnapshots: false,
    includeEarnings: false,
    includePoolStats: false,
    includeHealth: false,
  };

  it('returns structured JSON report', () => {
    const report = reportJSON([sampleMiner], [sampleSnapshot], baseOptions);
    expect(report).toHaveProperty('generatedAt');
    expect(report).toHaveProperty('dateRange');
    expect(report).toHaveProperty('minerCount', 1);
    expect(report).toHaveProperty('miners');
  });

  it('includes miner details', () => {
    const report = reportJSON([sampleMiner], [sampleSnapshot], baseOptions);
    const miners = report.miners as Record<string, unknown>[];
    expect(miners[0].name).toBe('TestMiner');
    expect(miners[0].ip).toBe('192.168.1.1');
    expect(miners[0].online).toBe(true);
    expect(miners[0].group).toBe('Garage');
  });

  it('includes pool stats when requested', () => {
    const report = reportJSON([sampleMiner], [], {
      ...baseOptions,
      includePoolStats: true,
    });
    const miner = (report.miners as Record<string, unknown>[])[0];
    expect(miner.poolPort).toBe(3333);
    expect(miner.poolUser).toBe('user.worker');
  });

  it('includes health data when requested', () => {
    const report = reportJSON([sampleMiner], [], {
      ...baseOptions,
      includeHealth: true,
    });
    const miner = (report.miners as Record<string, unknown>[])[0];
    expect(miner.fanSpeed).toBe(50);
    expect(miner.coreVoltage).toBe(1200);
  });

  it('includes snapshots when requested', () => {
    const report = reportJSON([sampleMiner], [sampleSnapshot], {
      ...baseOptions,
      includeSnapshots: true,
    });
    const miner = (report.miners as Record<string, unknown>[])[0];
    expect(miner.snapshots).toBeDefined();
    expect((miner.snapshots as unknown[]).length).toBe(1);
  });

  it('filters by minerIds', () => {
    const report = reportJSON([sampleMiner, sampleMiner2], [], {
      ...baseOptions,
      minerIds: ['m1'],
    });
    expect(report.minerCount).toBe(1);
    expect((report.miners as Record<string, unknown>[])[0].name).toBe('TestMiner');
  });

  it('filters snapshots by date range', () => {
    const report = reportJSON([sampleMiner], [sampleSnapshot, sampleSnapshotOld], {
      ...baseOptions,
      dateRange: { from: Date.now() - 10000, to: Date.now() },
      includeSnapshots: true,
    });
    const miner = (report.miners as Record<string, unknown>[])[0];
    expect((miner.snapshots as unknown[]).length).toBe(1);
  });

  it('handles empty miners', () => {
    const report = reportJSON([], [], baseOptions);
    expect(report.minerCount).toBe(0);
    expect(report.miners).toEqual([]);
  });
});

describe('downloadReport', () => {
  let mockPlatform = 'web';

  beforeEach(() => {
    jest.clearAllMocks();
    const click = jest.fn();
    const mockAnchor = { click, href: '', download: '' };
    (globalThis as any).window = {
      document: {
        createElement: jest.fn(() => mockAnchor),
      },
    };
    (globalThis as any).URL = {
      createObjectURL: jest.fn(() => 'blob:url'),
      revokeObjectURL: jest.fn(),
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).URL;
  });

  it('triggers download on web with string content', () => {
    downloadReport('test content', 'test.csv', 'text/csv');
    expect((globalThis as any).URL.createObjectURL).toHaveBeenCalled();
    expect((globalThis as any).window.document.createElement).toHaveBeenCalledWith('a');
  });

  it('triggers download on web with object content', () => {
    downloadReport({ key: 'value' }, 'test.json', 'application/json');
    expect((globalThis as any).URL.createObjectURL).toHaveBeenCalled();
  });
});
