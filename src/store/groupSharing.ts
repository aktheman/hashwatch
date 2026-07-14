import { create } from 'zustand';
import { GroupShare } from '../types';
import * as API from '../api/client';

interface GroupSharingState {
  sharedWithMe: GroupShare[];
  sharedByMe: GroupShare[];
  loading: boolean;
  shareGroup: (groupId: string, email: string, level: string) => Promise<void>;
  loadShared: () => Promise<void>;
  revokeShare: (shareId: number) => Promise<void>;
  updateAccess: (shareId: number, level: string) => Promise<void>;
}

export const useGroupSharingStore = create<GroupSharingState>((set, get) => ({
  sharedWithMe: [],
  sharedByMe: [],
  loading: false,

  shareGroup: async (groupId: string, email: string, level: string) => {
    await API.shareGroup(groupId, email, level);
    await get().loadShared();
  },

  loadShared: async () => {
    set({ loading: true });
    try {
      const [withMe, byMe] = await Promise.all([
        API.listSharedWithMe().catch(() => [] as GroupShare[]),
        API.listSharedByMe().catch(() => [] as GroupShare[]),
      ]);
      set({ sharedWithMe: withMe, sharedByMe: byMe });
    } finally {
      set({ loading: false });
    }
  },

  revokeShare: async (shareId: number) => {
    await API.revokeShare(shareId);
    await get().loadShared();
  },

  updateAccess: async (shareId: number, level: string) => {
    await API.updateShareAccess(shareId, level);
    await get().loadShared();
  },
}));
