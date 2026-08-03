import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { EnergyScreen } from '../src/screens/EnergyScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    text: '#e2e0ff',
    textDim: '#9694b0',
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    border: '#2a2940',
    surfaceLight: '#1a1a24',
    textMuted: '#6b6990',
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
}));

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
});

const pressAlertAction = async (index = 1) => {
  const calls = alertSpy.mock.calls;
  const buttons = calls[calls.length - 1][2] as { onPress?: () => void }[];
  await act(async () => {
    await buttons[index].onPress?.();
  });
};

describe('EnergyScreen', () => {
  it('renders the screen title', async () => {
    await render(<EnergyScreen />);
    expect(screen.getByText('energy.title')).toBeTruthy();
  });

  it('shows default energy sources', async () => {
    await render(<EnergyScreen />);
    expect(screen.getByText('Grid Power')).toBeTruthy();
    expect(screen.getByText('Solar Panels')).toBeTruthy();
  });

  it('shows energy stats card', async () => {
    await render(<EnergyScreen />);
    expect(screen.getByText('energy.totalKwh')).toBeTruthy();
    expect(screen.getByText('energy.renewablePercent')).toBeTruthy();
    expect(screen.getByText('energy.gridPercent')).toBeTruthy();
    expect(screen.getByText('energy.carbonSaved')).toBeTruthy();
    expect(screen.getByText('energy.estimatedCost')).toBeTruthy();
  });

  it('shows source max watts', async () => {
    await render(<EnergyScreen />);
    expect(screen.getByText('5000W')).toBeTruthy();
    expect(screen.getByText('3000W')).toBeTruthy();
  });

  it('shows add source button', async () => {
    await render(<EnergyScreen />);
    expect(screen.getByLabelText('Add energy source')).toBeTruthy();
  });

  it('opens add source modal', async () => {
    await render(<EnergyScreen />);
    await fireEvent.press(screen.getByLabelText('Add energy source'));
    await waitFor(() => {
      expect(screen.getByText('energy.addSource')).toBeTruthy();
    });
  });

  it('cancels add source modal', async () => {
    await render(<EnergyScreen />);
    await fireEvent.press(screen.getByLabelText('Add energy source'));
    await waitFor(() => {
      expect(screen.getByText('energy.addSource')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('common.cancel'));
    expect(screen.queryByText('energy.addSource')).toBeNull();
  });

  it('validates add source with empty fields', async () => {
    await render(<EnergyScreen />);
    await fireEvent.press(screen.getByLabelText('Add energy source'));
    await fireEvent.press(screen.getByText('common.add'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'energy.sourceValidation');
    });
  });

  it('adds a new energy source', async () => {
    await render(<EnergyScreen />);
    await fireEvent.press(screen.getByLabelText('Add energy source'));
    await fireEvent.changeText(screen.getByLabelText('energy.sourceName'), 'Wind Turbine');
    await fireEvent.press(screen.getByLabelText('energy.wind'));
    await fireEvent.changeText(screen.getByLabelText('energy.maxWatts'), '1500');
    await fireEvent.press(screen.getByText('common.add'));
    expect(screen.getByLabelText('Energy source Wind Turbine')).toBeTruthy();
    expect(screen.getByText('1500W')).toBeTruthy();
    expect(screen.queryByText('energy.addSource')).toBeNull();
  });

  it('opens add reading modal', async () => {
    await render(<EnergyScreen />);
    await fireEvent.press(screen.getByLabelText('Log power reading'));
    await waitFor(() => {
      expect(screen.getAllByText('energy.addReading').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('validates add reading with empty watts', async () => {
    await render(<EnergyScreen />);
    await fireEvent.press(screen.getByLabelText('Log power reading'));
    await fireEvent.press(screen.getByText('common.save'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'energy.readingValidation');
    });
  });

  it('logs a grid reading and updates stats', async () => {
    await render(<EnergyScreen />);
    await fireEvent.press(screen.getByLabelText('Log power reading'));
    await fireEvent.changeText(screen.getByLabelText('energy.watts'), '1000');
    await fireEvent.press(screen.getByText('common.save'));
    expect(screen.getByText('Recent Readings')).toBeTruthy();
    expect(screen.getByText('0.017 kWh')).toBeTruthy();
    expect(screen.getByText('Renewable: 0%')).toBeTruthy();
    expect(screen.getByText('Grid: 100%')).toBeTruthy();
  });

  it('logs a solar reading and shows renewable share', async () => {
    await render(<EnergyScreen />);
    await fireEvent.press(screen.getByLabelText('Log power reading'));
    await fireEvent.press(screen.getByText('☀️ Solar Panels'));
    await fireEvent.changeText(screen.getByLabelText('energy.watts'), '1000');
    await fireEvent.press(screen.getByText('common.save'));
    expect(screen.getByText('Renewable: 100%')).toBeTruthy();
    expect(screen.getByText('Grid: 0%')).toBeTruthy();
  });

  it('removes a source via long press', async () => {
    await render(<EnergyScreen />);
    await fireEvent(screen.getByLabelText('Energy source Grid Power'), 'longPress');
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'energy.removeSource',
        'energy.removeConfirm',
        expect.anything(),
      );
    });
    await pressAlertAction(1);
    expect(screen.queryByLabelText('Energy source Grid Power')).toBeNull();
    expect(screen.getByLabelText('Energy source Solar Panels')).toBeTruthy();
  });

  it('selects and deselects a source card', async () => {
    await render(<EnergyScreen />);
    await fireEvent.press(screen.getByLabelText('Energy source Solar Panels'));
    await fireEvent.press(screen.getByLabelText('Energy source Solar Panels'));
    expect(screen.getByLabelText('Energy source Solar Panels')).toBeTruthy();
  });
});
