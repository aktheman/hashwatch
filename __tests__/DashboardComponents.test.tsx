import React from 'react';
import { render, fireEvent, cleanup, screen, waitFor } from '@testing-library/react-native';
import { MetricTile, ProfitabilityCard } from '../src/components/DashboardComponents';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mk = (name: string) => {
    const C = (props: any) => React.createElement(View, props);
    C.displayName = name;
    return C;
  };
  const SvgComponent = mk('Svg');
  return {
    __esModule: true,
    default: SvgComponent,
    Svg: SvgComponent,
    Polyline: mk('Polyline'),
    Polygon: mk('Polygon'),
    Circle: mk('Circle'),
    Defs: mk('Defs'),
    Stop: mk('Stop'),
    LinearGradient: mk('LinearGradient'),
  };
});

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
    glow: 'rgba(108,99,255,0.15)',
  }),
}));

jest.mock('../src/utils/hashrate', () => ({
  getBTCPrice: jest.fn().mockReturnValue(100000),
  getBTCPriceHistory: jest.fn().mockReturnValue([95000, 98000, 100000]),
  getNetworkHashrate: jest.fn().mockReturnValue(750_000_000_000_000_000_000),
  estimateBTCPerDay: jest.fn((hps: number) => (hps / 750_000_000_000_000_000_000) * 144 * 3.125),
  formatBTC: jest.fn((btc: number) => `${btc.toFixed(8)}`),
  formatHashrateValue: jest.fn((h: number) => `${(h / 1e15).toFixed(1)} EH/s`),
}));

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/store/poolAnalytics', () => ({
  usePoolAnalyticsStore: jest.fn((sel: (s: any) => unknown) =>
    sel({ stats: [], config: [], loading: false, error: null }),
  ),
}));

const minerA: any = {
  id: 'm1',
  name: 'Miner A',
  ip: '10.0.0.1',
  port: 80,
  isOnline: true,
  status: { hashRate: 1, hashRateUnit: 'TH/s', power: 10, temperature: 55 },
};

const minerB: any = {
  id: 'm2',
  name: 'Miner B',
  ip: '10.0.0.2',
  port: 80,
  isOnline: true,
  status: { hashRate: 2, hashRateUnit: 'TH/s', power: 20, temperature: 60 },
};

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  const hr = jest.requireMock('../src/utils/hashrate');
  (hr.getBTCPrice as jest.Mock).mockReturnValue(100000);
  (hr.getBTCPriceHistory as jest.Mock).mockReturnValue([95000, 98000, 100000]);
  (hr.estimateBTCPerDay as jest.Mock).mockImplementation(
    (hps: number) => (hps / 750_000_000_000_000_000_000) * 144 * 3.125,
  );
  const db = jest.requireMock('../src/db/database');
  (db.getSetting as jest.Mock).mockResolvedValue(null);
  const pool = jest.requireMock('../src/store/poolAnalytics');
  (pool.usePoolAnalyticsStore as jest.Mock).mockImplementation((sel: (s: any) => unknown) =>
    sel({ stats: [], config: [], loading: false, error: null }),
  );
});

