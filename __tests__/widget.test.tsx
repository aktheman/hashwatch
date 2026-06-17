describe('updateWidget', () => {
  it('does nothing on non-Android', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({
        Platform: { OS: 'ios' },
        NativeModules: {
          HashWatchWidgetModule: { updateWidget: jest.fn() },
        },
      }));
      const { updateWidget } = require('../src/services/widget');
      const NativeModules = require('react-native').NativeModules;
      updateWidget('100TH', 1, 2, '50000');
      expect(NativeModules.HashWatchWidgetModule.updateWidget).not.toHaveBeenCalled();
    });
  });

  it('calls native module on Android', () => {
    jest.isolateModules(() => {
      const updateWidgetMock = jest.fn();
      jest.doMock('react-native', () => ({
        Platform: { OS: 'android' },
        NativeModules: {
          HashWatchWidgetModule: { updateWidget: updateWidgetMock },
        },
      }));
      const { updateWidget } = require('../src/services/widget');
      updateWidget('100TH', 1, 2, '50000');
      expect(updateWidgetMock).toHaveBeenCalledWith('100TH', 1, 2, '50000');
    });
  });

  it('handles missing native module gracefully', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({
        Platform: { OS: 'android' },
        NativeModules: {},
      }));
      const { updateWidget } = require('../src/services/widget');
      expect(() => updateWidget('100TH', 1, 2, '50000')).not.toThrow();
    });
  });
});
