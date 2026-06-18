jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { isBiometricAvailable, authenticateWithBiometric } from '../src/utils/biometric';

const mockHasHardware = LocalAuthentication.hasHardwareAsync as jest.Mock;
const mockIsEnrolled = LocalAuthentication.isEnrolledAsync as jest.Mock;
const mockAuthenticate = LocalAuthentication.authenticateAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
});

describe('isBiometricAvailable', () => {
  it('returns true when hardware exists and user is enrolled', async () => {
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);
    const result = await isBiometricAvailable();
    expect(result).toBe(true);
  });

  it('returns false when no hardware', async () => {
    mockHasHardware.mockResolvedValue(false);
    const result = await isBiometricAvailable();
    expect(result).toBe(false);
    expect(mockIsEnrolled).not.toHaveBeenCalled();
  });

  it('returns false when hardware exists but not enrolled', async () => {
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(false);
    const result = await isBiometricAvailable();
    expect(result).toBe(false);
  });

  it('returns false on web platform', async () => {
    Platform.OS = 'web';
    const result = await isBiometricAvailable();
    expect(result).toBe(false);
    expect(mockHasHardware).not.toHaveBeenCalled();
  });
});

describe('authenticateWithBiometric', () => {
  it('returns true on successful authentication', async () => {
    mockAuthenticate.mockResolvedValue({ success: true });
    const result = await authenticateWithBiometric('Unlock');
    expect(result).toBe(true);
    expect(mockAuthenticate).toHaveBeenCalledWith({
      promptMessage: 'Unlock',
      fallbackLabel: 'Use Passcode',
    });
  });

  it('returns false on failed authentication', async () => {
    mockAuthenticate.mockResolvedValue({ success: false });
    const result = await authenticateWithBiometric('Unlock');
    expect(result).toBe(false);
  });

  it('returns false on web platform', async () => {
    Platform.OS = 'web';
    const result = await authenticateWithBiometric('Unlock');
    expect(result).toBe(false);
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });
});
