import { Platform } from 'react-native';

const mockImpactAsync = jest.fn();
const mockNotificationAsync = jest.fn();
const mockSelectionAsync = jest.fn();

jest.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  notificationAsync: (...args: unknown[]) => mockNotificationAsync(...args),
  selectionAsync: (...args: unknown[]) => mockSelectionAsync(...args),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import { light, medium, heavy, success, warning, error, selection } from '../src/utils/haptics';

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
});

describe('haptics', () => {
  it('light calls impactAsync with Light style', () => {
    light();
    expect(mockImpactAsync).toHaveBeenCalledWith('Light');
  });

  it('medium calls impactAsync with Medium style', () => {
    medium();
    expect(mockImpactAsync).toHaveBeenCalledWith('Medium');
  });

  it('heavy calls impactAsync with Heavy style', () => {
    heavy();
    expect(mockImpactAsync).toHaveBeenCalledWith('Heavy');
  });

  it('success calls notificationAsync with Success type', () => {
    success();
    expect(mockNotificationAsync).toHaveBeenCalledWith('Success');
  });

  it('warning calls notificationAsync with Warning type', () => {
    warning();
    expect(mockNotificationAsync).toHaveBeenCalledWith('Warning');
  });

  it('error calls notificationAsync with Error type', () => {
    error();
    expect(mockNotificationAsync).toHaveBeenCalledWith('Error');
  });

  it('selection calls selectionAsync', () => {
    selection();
    expect(mockSelectionAsync).toHaveBeenCalled();
  });

  describe('web platform guard', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    it('light is a no-op on web', () => {
      light();
      expect(mockImpactAsync).not.toHaveBeenCalled();
    });

    it('medium is a no-op on web', () => {
      medium();
      expect(mockImpactAsync).not.toHaveBeenCalled();
    });

    it('heavy is a no-op on web', () => {
      heavy();
      expect(mockImpactAsync).not.toHaveBeenCalled();
    });

    it('success is a no-op on web', () => {
      success();
      expect(mockNotificationAsync).not.toHaveBeenCalled();
    });

    it('warning is a no-op on web', () => {
      warning();
      expect(mockNotificationAsync).not.toHaveBeenCalled();
    });

    it('error is a no-op on web', () => {
      error();
      expect(mockNotificationAsync).not.toHaveBeenCalled();
    });

    it('selection is a no-op on web', () => {
      selection();
      expect(mockSelectionAsync).not.toHaveBeenCalled();
    });
  });
});
