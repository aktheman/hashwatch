import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { DashboardBuilderScreen } from '../src/screens/DashboardBuilderScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a24',
    border: '#2a2940',
    text: '#e2e0ff',
    textDim: '#9694b0',
    textMuted: '#6b6990',
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    accent: '#6c63ff',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
    glow: '#6c63ff',
    glowSuccess: '#22c55e',
    glowDanger: '#ef4444',
    glowWarning: '#f59e0b',
  }),
}));

jest.mock('../src/utils/haptics', () => ({
  light: jest.fn(),
  medium: jest.fn(),
  heavy: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  selection: jest.fn(),
  selectionToggleHaptic: jest.fn(),
  destructiveActionHaptic: jest.fn(),
}));

const WIDGET_NAMES = [
  'Total Hashrate',
  'Temperature Overview',
  'Power Usage',
  'Earnings Estimate',
  'Fleet Health',
  'Hashrate Trend',
  'Alert Summary',
  'Pool Distribution',
  'Map Widget',
  'Miner List',
];

function captureAlertButtons() {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons?: any[]) => {
    (alertSpy as any).__buttons = buttons ?? [];
  });
  return alertSpy;
}

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('renders layout controls', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('dashboardBuilder.layout')).toBeTruthy();
  expect(screen.getByText('dashboardBuilder.columns')).toBeTruthy();
  expect(screen.getByText('dashboardBuilder.compact')).toBeTruthy();
  expect(screen.getByText('1')).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
});

it('renders the widget library with all widgets', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('dashboardBuilder.widgetLibrary')).toBeTruthy();
  for (const name of WIDGET_NAMES) {
    expect(screen.getByText(name)).toBeTruthy();
  }
});

it('renders the live preview with default widget data', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('dashboardBuilder.preview')).toBeTruthy();
  expect(screen.getByText('dashboardBuilder.previewDesc')).toBeTruthy();
  expect(screen.getByText('14.2 TH/s')).toBeTruthy();
  expect(screen.getByText('32 miners online')).toBeTruthy();
  expect(screen.getByText('Avg: 62°C')).toBeTruthy();
  expect(screen.getByText('5.4 kW total')).toBeTruthy();
});

it('renders reset and save buttons', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('dashboardBuilder.reset')).toBeTruthy();
  expect(screen.getByText('dashboardBuilder.save')).toBeTruthy();
});

it('defaults to two columns', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByLabelText('2 column layout').props.accessibilityState.checked).toBe(true);
  expect(screen.getByLabelText('1 column layout').props.accessibilityState.checked).toBe(false);
});

it('switches to one column layout', async () => {
  await render(<DashboardBuilderScreen />);
  await fireEvent.press(screen.getByLabelText('1 column layout'));
  expect(screen.getByLabelText('1 column layout').props.accessibilityState.checked).toBe(true);
  expect(screen.getByLabelText('2 column layout').props.accessibilityState.checked).toBe(false);
});

it('toggles compact mode', async () => {
  await render(<DashboardBuilderScreen />);
  const compactSwitch = screen.getByLabelText('Toggle compact mode');
  expect(compactSwitch.props.value).toBe(false);
  await fireEvent(compactSwitch, 'onValueChange', true);
  expect(screen.getByLabelText('Toggle compact mode').props.value).toBe(true);
});

it('toggles a widget off and removes it from the preview', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('14.2 TH/s')).toBeTruthy();
  await fireEvent(screen.getByLabelText('Toggle Total Hashrate'), 'onValueChange', false);
  await waitFor(() => {
    expect(screen.queryByText('14.2 TH/s')).toBeNull();
  });
  expect(screen.getByLabelText('Toggle Total Hashrate').props.value).toBe(false);
});

it('removes a widget from the preview via its remove button', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByText('14.2 TH/s')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Remove Total Hashrate'));
  await waitFor(() => {
    expect(screen.queryByText('14.2 TH/s')).toBeNull();
  });
  expect(screen.getByLabelText('Toggle Total Hashrate').props.value).toBe(false);
});

it('disables save until a change is made', async () => {
  await render(<DashboardBuilderScreen />);
  expect(screen.getByLabelText('Save dashboard layout').props.accessibilityState.disabled).toBe(
    true,
  );
  await fireEvent(screen.getByLabelText('Toggle compact mode'), 'onValueChange', true);
  expect(screen.getByLabelText('Save dashboard layout').props.accessibilityState.disabled).toBe(
    false,
  );
});

it('saves the layout and shows a confirmation alert', async () => {
  const alertSpy = captureAlertButtons();
  const { success } = require('../src/utils/haptics');
  await render(<DashboardBuilderScreen />);
  await fireEvent(screen.getByLabelText('Toggle compact mode'), 'onValueChange', true);
  await fireEvent.press(screen.getByLabelText('Save dashboard layout'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('dashboardBuilder.saved', 'dashboardBuilder.saved');
  });
  expect(success).toHaveBeenCalled();
  expect(screen.getByLabelText('Save dashboard layout').props.accessibilityState.disabled).toBe(
    true,
  );
});

it('resets the layout back to defaults after confirmation', async () => {
  const alertSpy = captureAlertButtons();
  const { destructiveActionHaptic } = require('../src/utils/haptics');
  await render(<DashboardBuilderScreen />);
  await fireEvent(screen.getByLabelText('Toggle Total Hashrate'), 'onValueChange', false);
  await waitFor(() => expect(screen.queryByText('14.2 TH/s')).toBeNull());
  await fireEvent.press(screen.getByLabelText('Reset to defaults'));
  await actReset(alertSpy);
  await waitFor(() => {
    expect(screen.getByText('14.2 TH/s')).toBeTruthy();
  });
  expect(destructiveActionHaptic).toHaveBeenCalled();
  expect(screen.getByLabelText('Save dashboard layout').props.accessibilityState.disabled).toBe(
    true,
  );
});

it('shows the empty preview when every enabled widget is disabled', async () => {
  await render(<DashboardBuilderScreen />);
  for (const name of WIDGET_NAMES.slice(0, 7)) {
    await fireEvent(screen.getByLabelText(`Toggle ${name}`), 'onValueChange', false);
  }
  await waitFor(() => {
    expect(screen.getByText('dashboardBuilder.empty')).toBeTruthy();
  });
  expect(screen.queryByText('14.2 TH/s')).toBeNull();
});

it('renders a single enabled widget full width', async () => {
  await render(<DashboardBuilderScreen />);
  for (const name of WIDGET_NAMES.slice(1, 7)) {
    await fireEvent(screen.getByLabelText(`Toggle ${name}`), 'onValueChange', false);
  }
  await waitFor(() => {
    expect(screen.getByText('14.2 TH/s')).toBeTruthy();
  });
  expect(screen.queryByText('Avg: 62°C')).toBeNull();
});

async function actReset(alertSpy: any) {
  const { act } = require('@testing-library/react-native');
  await act(async () => {
    alertSpy.__buttons[1].onPress();
  });
}
