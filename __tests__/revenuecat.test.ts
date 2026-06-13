const mockGetCustomerInfo = jest.fn();
const mockAddListener = jest.fn();
const mockRemoveListener = jest.fn();

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  LOG_LEVEL: { DEBUG: 0, INFO: 1 },
  default: {
    setLogLevel: jest.fn(),
    configure: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: () => mockGetCustomerInfo(),
    addCustomerInfoUpdateListener: (cb: unknown) => mockAddListener(cb),
    removeCustomerInfoUpdateListener: (cb: unknown) => mockRemoveListener(cb),
  },
}));

import Purchases from 'react-native-purchases';
import { isPro, checkProStatus, listenForProChanges } from '../src/services/revenuecat';

describe('isPro', () => {
  it('returns true when pro entitlement is active', () => {
    const info = { entitlements: { active: { pro: { identifier: 'pro' } } } };
    expect(isPro(info as any)).toBe(true);
  });

  it('returns false when no customer info', () => {
    expect(isPro(null)).toBe(false);
  });

  it('returns false when pro not in active entitlements', () => {
    const info = { entitlements: { active: {} } };
    expect(isPro(info as any)).toBe(false);
  });
});

describe('checkProStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when pro', async () => {
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { pro: { identifier: 'pro' } } },
    });
    const result = await checkProStatus();
    expect(result).toBe(true);
  });

  it('returns false when not pro', async () => {
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: {} },
    });
    const result = await checkProStatus();
    expect(result).toBe(false);
  });

  it('returns false on error', async () => {
    mockGetCustomerInfo.mockRejectedValue(new Error('fail'));
    const result = await checkProStatus();
    expect(result).toBe(false);
  });
});

describe('listenForProChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers and unregisters listener', () => {
    const cb = jest.fn();
    const unsubscribe = listenForProChanges(cb);
    expect(mockAddListener).toHaveBeenCalled();
    unsubscribe();
    expect(mockRemoveListener).toHaveBeenCalled();
  });
});
