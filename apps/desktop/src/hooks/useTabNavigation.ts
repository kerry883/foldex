'use client';
import { useTabStore, type TabType, MAX_TABS } from '@/stores/tabstore';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { toast } from 'sonner';


/**
 * Build the URL for a given tab type + IDs.
 */
function buildTabUrl(type: TabType, itemId: string, folderId?: string): string {
  const base = type === 'note' ? `/note/${itemId}` : `/video/${itemId}`;
  return folderId ? `${base}?folderId=${folderId}` : base;
}

/**
 * Parse a URL (pathname + search) into tab info.
 */
export function parseTabFromUrl(pathnameOrUrl: string): {
  type: TabType;
  itemId: string;
  folderId?: string;
} | null {
  try {
    const url = new URL(pathnameOrUrl, 'http://localhost');
    const pathname = url.pathname;
    const folderId = url.searchParams.get('folderId') || undefined;

    // Matches /note/123
    const noteMatch = pathname.match(/^\/note\/([^/]+)/);
    if (noteMatch) return { type: 'note', itemId: noteMatch[1], folderId };

    // Matches /video/123
    const videoMatch = pathname.match(/^\/video\/([^/]+)/);
    if (videoMatch) return { type: 'video', itemId: videoMatch[1], folderId };

  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Hook that provides tab-aware navigation.
 */
export function useTabNavigation() {
  const navigate = useNavigate(); 
  const openTab = useTabStore((s) => s.openTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const tabs = useTabStore((s) => s.tabs);

  const openInTab = useCallback(
    (type: TabType, itemId: string, folderId: string | undefined, title: string) => {
      const url = buildTabUrl(type, itemId, folderId);
      const success = openTab({ type, itemId, folderId, title, url });

      if (!success) {
        toast.error(`Maximum of ${MAX_TABS} tabs reached. Close some tabs first.`);
        return;
      }
      
      // Use TanStack to cleanly push the URL
      navigate({ to: url }); 
    },
    [openTab, navigate],
  );

  const switchToTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        setActiveTab(tabId);
        // Use TanStack to strictly replace the URL
        navigate({ to: tab.url, replace: true });
      }
    },
    [tabs, setActiveTab, navigate],
  );

  return { openInTab, switchToTab, buildTabUrl };
}