import { Platform } from 'react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import {
  minerOnlineHaptic,
  minerOfflineHaptic,
  minerAlertHaptic,
  minerRefreshHaptic,
  pullToRefreshHaptic,
  selectionToggleHaptic,
  destructiveActionHaptic,
  navigationHaptic,
} from '../src/utils/haptics';
import * as Haptics from 'expo-haptics';

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
});

describe('extended haptics', () => {
  it('minerOnlineHaptic calls medium + success', () => {
    minerOnlineHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('Medium');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('Success');
  });

  it('minerOfflineHaptic calls heavy + error', () => {
    minerOfflineHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('Heavy');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('Error');
  });

  it('minerAlertHaptic calls warning', () => {
    minerAlertHaptic();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('Warning');
  });

  it('minerRefreshHaptic calls light', () => {
    minerRefreshHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('Light');
  });

  it('pullToRefreshHaptic calls light', () => {
    pullToRefreshHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('Light');
  });

  it('selectionToggleHaptic calls selectionAsync', () => {
    selectionToggleHaptic();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('destructiveActionHaptic calls heavy', () => {
    destructiveActionHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('Heavy');
  });

  it('navigationHaptic calls light', () => {
    navigationHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('Light');
  });

  describe('web platform guard', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    it('minerOnlineHaptic is no-op on web', () => {
      minerOnlineHaptic();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });

    it('minerOfflineHaptic is no-op on web', () => {
      minerOfflineHaptic();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });

    it('minerAlertHaptic is no-op on web', () => {
      minerAlertHaptic();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });

    it('pullToRefreshHaptic is no-op on web', () => {
      pullToRefreshHaptic();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('selectionToggleHaptic is no-op on web', () => {
      selectionToggleHaptic();
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });

    it('destructiveActionHaptic is no-op on web', () => {
      destructiveActionHaptic();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('navigationHaptic is no-op on web', () => {
      navigationHaptic();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });
});
