import { Alert } from 'react-native';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  DashboardCustomizer,
  SectionKey,
  DEFAULT_VISIBLE,
} from '../src/components/DashboardCustomizer';

let localStorageStore: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: jest.fn((k: string) => localStorageStore[k] ?? null),
    setItem: jest.fn((k: string, v: string) => {
      localStorageStore[k] = v;
    }),
    removeItem: jest.fn((k: string) => {
      delete localStorageStore[k];
    }),
    clear: jest.fn(() => {
      localStorageStore = {};
    }),
  },
  writable: true,
  configurable: true,
});

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    primary: '#6C63FF',
    danger: '#EF4444',
  }),
}));

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  visibleSections: { ...DEFAULT_VISIBLE },
  onToggle: jest.fn(),
  onReset: jest.fn(),
  onApplyPreset: jest.fn(),
  kioskMode: false,
  onToggleKiosk: jest.fn(),
};

let mockAlert: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  localStorageStore = {};
  mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

function withQueries(result: ReturnType<typeof render>) {
  return result;
}

describe('DashboardCustomizer', () => {
  it('returns null when not visible', async () => {
    const { container } = await render(<DashboardCustomizer {...defaultProps} visible={false} />);
    expect(container.children.length).toBe(0);
  });

  it('renders modal when visible', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    expect(await r.findByText('Customize Dashboard', {}, { timeout: 15000 })).toBeTruthy();
    expect(r.getByText('Done')).toBeTruthy();
  }, 20000);

  it('renders all section toggles', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    expect(r.getByText('Earnings Card')).toBeTruthy();
    expect(r.getByText('BTC / Network Ticker')).toBeTruthy();
    expect(r.getByText('World Map')).toBeTruthy();
    expect(r.getByText('Map Legend')).toBeTruthy();
    expect(r.getByText('Pool Stats')).toBeTruthy();
    expect(r.getByText('Metric Tiles')).toBeTruthy();
    expect(r.getByText('Wallet / Group Filters')).toBeTruthy();
    expect(r.getByText('Sort Controls')).toBeTruthy();
    expect(r.getByText('Profitability')).toBeTruthy();
  });

  it('renders kiosk mode switch', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    expect(r.getByText('📺 Kiosk Mode')).toBeTruthy();
  });

  it('calls onToggle when section is toggled', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    const switches = r.getAllByRole('switch');
    fireEvent(switches[0], 'valueChange', false);
    expect(defaultProps.onToggle).toHaveBeenCalledWith('earnings');
  });

  it('calls onToggleKiosk when kiosk switch is toggled', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    const switches = r.getAllByRole('switch');
    fireEvent(switches[switches.length - 1], 'valueChange', true);
    expect(defaultProps.onToggleKiosk).toHaveBeenCalledWith(true);
  });

  it('calls onClose when Done is pressed', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    fireEvent.press(r.getByText('Done'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows Save button for presets', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    expect(r.getByText('Save')).toBeTruthy();
  });

  it('shows alert when saving preset with empty name', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    fireEvent.press(r.getByText('Save'));
    expect(mockAlert).toHaveBeenCalledWith('Name required', 'Enter a name for this preset.');
  });

  it('saves a new preset with name', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByPlaceholderText('Preset name...')).toBeTruthy();
    });
    const input = r.getByPlaceholderText('Preset name...');
    await fireEvent.changeText(input, 'My Preset');
    await fireEvent.press(r.getByText('Save'));
    expect(mockAlert).toHaveBeenCalledWith('Saved', 'Preset "My Preset" saved.');
    const saved = JSON.parse(localStorageStore['hashwatch_dashboard_presets']);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('My Preset');
  });

  it('overwrites existing preset with same name', async () => {
    localStorageStore['hashwatch_dashboard_presets'] = JSON.stringify([
      { name: 'My Preset', sections: { ...DEFAULT_VISIBLE, earnings: false } },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByPlaceholderText('Preset name...')).toBeTruthy();
    });
    const input = r.getByPlaceholderText('Preset name...');
    await fireEvent.changeText(input, 'My Preset');
    await fireEvent.press(r.getByText('Save'));

    const saved = JSON.parse(localStorageStore['hashwatch_dashboard_presets']);
    expect(saved).toHaveLength(1);
    expect(saved[0].sections.earnings).toBe(true);
  });

  it('shows Load Preset button with count', async () => {
    localStorageStore['hashwatch_dashboard_presets'] = JSON.stringify([
      { name: 'Preset 1', sections: DEFAULT_VISIBLE },
      { name: 'Preset 2', sections: DEFAULT_VISIBLE },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('Load Preset (2)')).toBeTruthy();
    });
  });

  it('shows presets list when Load Preset is pressed', async () => {
    localStorageStore['hashwatch_dashboard_presets'] = JSON.stringify([
      { name: 'My Preset', sections: DEFAULT_VISIBLE },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('Load Preset (1)')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('Load Preset (1)'));
    await waitFor(() => {
      expect(r.getByText('My Preset')).toBeTruthy();
    });
  });

  it('hides presets list on second press', async () => {
    localStorageStore['hashwatch_dashboard_presets'] = JSON.stringify([
      { name: 'My Preset', sections: DEFAULT_VISIBLE },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('Load Preset (1)')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('Load Preset (1)'));
    await waitFor(() => {
      expect(r.getByText('Hide Presets')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('Hide Presets'));
    await waitFor(() => {
      expect(r.getByText('Load Preset (1)')).toBeTruthy();
    });
  });

  it('loads a preset on press', async () => {
    const presetSections = { ...DEFAULT_VISIBLE, earnings: false };
    localStorageStore['hashwatch_dashboard_presets'] = JSON.stringify([
      { name: 'My Preset', sections: presetSections },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('Load Preset (1)')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('Load Preset (1)'));
    await waitFor(() => {
      expect(r.getByText('My Preset')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('My Preset'));
    expect(defaultProps.onApplyPreset).toHaveBeenCalledWith(presetSections);
  });

  it('deletes a preset', async () => {
    localStorageStore['hashwatch_dashboard_presets'] = JSON.stringify([
      { name: 'Preset 1', sections: DEFAULT_VISIBLE },
      { name: 'Preset 2', sections: DEFAULT_VISIBLE },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('Load Preset (2)')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('Load Preset (2)'));

    await waitFor(() => {
      expect(r.getAllByText('✕')).toHaveLength(2);
    });
    const deleteButtons = r.getAllByText('✕');
    expect(deleteButtons).toHaveLength(2);
    await fireEvent.press(deleteButtons[0]);

    const saved = JSON.parse(localStorageStore['hashwatch_dashboard_presets']);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Preset 2');
  });

  it('shows empty state when no presets', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('Load Preset (0)')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('Load Preset (0)'));
    await waitFor(() => {
      expect(r.getByText('No saved presets yet.')).toBeTruthy();
    });
  });

  it('shows Reset to Defaults button', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('Customize Dashboard')).toBeTruthy();
    });
    await waitFor(() => {
      expect(r.getByText('Reset to Defaults')).toBeTruthy();
    });
  });

  it('shows alert on Reset press', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('Load Preset (0)')).toBeTruthy();
    });
    fireEvent.press(r.getByText('Reset to Defaults'));
    expect(mockAlert).toHaveBeenCalledWith(
      'Reset to Defaults',
      'This will reset all dashboard sections to their default visibility.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Reset' }),
      ]),
    );
  });

  it('handles corrupt localStorage gracefully', async () => {
    localStorageStore['hashwatch_dashboard_presets'] = 'not json';

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('Load Preset (0)')).toBeTruthy();
    });
  });
});
