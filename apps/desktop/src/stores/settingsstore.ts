import { create } from 'zustand';

export type SettingsTab = 'account' | 'apikeys' | 'preferences' | 'prompt' | 'updates';

interface SettingsStore {
  isOpen: boolean;
  tab: SettingsTab;

  open: (tab?: SettingsTab) => void;
  close: () => void;
  setOpen: (isOpen: boolean) => void;
  setTab: (tab: SettingsTab) => void;
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  isOpen: false,
  tab: 'account',

  open: (tab) => set(tab ? { isOpen: true, tab } : { isOpen: true }),
  close: () => set({ isOpen: false }),
  setOpen: (isOpen) => set({ isOpen }),
  setTab: (tab) => set({ tab }),
}));
