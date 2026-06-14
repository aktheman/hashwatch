import { useSubscriptionStore } from '../src/store/subscription';

let mockToken: string | null = null;

jest.mock('../src/store/authToken', () => ({
  getAuthToken: () => mockToken,
}));

jest.mock('../src/api/client', () => ({
  validateReceipt: jest.fn(),
}));

jest.mock('../src/services/revenuecat', () => ({
  configureRevenueCat: jest.fn(),
  checkProStatus: jest.fn().mockResolvedValue(false),
  purchasePro: jest.fn(),
  restorePurchases: jest.fn(),
}));

import * as revenuecat from '../src/services/revenuecat';

const mockRC = revenuecat as jest.Mocked<typeof revenuecat>;
const mockClient = jest.requireMock('../src/api/client') as { validateReceipt: jest.Mock };

beforeEach(() => {
  useSubscriptionStore.setState({
    tier: 'free',
    isPro: false,
    maxMiners: 4,
    initialized: false,
    loading: false,
  });
  jest.clearAllMocks();
  mockToken = null;
});

it('starts as free tier with 4 miners', () => {
  const state = useSubscriptionStore.getState();
  expect(state.tier).toBe('free');
  expect(state.isPro).toBe(false);
  expect(state.maxMiners).toBe(4);
});

it('canAddMiner returns true when under limit', () => {
  expect(useSubscriptionStore.getState().canAddMiner(2)).toBe(true);
  expect(useSubscriptionStore.getState().canAddMiner(0)).toBe(true);
});

it('canAddMiner returns false when at or over limit', () => {
  expect(useSubscriptionStore.getState().canAddMiner(4)).toBe(false);
  expect(useSubscriptionStore.getState().canAddMiner(5)).toBe(false);
});

it('setPro upgrades to unlimited miners', () => {
  useSubscriptionStore.getState().setPro();
  const state = useSubscriptionStore.getState();
  expect(state.tier).toBe('pro');
  expect(state.isPro).toBe(true);
  expect(state.maxMiners).toBe(999);
});

it('setFree resets to 4 miners', () => {
  useSubscriptionStore.getState().setPro();
  useSubscriptionStore.getState().setFree();
  const state = useSubscriptionStore.getState();
  expect(state.tier).toBe('free');
  expect(state.isPro).toBe(false);
  expect(state.maxMiners).toBe(4);
});

it('canAddMiner follows maxMiners limit for pro users', () => {
  useSubscriptionStore.getState().setPro();
  expect(useSubscriptionStore.getState().canAddMiner(100)).toBe(true);
  expect(useSubscriptionStore.getState().canAddMiner(998)).toBe(true);
  expect(useSubscriptionStore.getState().canAddMiner(999)).toBe(false);
});

describe('initialize', () => {
  it('sets pro when checkProStatus returns true', async () => {
    mockRC.checkProStatus.mockResolvedValueOnce(true);
    await useSubscriptionStore.getState().initialize();
    const state = useSubscriptionStore.getState();
    expect(state.isPro).toBe(true);
    expect(state.tier).toBe('pro');
    expect(state.maxMiners).toBe(999);
    expect(state.initialized).toBe(true);
  });

  it('sets free when checkProStatus returns false', async () => {
    mockRC.checkProStatus.mockResolvedValueOnce(false);
    await useSubscriptionStore.getState().initialize();
    const state = useSubscriptionStore.getState();
    expect(state.isPro).toBe(false);
    expect(state.tier).toBe('free');
    expect(state.maxMiners).toBe(4);
    expect(state.initialized).toBe(true);
  });

  it('sets initialized even when configureRevenueCat throws', async () => {
    mockRC.configureRevenueCat.mockRejectedValueOnce(new Error('RC config fail'));
    await useSubscriptionStore.getState().initialize();
    const state = useSubscriptionStore.getState();
    expect(state.initialized).toBe(true);
    expect(state.isPro).toBe(false);
  });

  it('calls configureRevenueCat on init', async () => {
    await useSubscriptionStore.getState().initialize();
    expect(mockRC.configureRevenueCat).toHaveBeenCalled();
  });
});

