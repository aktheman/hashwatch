import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function authenticateWithBiometric(promptMessage: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Use Passcode',
  });
  return result.success;
}
