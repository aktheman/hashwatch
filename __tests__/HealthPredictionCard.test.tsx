import React from 'react';
import { render, cleanup } from '@testing-library/react-native';
import { HealthPredictionCard } from '../src/components/HealthPredictionCard';
import { HealthPrediction } from '../src/utils/healthPredictions';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('../src/theme', () => {
  const actual = jest.requireActual('../src/theme');
  return {
    ...actual,
    useTheme: () => ({
      bg: '#0A0A1A',
      surface: '#13132B',
      border: '#1E1E42',
      text: '#FFFFFF',
      textDim: '#8B8FA3',
      textMuted: '#5C5F7A',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#06B6D4',
      primary: '#6C63FF',
    }),
  };
});

beforeEach(() => {
  cleanup();
});

const lowRisk: HealthPrediction = {
  minerId: 'm1',
  riskLevel: 'low',
  predictions: [],
  overallScore: 95,
  recommendedActions: [],
};

const highRisk: HealthPrediction = {
  minerId: 'm2',
  riskLevel: 'high',
  predictions: [
    {
      type: 'thermal_throttle',
      probability: 0.65,
      timeframe: '24h',
      evidence: 'Temp 78°C and rising',
    },
    {
      type: 'fan_failure',
      probability: 0.82,
      timeframe: '7d',
      evidence: 'Fan speed 95% but RPM only 500',
    },
  ],
  overallScore: 35,
  recommendedActions: ['cleanFanVents', 'checkThermalPaste', 'reduceOverclock'],
};

describe('HealthPredictionCard', () => {
  it('renders low risk state with no data message', async () => {
    const r = await render(<HealthPredictionCard prediction={lowRisk} />);
    expect(r.getByText('healthPrediction.title')).toBeTruthy();
    expect(r.getByText('healthPrediction.noData')).toBeTruthy();
    expect(r.getByText('healthPrediction.riskLevel.low')).toBeTruthy();
  });

  it('renders risk level badge', async () => {
    const r = await render(<HealthPredictionCard prediction={highRisk} />);
    expect(r.getByText('healthPrediction.riskLevel.high')).toBeTruthy();
  });

  it('renders predictions with probabilities', async () => {
    const r = await render(<HealthPredictionCard prediction={highRisk} />);
    expect(r.getByText('healthPrediction.thermalThrottle')).toBeTruthy();
    expect(r.getByText('healthPrediction.fanFailure')).toBeTruthy();
    expect(r.getByText('65%')).toBeTruthy();
    expect(r.getByText('82%')).toBeTruthy();
  });

  it('renders recommended actions', async () => {
    const r = await render(<HealthPredictionCard prediction={highRisk} />);
    expect(r.getByText('healthPrediction.recommendedActions')).toBeTruthy();
    expect(r.getByText('healthPrediction.cleanFanVents')).toBeTruthy();
    expect(r.getByText('healthPrediction.checkThermalPaste')).toBeTruthy();
    expect(r.getByText('healthPrediction.reduceOverclock')).toBeTruthy();
  });

  it('renders evidence text', async () => {
    const r = await render(<HealthPredictionCard prediction={highRisk} />);
    expect(r.getByText('Temp 78°C and rising')).toBeTruthy();
  });

  it('renders critical risk level', async () => {
    const critical: HealthPrediction = {
      ...lowRisk,
      riskLevel: 'critical',
      overallScore: 5,
      predictions: [
        {
          type: 'power_anomaly',
          probability: 0.9,
          timeframe: '30d',
          evidence: 'Efficiency degraded 40%',
        },
      ],
      recommendedActions: ['checkPowerSupply'],
    };
    const r = await render(<HealthPredictionCard prediction={critical} />);
    expect(r.getByText('healthPrediction.riskLevel.critical')).toBeTruthy();
    expect(r.getByText('healthPrediction.powerAnomaly')).toBeTruthy();
    expect(r.getByText('healthPrediction.checkPowerSupply')).toBeTruthy();
  });

  it('renders medium risk', async () => {
    const medium: HealthPrediction = {
      ...lowRisk,
      riskLevel: 'medium',
      overallScore: 70,
      predictions: [
        {
          type: 'hashrate_decline',
          probability: 0.3,
          timeframe: '30d',
          evidence: 'Hashrate dropped 15%',
        },
      ],
      recommendedActions: ['verifyPoolConnection'],
    };
    const r = await render(<HealthPredictionCard prediction={medium} />);
    expect(r.getByText('healthPrediction.riskLevel.medium')).toBeTruthy();
    expect(r.getByText('healthPrediction.hashrateDecline')).toBeTruthy();
  });
});
