jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: Record<string, unknown>) => obj.web || obj.default },
  Alert: { alert: jest.fn() },
  NativeModules: {},
}));

const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();

jest.mock('../src/db/database', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
  setSetting: (...args: unknown[]) => mockSetSetting(...args),
}));

import {
  getDefaultLayout,
  loadLayout,
  saveLayout,
  ALL_SECTIONS,
  LAYOUT_KEY,
} from '../src/components/DashboardCustomizer';

const origSections = [...ALL_SECTIONS];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DashboardLayout', () => {
  describe('getDefaultLayout', () => {
    it('returns layout with all sections visible', () => {
      const layout = getDefaultLayout();
      expect(layout.sections).toHaveLength(origSections.length);
      expect(layout.sections.every((s) => s.visible)).toBe(true);
      expect(layout.columns).toBe(1);
      expect(layout.compactMode).toBe(false);
    });

    it('returns ordered sections', () => {
      const layout = getDefaultLayout();
      layout.sections.forEach((s, i) => {
        expect(s.order).toBe(i);
      });
    });
  });

  describe('loadLayout', () => {
    it('returns default layout when no saved layout', async () => {
      mockGetSetting.mockResolvedValue(null);

      const layout = await loadLayout();

      expect(layout.sections).toHaveLength(origSections.length);
      expect(mockGetSetting).toHaveBeenCalledWith(LAYOUT_KEY);
    });

    it('parses saved layout with custom visibility', async () => {
      mockGetSetting.mockResolvedValue(
        JSON.stringify({
          columns: 2,
          compactMode: true,
          sections: origSections.map((id, i) => ({
            id,
            visible: i === 0 ? false : true,
            order: origSections.length - 1 - i,
            size: 'normal',
          })),
        }),
      );

      const layout = await loadLayout();

      expect(layout.columns).toBe(2);
      expect(layout.compactMode).toBe(true);
    });

    it('merges saved sections with defaults', async () => {
      mockGetSetting.mockResolvedValue(
        JSON.stringify({
          columns: 1,
          compactMode: false,
          sections: [{ id: 'earnings', visible: false, order: 0, size: 'normal' }],
        }),
      );

      const layout = await loadLayout();

      expect(layout.sections.length).toBeGreaterThanOrEqual(origSections.length);
      const earnings = layout.sections.find((s) => s.id === 'earnings');
      expect(earnings?.visible).toBe(false);
    });

    it('handles invalid size by falling back to normal', async () => {
      mockGetSetting.mockResolvedValue(
        JSON.stringify({
          columns: 1,
          compactMode: false,
          sections: origSections.map((id) => ({ id, visible: true, order: 0, size: 'tiny' })),
        }),
      );

      const layout = await loadLayout();

      layout.sections.forEach((s) => {
        expect(['compact', 'normal', 'expanded']).toContain(s.size);
      });
    });

    it('returns default layout on JSON parse error', async () => {
      mockGetSetting.mockResolvedValue('invalid-json');

      const layout = await loadLayout();

      expect(layout.sections).toHaveLength(origSections.length);
    });

    it('returns default layout on thrown error', async () => {
      mockGetSetting.mockRejectedValue(new Error('db error'));

      const layout = await loadLayout();

      expect(layout.sections).toHaveLength(origSections.length);
    });

    it('sorts sections by order', async () => {
      mockGetSetting.mockResolvedValue(
        JSON.stringify({
          columns: 1,
          compactMode: false,
          sections: origSections.map((id, i) => ({
            id,
            visible: true,
            order: origSections.length - 1 - i,
            size: 'normal',
          })),
        }),
      );

      const layout = await loadLayout();

      for (let i = 1; i < layout.sections.length; i++) {
        expect(layout.sections[i].order).toBeGreaterThanOrEqual(layout.sections[i - 1].order);
      }
    });

    it('handles column value not 1 or 2', async () => {
      mockGetSetting.mockResolvedValue(
        JSON.stringify({
          columns: 3,
          compactMode: true,
          sections: origSections.map((id) => ({ id, visible: true, order: 0, size: 'normal' })),
        }),
      );

      const layout = await loadLayout();

      expect(layout.columns).toBe(1);
    });
  });

  describe('saveLayout', () => {
    it('persists layout to settings', async () => {
      const layout = getDefaultLayout();
      mockSetSetting.mockResolvedValue(undefined);

      await saveLayout(layout);

      expect(mockSetSetting).toHaveBeenCalledWith(LAYOUT_KEY, JSON.stringify(layout));
    });

    it('handles save error gracefully', async () => {
      mockSetSetting.mockRejectedValue(new Error('save failed'));

      await expect(saveLayout(getDefaultLayout())).resolves.toBeUndefined();
    });
  });
});
