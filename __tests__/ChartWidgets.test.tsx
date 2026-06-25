import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { Sparkline, MiniBarChart, Donut, Gauge, Timeline } from '../src/components/ChartWidgets';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  function MockSvgComponent(props: any) {
    return React.createElement(View, props);
  }
  MockSvgComponent.displayName = 'MockSvg';
  return {
    __esModule: true,
    default: MockSvgComponent,
    Svg: MockSvgComponent,
    Polygon: MockSvgComponent,
    Polyline: MockSvgComponent,
    Circle: MockSvgComponent,
    Defs: MockSvgComponent,
    Stop: MockSvgComponent,
    LinearGradient: MockSvgComponent,
  };
});

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0A0A1A',
    surface: '#13132B',
    surfaceLight: '#1A1A3E',
    border: '#1E1E42',
    primary: '#6C63FF',
    primaryLight: '#8B85FF',
    primaryDark: '#4F46E5',
    accent: '#3B82F6',
    success: '#10B981',
    successLight: '#34D399',
    danger: '#EF4444',
    dangerLight: '#F87171',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    info: '#06B6D4',
    text: '#FFFFFF',
    textDim: '#8B8FA3',
    textMuted: '#5C5F7A',
    glow: 'rgba(108, 99, 255, 0.3)',
    glowSuccess: 'rgba(16, 185, 129, 0.3)',
    glowDanger: 'rgba(239, 68, 68, 0.3)',
    glowWarning: 'rgba(245, 158, 11, 0.3)',
  }),
}));

describe('Sparkline', () => {
  it('renders with default props', async () => {
    await render(<Sparkline data={[1, 2, 3]} />);
  });

  it('renders with empty data', async () => {
    await render(<Sparkline data={[]} />);
  });

  it('renders with single value', async () => {
    await render(<Sparkline data={[42]} />);
  });

  it('renders with custom width and height', async () => {
    await render(<Sparkline data={[10, 20, 30]} width={200} height={80} />);
  });

  it('renders with custom color', async () => {
    await render(<Sparkline data={[5, 15, 25]} color="#FF0000" />);
  });

  it('renders with fill color', async () => {
    await render(<Sparkline data={[0, 100, 50]} fill="#ff0000" />);
  });

  it('renders with all custom props', async () => {
    await render(
      <Sparkline
        data={[1, 2, 3, 4, 5]}
        width={250}
        height={100}
        color="#00FF00"
        fill="#00FF0055"
      />,
    );
  });

  it('renders with flat data', async () => {
    await render(<Sparkline data={[100, 100, 100]} />);
  });

  it('renders with negative values', async () => {
    await render(<Sparkline data={[-5, 0, 5]} />);
  });
});

describe('MiniBarChart', () => {
  it('renders with default props', async () => {
    await render(<MiniBarChart data={[10, 20, 30]} />);
  });

  it('renders with empty data', async () => {
    await render(<MiniBarChart data={[]} />);
  });

  it('renders with single value', async () => {
    await render(<MiniBarChart data={[50]} />);
  });

  it('renders with custom color', async () => {
    await render(<MiniBarChart data={[5, 15, 25]} color="#FF0000" />);
  });

  it('renders with custom width and height', async () => {
    await render(<MiniBarChart data={[10, 20, 30, 40]} width={200} height={60} />);
  });

  it('renders with zero data', async () => {
    await render(<MiniBarChart data={[0, 0, 0]} />);
  });

  it('renders with large values', async () => {
    await render(<MiniBarChart data={[1000, 5000, 10000]} />);
  });
});

describe('Donut', () => {
  it('renders with default props', async () => {
    await render(<Donut value={50} />);
  });

  it('renders at 0%', async () => {
    await render(<Donut value={0} />);
  });

  it('renders at 100%', async () => {
    await render(<Donut value={100} />);
  });

  it('renders with value exceeding max', async () => {
    await render(<Donut value={150} />);
  });

  it('renders with custom max', async () => {
    await render(<Donut value={75} max={200} />);
  });

  it('renders with custom size', async () => {
    await render(<Donut value={33} size={150} />);
  });

  it('renders with custom color', async () => {
    await render(<Donut value={80} color="#FF8800" />);
  });

  it('renders with all custom props', async () => {
    await render(<Donut value={60} max={120} color="#00FF00" size={80} />);
  });
});

describe('Gauge', () => {
  it('renders with default props', async () => {
    await render(<Gauge value={50} />);
  });

  it('renders at 0', async () => {
    await render(<Gauge value={0} />);
  });

  it('renders at max value', async () => {
    await render(<Gauge value={100} />);
  });

  it('renders with value exceeding max', async () => {
    await render(<Gauge value={200} />);
  });

  it('renders with custom width and height', async () => {
    await render(<Gauge value={75} width={200} height={120} />);
  });

  it('renders with custom color', async () => {
    await render(<Gauge value={30} color="#FF0000" />);
  });

  it('renders with custom max', async () => {
    await render(<Gauge value={25} max={50} />);
  });
});

describe('Timeline', () => {
  it('renders with data', async () => {
    await render(
      <Timeline
        data={[
          { month: 'Jan', value: 10 },
          { month: 'Feb', value: 20 },
        ]}
      />,
    );
    expect(screen.getByText('Jan')).toBeTruthy();
    expect(screen.getByText('Feb')).toBeTruthy();
  });

  it('renders with custom colors', async () => {
    await render(
      <Timeline
        data={[
          { month: 'Q1', value: 25, color: '#FF0000' },
          { month: 'Q2', value: 50, color: '#00FF00' },
          { month: 'Q3', value: 75, color: '#0000FF' },
        ]}
      />,
    );
    expect(screen.getByText('Q1')).toBeTruthy();
    expect(screen.getByText('Q2')).toBeTruthy();
    expect(screen.getByText('Q3')).toBeTruthy();
  });

  it('renders with empty data', async () => {
    await render(<Timeline data={[]} />);
  });

  it('renders with single item', async () => {
    await render(<Timeline data={[{ month: 'Jan', value: 50, color: '#6C63FF' }]} />);
    expect(screen.getByText('Jan')).toBeTruthy();
  });

  it('renders percentage labels', async () => {
    await render(
      <Timeline
        data={[
          { month: 'Jan', value: 10 },
          { month: 'Feb', value: 90 },
        ]}
      />,
    );
    expect(screen.getByText('10%')).toBeTruthy();
    expect(screen.getByText('90%')).toBeTruthy();
  });
});
