interface WidgetData {
  onlineCount: number;
  totalCount: number;
  totalHashrate: string;
  lastUpdated: number;
}

const DATA: WidgetData = {
  onlineCount: 3,
  totalCount: 4,
  totalHashrate: '1.2 TH/s',
  lastUpdated: 1710000000000,
};

function mockUserDefaults(impl: { set?: jest.Mock; get?: jest.Mock }): void {
  jest.doMock('react-native-userdefaults', () => ({ set: jest.fn(), get: jest.fn(), ...impl }), {
    virtual: true,
  });
}

describe('iosWidget', () => {
  it('updateWidgetData returns early (no throw) when Platform.OS is not ios', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
      const setMock = jest.fn();
      mockUserDefaults({ set: setMock });

      const { updateWidgetData } = require('../src/services/iosWidget');
      expect(() => updateWidgetData(DATA)).not.toThrow();
      expect(setMock).not.toHaveBeenCalled();
    });
  });

  it('updateWidgetData calls userdefaults.set with JSON-stringified data on iOS', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
      const setMock = jest.fn();
      mockUserDefaults({ set: setMock });

      const { updateWidgetData } = require('../src/services/iosWidget');
      updateWidgetData(DATA);

      expect(setMock).toHaveBeenCalledWith(JSON.stringify(DATA), 'hashwatch_widget_data');
    });
  });

  it('updateWidgetData swallows errors thrown inside the try/catch', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
      mockUserDefaults({
        set: jest.fn(() => {
          throw new Error('userdefaults unavailable');
        }),
      });

      const { updateWidgetData } = require('../src/services/iosWidget');
      expect(() => updateWidgetData(DATA)).not.toThrow();
    });
  });

  it('getWidgetData returns null on non-iOS platforms', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
      const getMock = jest.fn();
      mockUserDefaults({ get: getMock });

      const { getWidgetData } = require('../src/services/iosWidget');
      expect(getWidgetData()).toBeNull();
      expect(getMock).not.toHaveBeenCalled();
    });
  });

  it('getWidgetData returns parsed data on iOS', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
      mockUserDefaults({ get: jest.fn(() => JSON.stringify(DATA)) });

      const { getWidgetData } = require('../src/services/iosWidget');
      expect(getWidgetData()).toEqual(DATA);
    });
  });

  it('getWidgetData returns null when the stored raw value is empty', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
      mockUserDefaults({ get: jest.fn(() => '') });

      const { getWidgetData } = require('../src/services/iosWidget');
      expect(getWidgetData()).toBeNull();
    });
  });

  it('getWidgetData returns null when parsing fails', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
      mockUserDefaults({ get: jest.fn(() => 'not-json') });

      const { getWidgetData } = require('../src/services/iosWidget');
      expect(getWidgetData()).toBeNull();
    });
  });
});
