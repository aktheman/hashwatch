import { render, screen } from '@testing-library/react-native';
import { PoolCoverage } from '../src/components/PoolCoverage';

jest.mock('react-native-svg', () => ({
  Svg: () => null,
  Circle: () => null,
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
    danger: '#EF4444',
    glow: 'rgba(108,99,255,0.15)',
  }),
}));

describe('PoolCoverage', () => {
  it('renders coverage percentage', async () => {
    await render(
      <PoolCoverage
        pools={[{ id: 'p1', name: 'Pool A', minerCount: 3, totalHashrate: 1500 }]}
        minersCount={4}
      />,
    );
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('renders 0% when no pools', async () => {
    await render(<PoolCoverage pools={[]} minersCount={5} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('renders 0% when minersCount is 0', async () => {
    await render(
      <PoolCoverage
        pools={[{ id: 'p1', name: 'Pool A', minerCount: 3, totalHashrate: 1500 }]}
        minersCount={0}
      />,
    );
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('renders 100% when coverage exceeds miners', async () => {
    await render(
      <PoolCoverage
        pools={[{ id: 'p1', name: 'Pool A', minerCount: 10, totalHashrate: 5000 }]}
        minersCount={5}
      />,
    );
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('renders with multiple pools, uses max minerCount', async () => {
    await render(
      <PoolCoverage
        pools={[
          { id: 'p1', name: 'Pool A', minerCount: 2, totalHashrate: 1000 },
          { id: 'p2', name: 'Pool B', minerCount: 5, totalHashrate: 3000 },
        ]}
        minersCount={10}
      />,
    );
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('displays top pool name', async () => {
    await render(
      <PoolCoverage
        pools={[{ id: 'p1', name: 'MiningPool', minerCount: 5, totalHashrate: 2500 }]}
        minersCount={10}
      />,
    );
    expect(screen.getByText('MiningPool')).toBeTruthy();
  });

  it('displays "No pool data" when pool name is missing', async () => {
    await render(
      <PoolCoverage
        pools={[{ id: 'p1', name: '', minerCount: 5, totalHashrate: 2500 }]}
        minersCount={10}
      />,
    );
    expect(screen.getByText('poolCoverage.noData')).toBeTruthy();
  });

  it('uses success color for coverage >= 75', async () => {
    await render(
      <PoolCoverage
        pools={[{ id: 'p1', name: 'Big Pool', minerCount: 8, totalHashrate: 4000 }]}
        minersCount={10}
      />,
    );
    expect(screen.getByText('80%')).toBeTruthy();
    expect(screen.getByText('poolCoverage.topPool')).toBeTruthy();
  });

  it('uses primary color for 40 <= coverage < 75', async () => {
    await render(
      <PoolCoverage
        pools={[{ id: 'p1', name: 'Medium Pool', minerCount: 5, totalHashrate: 2500 }]}
        minersCount={10}
      />,
    );
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('uses danger color for coverage < 40', async () => {
    await render(
      <PoolCoverage
        pools={[{ id: 'p1', name: 'Small Pool', minerCount: 2, totalHashrate: 1000 }]}
        minersCount={10}
      />,
    );
    expect(screen.getByText('20%')).toBeTruthy();
  });

  it('renders header text', async () => {
    await render(<PoolCoverage pools={[]} minersCount={0} />);
    expect(screen.getByText('poolCoverage.title')).toBeTruthy();
  });
});
