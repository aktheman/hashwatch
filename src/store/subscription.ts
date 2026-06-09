import { create } from 'zustand';
import { SubscriptionTier } from '../types';

const FREE_MAX_MINERS = 3;

interface SubscriptionStore {
  tier: SubscriptionTier;
  isPro: boolean;
  maxMiners: number;
  initialized: boolean;

  setPro: () => void;
  setFree: () => void;
  canAddMiner: (currentCount: number) => boolean;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  tier: 'free',
  isPro: false,
  maxMiners: FREE_MAX_MINERS,
  initialized: false,

  setPro: () => set({ tier: 'pro', isPro: true, maxMiners: 999, initialized: true }),
  setFree: () => set({ tier: 'free', isPro: false, maxMiners: FREE_MAX_MINERS, initialized: true }),

  canAddMiner: (currentCount: number) => {
    const state = get();
    return currentCount < state.maxMiners;
  },
}));