describe('MetricTile', () => {
  it('renders title and value', async () => {
    const tree = await render(<MetricTile title="Hashrate" value="500" />);
    expect(tree.getByText('Hashrate')).toBeTruthy();
    expect(tree.getByText('500')).toBeTruthy();
  });

  it('renders unit', async () => {
    const tree = await render(<MetricTile title="Temp" value="65" unit="°C" />);
    expect(tree.getByText('°C')).toBeTruthy();
  });

  it('renders label', async () => {
    const tree = await render(
      <MetricTile title="Power" value="12.5" unit="W" label="Total power draw" />,
    );
    expect(tree.getByText('Total power draw')).toBeTruthy();
  });

  it('renders trend badge', async () => {
    const tree = await render(<MetricTile title="Hashrate" value="500" trend="+12%" />);
    expect(tree.getByText('+12%')).toBeTruthy();
  });

  it('does not render trend badge without trend', async () => {
    await render(<MetricTile title="Hashrate" value="500" />);
    expect(screen.queryByText(/\+/)).toBeNull();
  });

  it('renders sparkline chart when chart prop is sparkline', async () => {
    const tree = await render(
      <MetricTile title="Hashrate" value="500" chart="sparkline" chartData={[1, 2, 3]} />,
    );
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders bars chart when chart prop is bars', async () => {
    const tree = await render(
      <MetricTile title="Block Luck" value="85%" chart="bars" chartData={[30, 50, 85]} />,
    );
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders donut chart when chart prop is donut', async () => {
    const tree = await render(
      <MetricTile title="Uptime" value="99.9%" chart="donut" chartValue={99.9} />,
    );
    expect(tree.toJSON()).toBeTruthy();
    expect(screen.getAllByText('99.9%').length).toBeGreaterThanOrEqual(1);
  });

  it('renders gauge chart when chart prop is gauge', async () => {
    const tree = await render(
      <MetricTile title="Load" value="65%" chart="gauge" chartValue={65} />,
    );
    expect(tree.toJSON()).toBeTruthy();
    expect(screen.getAllByText('65°').length).toBeGreaterThanOrEqual(1);
  });

  it('renders chart prop without chart data', async () => {
    const tree = await render(<MetricTile title="Test" value="X" chart="sparkline" />);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders with different sizes', async () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const tree = await render(<MetricTile title="Test" value="X" size={size} />);
      expect(tree.toJSON()).toBeTruthy();
    }
  });

  it('applies accent color via prop', async () => {
    const tree = await render(<MetricTile title="Test" value="X" accent="danger" />);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders every accent color', async () => {
    for (const accent of ['primary', 'success', 'warning', 'danger', 'info'] as const) {
      const tree = await render(<MetricTile title="Test" value="X" accent={accent} />);
      expect(tree.toJSON()).toBeTruthy();
    }
  });

  it('calls onPress when the tile is pressed', async () => {
    const onPress = jest.fn();
    await render(<MetricTile title="Hashrate" value="500" onPress={onPress} />);
    await fireEvent.press(screen.getByText('Hashrate'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ProfitabilityCard', () => {
  it('renders BTC price with sparkline', async () => {
    const miners = [
      {
        id: 'm1',
        name: 'Miner A',
        ip: '10.0.0.1',
        port: 80,
        isOnline: true,
        status: { hashRate: 1, hashRateUnit: 'TH/s', power: 10, temperature: 55 },
      },
    ] as any[];
    const tree = await render(<ProfitabilityCard miners={miners} />);
    expect(tree.getByText('dashboardExtra.profitabilityTitle')).toBeTruthy();
    expect(tree.getByText('dashboardExtra.btcLabel')).toBeTruthy();
  });

  it('shows trend arrow up when price increased', async () => {
    const miners = [] as any[];
    const tree = await render(<ProfitabilityCard miners={miners} />);
    expect(tree.getByText(/▲/)).toBeTruthy();
  });

  it('shows downward trend when price decreased', async () => {
    const hr = jest.requireMock('../src/utils/hashrate');
    (hr.getBTCPriceHistory as jest.Mock).mockReturnValue([100000, 95000, 90000]);
    await render(<ProfitabilityCard miners={[]} />);
    expect(screen.getByText(/▼/)).toBeTruthy();
    expect(screen.getByText(/10\.0%/)).toBeTruthy();
  });

  it('shows trend percentage', async () => {
    const miners = [] as any[];
    const tree = await render(<ProfitabilityCard miners={miners} />);
    expect(tree.getByText(/5\.3%/)).toBeTruthy();
  });

  it('shows Total /day for empty miners', async () => {
    const tree = await render(<ProfitabilityCard miners={[]} />);
    expect(tree.getByText('dashboardExtra.total')).toBeTruthy();
  });

  it('renders per-miner earnings and weekly/monthly totals', async () => {
    await render(<ProfitabilityCard miners={[minerA, minerB]} />);
    expect(screen.getByText(/0\.00000060/)).toBeTruthy();
    expect(screen.getByText(/0\.00000120/)).toBeTruthy();
    expect(screen.getByText(/0\.00000180/)).toBeTruthy();
    expect(screen.getByText(/0\.00001260/)).toBeTruthy();
    expect(screen.getByText(/0\.00005400/)).toBeTruthy();
    expect(screen.getByText(/~\$0\.06/)).toBeTruthy();
    expect(screen.getByText(/~\$0\.12/)).toBeTruthy();
    expect(screen.getAllByText(/~\$0\.18/).length).toBeGreaterThanOrEqual(1);
  });

  it('hides USD amounts when BTC price is zero', async () => {
    const hr = jest.requireMock('../src/utils/hashrate');
    (hr.getBTCPrice as jest.Mock).mockReturnValue(0);
    await render(<ProfitabilityCard miners={[minerA]} />);
    expect(screen.queryByText(/~\$/)).toBeNull();
  });

  it('renders BTC price sparkline when history has 4+ points', async () => {
    const hr = jest.requireMock('../src/utils/hashrate');
    (hr.getBTCPriceHistory as jest.Mock).mockReturnValue([90000, 92000, 94000, 96000]);
    const tree = await render(<ProfitabilityCard miners={[]} />);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('shows net per day, pool fee, and break-even sections with power cost', async () => {
    await render(<ProfitabilityCard miners={[minerA]} powerCost={0.2} />);
    expect(screen.getByText('dashboardExtra.netPerDay')).toBeTruthy();
    expect(screen.getByText('dashboardExtra.poolFeeNet')).toBeTruthy();
    expect(screen.getByText('dashboardExtra.breakEvenAnalysis')).toBeTruthy();
  });

  it('loads saved hardware cost into the break-even input', async () => {
    const db = jest.requireMock('../src/db/database');
    (db.getSetting as jest.Mock).mockResolvedValue('1500');
    await render(<ProfitabilityCard miners={[minerA]} powerCost={0.2} />);
    await waitFor(() => {
      expect(screen.getByLabelText('dashboardExtra.hardwareInvestment')).toBeTruthy();
    });
    const input = screen.getByLabelText('dashboardExtra.hardwareInvestment');
    expect(input.props.value).toBe('1500');
  });

  it('saves hardware cost on blur', async () => {
    const db = jest.requireMock('../src/db/database');
    await render(<ProfitabilityCard miners={[minerA]} powerCost={0.2} />);
    const input = screen.getByLabelText('dashboardExtra.hardwareInvestment');
    await fireEvent.changeText(input, '2000');
    await fireEvent(input, 'blur');
    expect(db.setSetting).toHaveBeenCalledWith('hardware_cost', '2000');
  });

  it('clears hardware cost when input is invalid on blur', async () => {
    const db = jest.requireMock('../src/db/database');
    await render(<ProfitabilityCard miners={[minerA]} powerCost={0.2} />);
    const input = screen.getByLabelText('dashboardExtra.hardwareInvestment');
    await fireEvent.changeText(input, 'abc');
    await fireEvent(input, 'blur');
    expect(db.setSetting).not.toHaveBeenCalled();
    expect(screen.getByLabelText('dashboardExtra.hardwareInvestment').props.value).toBe('');
  });

  it('shows break-even days when profitable', async () => {
    const db = jest.requireMock('../src/db/database');
    (db.getSetting as jest.Mock).mockResolvedValue('10');
    await render(<ProfitabilityCard miners={[minerA]} powerCost={0.01} />);
    await waitFor(() => {
      expect(screen.getByText('dashboardExtra.breakEvenDays')).toBeTruthy();
    });
  });

  it('shows no break-even message when unprofitable', async () => {
    const db = jest.requireMock('../src/db/database');
    (db.getSetting as jest.Mock).mockResolvedValue('1000');
    await render(<ProfitabilityCard miners={[]} powerCost={5} />);
    await waitFor(() => {
      expect(screen.getByText('dashboardExtra.noBreakEven')).toBeTruthy();
    });
  });

  it('renders pool comparison stats when pool stats exist', async () => {
    const pool = jest.requireMock('../src/store/poolAnalytics');
    (pool.usePoolAnalyticsStore as jest.Mock).mockImplementation((sel: (s: any) => unknown) =>
      sel({
        stats: [{ provider: 'PoolA', btcEarned: 0.5 }],
        config: [],
        loading: false,
        error: null,
      }),
    );
    await render(<ProfitabilityCard miners={[minerA]} />);
    expect(screen.getByText('dashboardExtra.estVsPool')).toBeTruthy();
    expect(screen.getByText(/vsEstimated/)).toBeTruthy();
  });
});
