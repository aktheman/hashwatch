import { create } from 'zustand';
import { Platform } from 'react-native';
import { SubscriptionTier } from '../types';
import {
  configureRevenueCat,
  purchasePro,
  restorePurchases,
  checkProStatus,
  listenForProChanges,
} from '../services/revenuecat';
import { validateReceipt, apiClient } from '../api/client';
import { getAuthToken } from './authToken';

const FREE_MAX_MINERS = 4;
const PRO_MAX_MINERS = 999;

interface StripeSubscriptionResponse {
  active: boolean;
  inTrial: boolean;
  trialEndsAt: string | null;
  platform?: string;
  productId?: string;
  expiresAt?: string;
}

interface SubscriptionStore {
  tier: SubscriptionTier;
  isPro: boolean;
  maxMiners: number;
  initialized: boolean;
  loading: boolean;
  inTrial: boolean;
  trialEndsAt: string | null;

  initialize: () => Promise<void>;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  setPro: () => void;
  setFree: () => void;
  canAddMiner: (currentCount: number) => boolean;
}

async function checkStripeSubscription(): Promise<StripeSubscriptionResponse | null> {
  try {
    if (!getAuthToken()) return null;
    const res = await apiClient.get<StripeSubscriptionResponse>('/api/stripe/subscription');
    return res.data;
  } catch {
    return null;
  }
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  tier: 'free',
  isPro: false,
  maxMiners: FREE_MAX_MINERS,
  initialized: false,
  loading: false,
  inTrial: false,
  trialEndsAt: null,

  initialize: async () => {
    try {
      if (Platform.OS === 'web') {
        const stripeSub = await checkStripeSubscription();
        if (stripeSub) {
          const isProStatus = stripeSub.active || stripeSub.inTrial;
          set({
            isPro: isProStatus,
            tier: isProStatus ? 'pro' : 'free',
            maxMiners: isProStatus ? PRO_MAX_MINERS : FREE_MAX_MINERS,
            inTrial: stripeSub.inTrial,
            trialEndsAt: stripeSub.trialEndsAt,
            initialized: true,
          });
          return;
        }
      }

      await configureRevenueCat();
      const pro = await checkProStatus();
      set({
        isPro: pro,
        tier: pro ? 'pro' : 'free',
        maxMiners: pro ? PRO_MAX_MINERS : FREE_MAX_MINERS,
        initialized: true,
      });
      await listenForProChanges((isPro) => {
        set({
          isPro,
          tier: isPro ? 'pro' : 'free',
          maxMiners: isPro ? PRO_MAX_MINERS : FREE_MAX_MINERS,
        });
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
          (e) => console.warn('Receipt validation failed (purchase):', e),
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
      if (Platform.OS === 'web') {
        const stripeSub = await checkStripeSubscription();
        if (stripeSub) {
          const isProStatus = stripeSub.active || stripeSub.inTrial;
          set({
            isPro: isProStatus,
            tier: isProStatus ? 'pro' : 'free',
            maxMiners: isProStatus ? PRO_MAX_MINERS : FREE_MAX_MINERS,
            inTrial: stripeSub.inTrial,
            trialEndsAt: stripeSub.trialEndsAt,
            loading: false,
          });
          return isProStatus;
        }
      }

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
        validateReceipt(ent?.originalPurchaseDate ?? pid, pid).catch((e) =>
          console.warn('Receipt validation failed (restore):', e),
        );
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
