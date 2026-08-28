import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================
export type TabType = 'note'|'video';

export interface Tab {
  id: string;           // unique key: `${type}-${itemId}`
  type: TabType;        // what kind of content
  itemId: string;       // the Convex document ID
  folderId?: string;    // parent folder when item lives inside a folder
  title: string;        // display name in tab
  url: string;          // the URL this tab corresponds to
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  openTab: (tab: Omit<Tab, 'id'>) => boolean;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  closeTabsToTheRight: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  updateTabTitle: (tabId: string, title: string) => void;
}

// ============================================
// HELPERS
// ============================================
export const MAX_TABS = 15;

function makeTabId(type: TabType, itemId: string): string {
  return `${type}-${itemId}`;
}

// ============================================
// STORE
// ============================================
export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      openTab: (tabData) => {
        const id = makeTabId(tabData.type, tabData.itemId);
        const { tabs } = get();
        const existing = tabs.find((t) => t.id === id);

        if (existing) {
          // Tab already open — just activate it
          set({ activeTabId: id });
          return true;
        }

        // Enforce max tab limit
        if (tabs.length >= MAX_TABS) {
          return false;
        }

        // Add new tab and activate it
        const newTab: Tab = { ...tabData, id };
        set({
          tabs: [...tabs, newTab],
          activeTabId: id,
        });
        return true;
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        const index = tabs.findIndex((t) => t.id === tabId);
        if (index === -1) return;

        const newTabs = tabs.filter((t) => t.id !== tabId);

        // If we're closing the active tab, activate a neighbor
        let newActiveId = activeTabId;
        if (activeTabId === tabId) {
          if (newTabs.length === 0) {
            newActiveId = null;
          } else if (index < newTabs.length) {
            // Activate the tab that slid into this position (right neighbor)
            newActiveId = newTabs[index].id;
          } else {
            // Was the last tab, activate the new last tab
            newActiveId = newTabs[newTabs.length - 1].id;
          }
        }

        set({ tabs: newTabs, activeTabId: newActiveId });
      },

      setActiveTab: (tabId) => {
        const { tabs } = get();
        if (tabs.some((t) => t.id === tabId)) {
          set({ activeTabId: tabId });
        }
      },

      closeOtherTabs: (tabId) => {
        const { tabs } = get();
        const keep = tabs.filter((t) => t.id === tabId);
        set({ tabs: keep, activeTabId: tabId });
      },

      closeAllTabs: () => {
        set({ tabs: [], activeTabId: null });
      },

      closeTabsToTheRight: (tabId) => {
        const { tabs } = get();
        const index = tabs.findIndex((t) => t.id === tabId);
        if (index === -1) return;
        const keep = tabs.slice(0, index + 1);
        const { activeTabId } = get();
        const activeStillExists = keep.some((t) => t.id === activeTabId);
        set({
          tabs: keep,
          activeTabId: activeStillExists ? activeTabId : tabId,
        });
      },

      reorderTabs: (fromIndex, toIndex) => {
        const { tabs } = get();
        if (
          fromIndex < 0 || fromIndex >= tabs.length ||
          toIndex < 0 || toIndex >= tabs.length
        ) return;

        const newTabs = [...tabs];
        const [moved] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, moved);
        set({ tabs: newTabs });
      },

      updateTabTitle: (tabId, title) => {
        const { tabs } = get();
        set({
          tabs: tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
        });
      },
    }),
    {
      name: 'foldex-tabs', // localStorage key
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      // Custom storage with error recovery — prevents crashes from
      // corrupted localStorage data (SyntaxError on JSON.parse)
      storage: {
        getItem: (name: string) => {
        if (typeof window === "undefined") return null;
          try {
            const raw = localStorage.getItem(name);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            // Validate the shape of persisted data
            if (parsed?.state && Array.isArray(parsed.state.tabs)) {
              return parsed;
            }
            // Invalid shape — clear it
            localStorage.removeItem(name);
            return null;
          } catch (e) {
            // Corrupted data — clear it and start fresh
            console.warn('[TabStore] Corrupted localStorage data, resetting tabs:', e);
            localStorage.removeItem(name);
            return null;
          }
        },
        setItem: (name: string, value: unknown) => {
        if (typeof window === "undefined") return null;
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            console.warn('[TabStore] Failed to persist tabs:', e);
          }
        },
        removeItem: (name: string) => {
        if (typeof window === "undefined") return null;
          localStorage.removeItem(name);
        },
      },
    }
  )
);