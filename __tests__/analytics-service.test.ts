import { captureEvent } from '../src/services/errorTracking';
import { capture } from '../src/services/posthog';
import {
  trackMinerAdded,
  trackMinerRemoved,
  trackThemeChanged,
  trackPoolSwitched,
  trackFirmwareFlash,
  trackAlertTriggered,
  trackScreenView,
  trackHealthScore,
} from '../src/services/analytics';

jest.mock('../src/services/errorTracking', () => ({
  captureEvent: jest.fn(),
}));

jest.mock('../src/services/posthog', () => ({
  capture: jest.fn(),
}));

const mockCaptureEvent = captureEvent as jest.Mock;
const mockCapture = capture as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('trackMinerAdded', () => {
  it('calls captureEvent and capture with the miner_added event', () => {
    trackMinerAdded('pool1');

    expect(mockCaptureEvent).toHaveBeenCalledWith('miner_added', { pool: 'pool1' });
    expect(mockCapture).toHaveBeenCalledWith('miner_added', { pool: 'pool1' });
  });
});

describe('trackMinerRemoved', () => {
  it('calls captureEvent and capture with the miner_removed event', () => {
    trackMinerRemoved();

    expect(mockCaptureEvent).toHaveBeenCalledWith('miner_removed');
    expect(mockCapture).toHaveBeenCalledWith('miner_removed');
  });
});

describe('trackThemeChanged', () => {
  it('forwards the theme to both trackers', () => {
    trackThemeChanged('neon');

    expect(mockCaptureEvent).toHaveBeenCalledWith('theme_changed', { theme: 'neon' });
    expect(mockCapture).toHaveBeenCalledWith('theme_changed', { theme: 'neon' });
  });
});

describe('trackPoolSwitched', () => {
  it('forwards from/to values to both trackers', () => {
    trackPoolSwitched('solopool', 'ocean');

    expect(mockCaptureEvent).toHaveBeenCalledWith('pool_switched', {
      from: 'solopool',
      to: 'ocean',
    });
    expect(mockCapture).toHaveBeenCalledWith('pool_switched', {
      from: 'solopool',
      to: 'ocean',
    });
  });
});

describe('trackFirmwareFlash', () => {
  it('forwards version and success to both trackers', () => {
    trackFirmwareFlash('1.2.3', false);

    expect(mockCaptureEvent).toHaveBeenCalledWith('firmware_flash', {
      version: '1.2.3',
      success: false,
    });
    expect(mockCapture).toHaveBeenCalledWith('firmware_flash', {
      version: '1.2.3',
      success: false,
    });
  });

  it('forwards a successful flash', () => {
    trackFirmwareFlash('2.0.0', true);

    expect(mockCaptureEvent).toHaveBeenCalledWith('firmware_flash', {
      version: '2.0.0',
      success: true,
    });
  });
});

describe('trackAlertTriggered', () => {
  it('forwards type and minerId to both trackers', () => {
    trackAlertTriggered('offline', 'miner-7');

    expect(mockCaptureEvent).toHaveBeenCalledWith('alert_triggered', {
      type: 'offline',
      minerId: 'miner-7',
    });
    expect(mockCapture).toHaveBeenCalledWith('alert_triggered', {
      type: 'offline',
      minerId: 'miner-7',
    });
  });
});

describe('trackScreenView', () => {
  it('forwards the screen name to both trackers', () => {
    trackScreenView('Dashboard');

    expect(mockCaptureEvent).toHaveBeenCalledWith('screen_view', { screen: 'Dashboard' });
    expect(mockCapture).toHaveBeenCalledWith('screen_view', { screen: 'Dashboard' });
  });
});

describe('trackHealthScore', () => {
  it('forwards score and grade to both trackers', () => {
    trackHealthScore(87, 'B');

    expect(mockCaptureEvent).toHaveBeenCalledWith('health_score', { score: 87, grade: 'B' });
    expect(mockCapture).toHaveBeenCalledWith('health_score', { score: 87, grade: 'B' });
  });
});

describe('all tracking helpers', () => {
  it('never throws when the underlying trackers succeed', () => {
    expect(() => {
      trackMinerAdded('p');
      trackMinerRemoved();
      trackThemeChanged('dark');
      trackPoolSwitched('a', 'b');
      trackFirmwareFlash('1.0', true);
      trackAlertTriggered('hot', 'm1');
      trackScreenView('Settings');
      trackHealthScore(100, 'A');
    }).not.toThrow();
  });

  it('always emits through both error tracking and posthog', () => {
    trackMinerAdded('p');
    trackMinerRemoved();
    trackThemeChanged('dark');
    trackPoolSwitched('a', 'b');
    trackFirmwareFlash('1.0', true);
    trackAlertTriggered('hot', 'm1');
    trackScreenView('Settings');
    trackHealthScore(100, 'A');

    expect(mockCaptureEvent).toHaveBeenCalledTimes(8);
    expect(mockCapture).toHaveBeenCalledTimes(8);
  });
});
