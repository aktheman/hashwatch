import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import {
  configureRevenueCat,
  getOfferings,
  purchasePro,
  restorePurchases,
  isPro,
  checkProStatus,
  listenForProChanges,
} from '../src/services/revenuecat';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    setLogLevel: jest.fn(),
    configure: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 0, INFO: 1 },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('../src/constants', () => ({
  getExtra: () => ({
    revenuecatIosKey: 'test_ios_key',
    revenuecatAndroidKey: 'test_android_key',
  }),
}));

describe('revenuecat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('configureRevenueCat', () => {
    it('sets debug log level in dev mode', async () => {
      (global as { __DEV__?: boolean }).__DEV__ = true;
      await configureRevenueCat();
      expect(Purchases.setLogLevel).toHaveBeenCalledWith(LOG_LEVEL.DEBUG);
    });

    it('sets info log level in production', async () => {
      (global as { __DEV__?: boolean }).__DEV__ = false;
      await configureRevenueCat();
      expect(Purchases.setLogLevel).toHaveBeenCalledWith(LOG_LEVEL.INFO);
    });

    it('configures with iOS key on iOS', async () => {
      (Platform as { OS: string }).OS = 'ios';
      await configureRevenueCat();
      expect(Purchases.configure).toHaveBeenCalledWith({
        apiKey: 'test_ios_key',
        appUserID: null,
      });
    });

    it('configures with Android key on Android', async () => {
      (Platform as { OS: string }).OS = 'android';
      await configureRevenueCat();
      expect(Purchases.configure).toHaveBeenCalledWith({
        apiKey: 'test_android_key',
        appUserID: null,
      });
    });

    it('skips configuration on web', async () => {
      (Platform as { OS: string }).OS = 'web';
      await configureRevenueCat();
      expect(Purchases.configure).not.toHaveBeenCalled();
    });

    it('handles configuration errors', async () => {
      (Purchases.configure as jest.Mock).mockRejectedValue(new Error('Config failed'));
      await expect(configureRevenueCat()).resolves.toBeUndefined();
    });
  });

  describe('getOfferings', () => {
    it('returns offerings when available', async () => {
      const mockOfferings = { current: { availablePackages: [] } };
      (Purchases.getOfferings as jest.Mock).mockResolvedValue(mockOfferings);
      const result = await getOfferings();
      expect(result).toEqual(mockOfferings);
    });

    it('returns null on error', async () => {
      (Purchases.getOfferings as jest.Mock).mockRejectedValue(new Error('Failed'));
      const result = await getOfferings();
      expect(result).toBeNull();
    });
  });

  describe('purchasePro', () => {
    it('returns null when no offerings', async () => {
      (Purchases.getOfferings as jest.Mock).mockResolvedValue(null);
      const result = await purchasePro();
      expect(result).toBeNull();
    });

    it('returns null when no packages available', async () => {
      (Purchases.getOfferings as jest.Mock).mockResolvedValue({
        current: { availablePackages: [] },
      });
      const result = await purchasePro();
      expect(result).toBeNull();
    });

    it('purchases package and returns result', async () => {
      const mockPackage = { identifier: 'pro_monthly' };
      const mockResult = {
        customerInfo: { entitlements: { active: { pro: {} } } },
        productIdentifier: 'pro_monthly',
      };
      (Purchases.getOfferings as jest.Mock).mockResolvedValue({
        current: { availablePackages: [mockPackage] },
      });
      (Purchases.purchasePackage as jest.Mock).mockResolvedValue(mockResult);

      const result = await purchasePro();
      expect(result).toEqual({
        customerInfo: mockResult.customerInfo,
        productIdentifier: 'pro_monthly',
      });
    });

    it('returns null when user cancels', async () => {
      const mockPackage = { identifier: 'pro_monthly' };
      (Purchases.getOfferings as jest.Mock).mockResolvedValue({
        current: { availablePackages: [mockPackage] },
      });
      (Purchases.purchasePackage as jest.Mock).mockRejectedValue({ userCancelled: true });

      const result = await purchasePro();
      expect(result).toBeNull();
    });

    it('throws on non-cancellation errors', async () => {
      const mockPackage = { identifier: 'pro_monthly' };
      (Purchases.getOfferings as jest.Mock).mockResolvedValue({
        current: { availablePackages: [mockPackage] },
      });
      (Purchases.purchasePackage as jest.Mock).mockRejectedValue(new Error('Payment failed'));

      await expect(purchasePro()).rejects.toThrow('Payment failed');
    });
  });

  describe('restorePurchases', () => {
    it('returns customer info on success', async () => {
      const mockInfo = { entitlements: { active: {} } };
      (Purchases.restorePurchases as jest.Mock).mockResolvedValue(mockInfo);
      const result = await restorePurchases();
      expect(result).toEqual(mockInfo);
    });

    it('returns null on error', async () => {
      (Purchases.restorePurchases as jest.Mock).mockRejectedValue(new Error('Failed'));
      const result = await restorePurchases();
      expect(result).toBeNull();
    });
  });

  describe('isPro', () => {
    it('returns false when customerInfo is null', () => {
      expect(isPro(null)).toBe(false);
    });

    it('returns false when no pro entitlement', () => {
      const info = { entitlements: { active: {} } } as CustomerInfo;
      expect(isPro(info)).toBe(false);
    });

    it('returns true when pro entitlement active', () => {
      const info = { entitlements: { active: { pro: {} } } } as CustomerInfo;
      expect(isPro(info)).toBe(true);
    });
  });

  describe('checkProStatus', () => {
    it('returns true when pro', async () => {
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({
        entitlements: { active: { pro: {} } },
      });
      const result = await checkProStatus();
      expect(result).toBe(true);
    });

    it('returns false when not pro', async () => {
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue({
        entitlements: { active: {} },
      });
      const result = await checkProStatus();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      (Purchases.getCustomerInfo as jest.Mock).mockRejectedValue(new Error('Failed'));
      const result = await checkProStatus();
      expect(result).toBe(false);
    });
  });

  describe('listenForProChanges', () => {
    it('adds listener and returns unsubscribe function', async () => {
      const callback = jest.fn();
      const unsubscribe = await listenForProChanges(callback);

      expect(Purchases.addCustomerInfoUpdateListener).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('calls callback with pro status', async () => {
      const callback = jest.fn();
      await listenForProChanges(callback);

      const listener = (Purchases.addCustomerInfoUpdateListener as jest.Mock).mock.calls[0][0];
      listener({ entitlements: { active: { pro: {} } } });

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('removes listener on unsubscribe', async () => {
      const callback = jest.fn();
      const unsubscribe = await listenForProChanges(callback);
      unsubscribe();

      expect(Purchases.removeCustomerInfoUpdateListener).toHaveBeenCalled();
    });
  });
});
