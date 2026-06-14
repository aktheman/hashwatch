import { create } from 'zustand';
import { SubscriptionTier } from '../types';
import {
  configureRevenueCat,
  purchasePro,
  restorePurchases,
  checkProStatus,
} from '../services/revenuecat';
import { validateReceipt } from '../api/client';
import { getAuthToken } from './authToken';

const FREE_MAX_MINERS = 4;
const PRO_MAX_MINERS = 999;

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
        maxMiners: pro ? PRO_MAX_MINERS : FREE_MAX_MINERS,
        initialized: true,
      });
    } catch {
      set({ initialized: true });
    }
  },

  purchase: async () => {
    set({ loading: true });
    try {
      const result = await purchasePro();
      if (!result) {
        set({ loading: false });
        return false;
      }
      const { customerInfo, productIdentifier } = result;
      const pro = customerInfo.entitlements.active['pro'] !== undefined;
      set({
        isPro: pro,
        tier: pro ? 'pro' : 'free',
        maxMiners: pro ? PRO_MAX_MINERS : FREE_MAX_MINERS,
        loading: false,
      });
      if (pro && getAuthToken()) {
        const ent = customerInfo.entitlements.active['pro'];
        validateReceipt(ent?.originalPurchaseDate ?? productIdentifier, productIdentifier).catch(
          () => {},
        );
      }
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
        maxMiners: pro ? PRO_MAX_MINERS : FREE_MAX_MINERS,
        loading: false,
      });
      if (pro && getAuthToken()) {
        const pid = customerInfo.allPurchasedProductIdentifiers[0] || 'hashwatch_pro';
        const ent = customerInfo.entitlements.active['pro'];
        validateReceipt(ent?.originalPurchaseDate ?? pid, pid).catch(() => {});
      }
      return pro;
    } catch {
      set({ loading: false });
      return false;
    }
  },

  setPro: () => set({ tier: 'pro', isPro: true, maxMiners: PRO_MAX_MINERS, initialized: true }),
  setFree: () => set({ tier: 'free', isPro: false, maxMiners: FREE_MAX_MINERS, initialized: true }),

  canAddMiner: (currentCount: number) => {
    const state = get();
    return currentCount < state.maxMiners;
  },
}));
