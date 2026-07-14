import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function light() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function medium() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

export function heavy() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

export function success() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

export function warning() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

export function error() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export function selection() {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync();
  }
}

export function minerOnlineHaptic() {
  medium();
  success();
}

export function minerOfflineHaptic() {
  heavy();
  error();
}

export function minerAlertHaptic() {
  warning();
}

export function minerRefreshHaptic() {
  light();
}

export function pullToRefreshHaptic() {
  light();
}

export function selectionToggleHaptic() {
  selection();
}

export function destructiveActionHaptic() {
  heavy();
}

export function navigationHaptic() {
  light();
}
