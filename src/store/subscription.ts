import { create } from 'zustand';
import { SubscriptionTier } from '../types';
import { configureRevenueCat, purchasePro, restorePurchases, checkProStatus } from '../services/revenuecat';

const FREE_MAX_MINERS = 999;

interface SubscriptionStore {
  tier: SubscriptionTier;
  isPro: boolean;
  maxMiners: number;
  initialized: boolean;
  loading: boolean;

  initialize: () => Promise<void>;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  setPro: () => void;
  setFree: () => void;
  canAddMiner: (currentCount: number) => boolean;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  tier: 'free',
  isPro: false,
  maxMiners: FREE_MAX_MINERS,
  initialized: false,
  loading: false,

  initialize: async () => {
    try {
      await configureRevenueCat();
      const pro = await checkProStatus();
      set({
        isPro: pro,
        tier: pro ? 'pro' : 'free',
        maxMiners: pro ? 999 : FREE_MAX_MINERS,
        initialized: true,
      });
    } catch {
      set({ initialized: true });
    }
  },

  purchase: async () => {
    set({ loading: true });
    try {
      const customerInfo = await purchasePro();
      if (!customerInfo) {
        set({ loading: false });
        return false;
      }
      const pro = customerInfo.entitlements.active['pro'] !== undefined;
      set({
        isPro: pro,
        tier: pro ? 'pro' : 'free',
        maxMiners: pro ? 999 : FREE_MAX_MINERS,
        loading: false,
      });
      return pro;
    } catch {
      set({ loading: false });
      return false;
    }
  },

  restore: async () => {
    set({ loading: true });
    try {
      const customerInfo = await restorePurchases();
      if (!customerInfo) {
        set({ loading: false });
        return false;
      }
      const pro = customerInfo.entitlements.active['pro'] !== undefined;
      set({
        isPro: pro,
        tier: pro ? 'pro' : 'free',
        maxMiners: pro ? 999 : FREE_MAX_MINERS,
        loading: false,
      });
      return pro;
    } catch {
      set({ loading: false });
      return false;
    }
  },

  setPro: () => set({ tier: 'pro', isPro: true, maxMiners: 999, initialized: true }),
  setFree: () => set({ tier: 'free', isPro: false, maxMiners: FREE_MAX_MINERS, initialized: true }),

  canAddMiner: (currentCount: number) => {
    const state = get();
    return currentCount < state.maxMiners;
  },
}));