describe('purchase', () => {
  it('returns false when purchasePro returns null', async () => {
    mockRC.purchasePro.mockResolvedValueOnce(null as never);
    const result = await useSubscriptionStore.getState().purchase();
    expect(result).toBe(false);
    expect(useSubscriptionStore.getState().loading).toBe(false);
  });

  it('returns false when purchasePro throws', async () => {
    mockRC.purchasePro.mockRejectedValueOnce(new Error('purchase failed'));
    const result = await useSubscriptionStore.getState().purchase();
    expect(result).toBe(false);
    expect(useSubscriptionStore.getState().loading).toBe(false);
  });

  it('upgrades to pro on successful purchase', async () => {
    mockRC.purchasePro.mockResolvedValueOnce({
      customerInfo: {
        entitlements: { active: { pro: {} } },
        allPurchasedProductIdentifiers: ['hashwatch_pro'],
      },
      productIdentifier: 'hashwatch_pro',
    } as never);
    const result = await useSubscriptionStore.getState().purchase();
    expect(result).toBe(true);
    expect(useSubscriptionStore.getState().isPro).toBe(true);
    expect(useSubscriptionStore.getState().tier).toBe('pro');
    expect(useSubscriptionStore.getState().maxMiners).toBe(999);
  });

  it('does not validate receipt when unauthenticated', async () => {
    mockRC.purchasePro.mockResolvedValueOnce({
      customerInfo: {
        entitlements: { active: { pro: {} } },
        allPurchasedProductIdentifiers: ['hashwatch_pro'],
      },
      productIdentifier: 'hashwatch_pro',
    } as never);
    await useSubscriptionStore.getState().purchase();
    expect(mockClient.validateReceipt).not.toHaveBeenCalled();
  });

  it('validates receipt when authenticated after purchase', async () => {
    mockToken = 'test-token';
    mockRC.purchasePro.mockResolvedValueOnce({
      customerInfo: {
        entitlements: { active: { pro: { originalPurchaseDate: '2024-01-01' } } },
        allPurchasedProductIdentifiers: ['hashwatch_pro'],
      },
      productIdentifier: 'hashwatch_pro',
    } as never);
    await useSubscriptionStore.getState().purchase();
    expect(mockClient.validateReceipt).toHaveBeenCalledWith('2024-01-01', 'hashwatch_pro');
  });

  it('falls back to productIdentifier when originalPurchaseDate is missing', async () => {
    mockToken = 'test-token';
    mockRC.purchasePro.mockResolvedValueOnce({
      customerInfo: {
        entitlements: { active: { pro: {} } },
        allPurchasedProductIdentifiers: ['hashwatch_pro'],
      },
      productIdentifier: 'hashwatch_pro',
    } as never);
    await useSubscriptionStore.getState().purchase();
    expect(mockClient.validateReceipt).toHaveBeenCalledWith('hashwatch_pro', 'hashwatch_pro');
  });

  it('does not change to pro when entitlements lack pro', async () => {
    mockRC.purchasePro.mockResolvedValueOnce({
      customerInfo: {
        entitlements: { active: {} },
        allPurchasedProductIdentifiers: [],
      },
      productIdentifier: 'hashwatch_pro',
    } as never);
    const result = await useSubscriptionStore.getState().purchase();
    expect(result).toBe(false);
    expect(useSubscriptionStore.getState().isPro).toBe(false);
  });
});

describe('restore', () => {
  it('returns false when restorePurchases returns null', async () => {
    mockRC.restorePurchases.mockResolvedValueOnce(null as never);
    const result = await useSubscriptionStore.getState().restore();
    expect(result).toBe(false);
    expect(useSubscriptionStore.getState().loading).toBe(false);
  });

  it('returns false when restorePurchases throws', async () => {
    mockRC.restorePurchases.mockRejectedValueOnce(new Error('restore failed'));
    const result = await useSubscriptionStore.getState().restore();
    expect(result).toBe(false);
    expect(useSubscriptionStore.getState().loading).toBe(false);
  });

  it('upgrades to pro on successful restore', async () => {
    mockRC.restorePurchases.mockResolvedValueOnce({
      entitlements: { active: { pro: {} } },
      allPurchasedProductIdentifiers: ['hashwatch_pro'],
    } as never);
    const result = await useSubscriptionStore.getState().restore();
    expect(result).toBe(true);
    expect(useSubscriptionStore.getState().isPro).toBe(true);
    expect(useSubscriptionStore.getState().tier).toBe('pro');
  });

  it('validates receipt when authenticated after restore', async () => {
    mockToken = 'test-token';
    mockRC.restorePurchases.mockResolvedValueOnce({
      entitlements: { active: { pro: { originalPurchaseDate: '2024-06-01' } } },
      allPurchasedProductIdentifiers: ['hashwatch_pro'],
    } as never);
    await useSubscriptionStore.getState().restore();
    expect(mockClient.validateReceipt).toHaveBeenCalledWith('2024-06-01', 'hashwatch_pro');
  });

  it('falls back to first purchased identifier when originalPurchaseDate missing', async () => {
    mockToken = 'test-token';
    mockRC.restorePurchases.mockResolvedValueOnce({
      entitlements: { active: { pro: {} } },
      allPurchasedProductIdentifiers: ['hashwatch_pro'],
    } as never);
    await useSubscriptionStore.getState().restore();
    expect(mockClient.validateReceipt).toHaveBeenCalledWith('hashwatch_pro', 'hashwatch_pro');
  });

  it('does not validate receipt when restore returns non-pro', async () => {
    mockToken = 'test-token';
    mockRC.restorePurchases.mockResolvedValueOnce({
      entitlements: { active: {} },
      allPurchasedProductIdentifiers: [],
    } as never);
    await useSubscriptionStore.getState().restore();
    expect(mockClient.validateReceipt).not.toHaveBeenCalled();
  });
});
