import { Alert } from 'react-native';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  DashboardCustomizer,
  SectionKey,
  DEFAULT_VISIBLE,
} from '../src/components/DashboardCustomizer';

let mockDbStore: Record<string, string> = {};
jest.mock('../src/db/database', () => ({
  getSetting: jest.fn((key: string) => Promise.resolve(mockDbStore[key] ?? null)),
  setSetting: jest.fn((key: string, value: string) => {
    mockDbStore[key] = value;
    return Promise.resolve();
  }),
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
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
  mockDbStore = {};
  mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('DashboardCustomizer', () => {
  it('returns null when not visible', async () => {
    const { container } = await render(<DashboardCustomizer {...defaultProps} visible={false} />);
    expect(container.children.length).toBe(0);
  });

  it('renders modal when visible', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    expect(await r.findByText('dashboardCustomizer.title', {}, { timeout: 15000 })).toBeTruthy();
    expect(r.getByText('dashboardCustomizer.done')).toBeTruthy();
  }, 20000);

  it('renders all section toggles', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    expect(r.getByText('dashboardCustomizer.section.earnings')).toBeTruthy();
    expect(r.getByText('dashboardCustomizer.section.ticker')).toBeTruthy();
    expect(r.getByText('dashboardCustomizer.section.map')).toBeTruthy();
    expect(r.getByText('dashboardCustomizer.section.legend')).toBeTruthy();
    expect(r.getByText('dashboardCustomizer.section.pools')).toBeTruthy();
    expect(r.getByText('dashboardCustomizer.section.metrics')).toBeTruthy();
    expect(r.getByText('dashboardCustomizer.section.filters')).toBeTruthy();
    expect(r.getByText('dashboardCustomizer.section.sort')).toBeTruthy();
    expect(r.getByText('dashboardCustomizer.section.profitability')).toBeTruthy();
  });

  it('renders kiosk mode switch', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    expect(r.getByText('📺 dashboardCustomizer.kioskMode')).toBeTruthy();
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
    fireEvent.press(r.getByText('dashboardCustomizer.done'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows Save button for presets', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    expect(r.getByText('dashboardCustomizer.save')).toBeTruthy();
  });

  it('shows alert when saving preset with empty name', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    fireEvent.press(r.getByText('dashboardCustomizer.save'));
    expect(mockAlert).toHaveBeenCalledWith(
      'dashboardCustomizer.nameRequired',
      'dashboardCustomizer.nameRequiredBody',
    );
  });

  it('saves a new preset with name', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByPlaceholderText('dashboardCustomizer.presetPlaceholder')).toBeTruthy();
    });
    const input = r.getByPlaceholderText('dashboardCustomizer.presetPlaceholder');
    await fireEvent.changeText(input, 'My Preset');
    await fireEvent.press(r.getByText('dashboardCustomizer.save'));
    expect(mockAlert).toHaveBeenCalledWith(
      'dashboardCustomizer.saved',
      'dashboardCustomizer.savedBody',
    );
    const saved = JSON.parse(mockDbStore['dashboard_presets']);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('My Preset');
  });

  it('overwrites existing preset with same name', async () => {
    mockDbStore['dashboard_presets'] = JSON.stringify([
      { name: 'My Preset', sections: { ...DEFAULT_VISIBLE, earnings: false } },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByPlaceholderText('dashboardCustomizer.presetPlaceholder')).toBeTruthy();
    });
    const input = r.getByPlaceholderText('dashboardCustomizer.presetPlaceholder');
    await fireEvent.changeText(input, 'My Preset');
    await fireEvent.press(r.getByText('dashboardCustomizer.save'));

    const saved = JSON.parse(mockDbStore['dashboard_presets']);
    expect(saved).toHaveLength(1);
    expect(saved[0].sections.earnings).toBe(true);
  });

  it('shows Load Preset button with count', async () => {
    mockDbStore['dashboard_presets'] = JSON.stringify([
      { name: 'Preset 1', sections: DEFAULT_VISIBLE },
      { name: 'Preset 2', sections: DEFAULT_VISIBLE },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.loadPreset')).toBeTruthy();
    });
  });

  it('shows presets list when Load Preset is pressed', async () => {
    mockDbStore['dashboard_presets'] = JSON.stringify([
      { name: 'My Preset', sections: DEFAULT_VISIBLE },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.loadPreset')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('dashboardCustomizer.loadPreset'));
    await waitFor(() => {
      expect(r.getByText('My Preset')).toBeTruthy();
    });
  });

  it('hides presets list on second press', async () => {
    mockDbStore['dashboard_presets'] = JSON.stringify([
      { name: 'My Preset', sections: DEFAULT_VISIBLE },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.loadPreset')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('dashboardCustomizer.loadPreset'));
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.hidePresets')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('dashboardCustomizer.hidePresets'));
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.loadPreset')).toBeTruthy();
    });
  });

  it('loads a preset on press', async () => {
    const presetSections = { ...DEFAULT_VISIBLE, earnings: false };
    mockDbStore['dashboard_presets'] = JSON.stringify([
      { name: 'My Preset', sections: presetSections },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.loadPreset')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('dashboardCustomizer.loadPreset'));
    await waitFor(() => {
      expect(r.getByText('My Preset')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('My Preset'));
    expect(defaultProps.onApplyPreset).toHaveBeenCalledWith(presetSections);
  });

  it('deletes a preset', async () => {
    mockDbStore['dashboard_presets'] = JSON.stringify([
      { name: 'Preset 1', sections: DEFAULT_VISIBLE },
      { name: 'Preset 2', sections: DEFAULT_VISIBLE },
    ]);

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.loadPreset')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('dashboardCustomizer.loadPreset'));

    await waitFor(() => {
      expect(r.getAllByText('✕')).toHaveLength(2);
    });
    const deleteButtons = r.getAllByText('✕');
    expect(deleteButtons).toHaveLength(2);
    await fireEvent.press(deleteButtons[0]);

    const saved = JSON.parse(mockDbStore['dashboard_presets']);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Preset 2');
  });

  it('shows empty state when no presets', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.loadPreset')).toBeTruthy();
    });
    await fireEvent.press(r.getByText('dashboardCustomizer.loadPreset'));
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.noPresets')).toBeTruthy();
    });
  });

  it('shows Reset to Defaults button', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.title')).toBeTruthy();
    });
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.resetToDefaults')).toBeTruthy();
    });
  });

  it('shows alert on Reset press', async () => {
    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.loadPreset')).toBeTruthy();
    });
    fireEvent.press(r.getByText('dashboardCustomizer.resetToDefaults'));
    expect(mockAlert).toHaveBeenCalledWith(
      'dashboardCustomizer.resetTitle',
      'dashboardCustomizer.resetBody',
      expect.arrayContaining([
        expect.objectContaining({ text: 'common.cancel' }),
        expect.objectContaining({ text: 'dashboardCustomizer.reset' }),
      ]),
    );
  });

  it('handles corrupt preset data gracefully', async () => {
    mockDbStore['dashboard_presets'] = 'not json';

    const r = await render(<DashboardCustomizer {...defaultProps} />);
    await waitFor(() => {
      expect(r.getByText('dashboardCustomizer.loadPreset')).toBeTruthy();
    });
  });
});
