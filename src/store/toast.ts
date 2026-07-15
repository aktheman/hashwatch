import { create } from 'zustand';

export interface UndoAction {
  id: string;
  message: string;
  onUndo: () => void;
  onConfirm: () => void | Promise<void>;
}

interface ToastStore {
  undo: UndoAction | null;
  showUndo: (action: UndoAction) => void;
  dismissUndo: () => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastStore>((set) => ({
  undo: null,
  showUndo: (action) => {
    const prev = useToastStore.getState().undo;
    if (prev) {
      const t = timers.get(prev.id);
      if (t) clearTimeout(t);
      timers.delete(prev.id);
    }
    const timer = setTimeout(async () => {
      await action.onConfirm();
      set({ undo: null });
      timers.delete(action.id);
    }, 5000);
    timer.unref();
    timers.set(action.id, timer);
    set({ undo: action });
  },
  dismissUndo: () => {
    const prev = useToastStore.getState().undo;
    if (prev) {
      const t = timers.get(prev.id);
      if (t) clearTimeout(t);
      timers.delete(prev.id);
    }
    set({ undo: null });
  },
}));
