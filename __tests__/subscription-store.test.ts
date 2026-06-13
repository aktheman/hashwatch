import { useSubscriptionStore } from '../src/store/subscription';

jest.mock('../src/services/revenuecat', () => ({
  configureRevenueCat: jest.fn(),
  checkProStatus: jest.fn().mockResolvedValue(false),
  purchasePro: jest.fn(),
  restorePurchases: jest.fn(),
}));

beforeEach(() => {
  useSubscriptionStore.setState({
    tier: 'free',
    isPro: false,
    maxMiners: 4,
    initialized: false,
    loading: false,
  });
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
