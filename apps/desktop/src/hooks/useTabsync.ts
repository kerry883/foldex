import { useEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router'; 
import { useTabStore } from '@/stores/tabstore';
import { parseTabFromUrl } from './useTabNavigation';

export function useTabSync() {
  // TanStack Location gives us href which contains path + search params
  const location = useLocation(); 
  const { tabs, activeTabId, openTab, setActiveTab } = useTabStore();
  const isInitialized = useRef(false);

  // Trigger this effect whenever the TanStack URL changes (including Back/Forward buttons!)
  useEffect(() => {
    const fullUrl = location.href;
    const parsed = parseTabFromUrl(fullUrl);
    
    if (!parsed) return;

    const tabId = `${parsed.type}-${parsed.itemId}`;
    const existingTab = tabs.find((t) => t.id === tabId);

    if (existingTab) {
      if (activeTabId !== tabId) {
        setActiveTab(tabId);
      }
    } else {
      openTab({
        type: parsed.type,
        itemId: parsed.itemId,
        folderId: parsed.folderId,
        title: getDefaultTitle(parsed.type),
        url: fullUrl,
      });
    }
    
    isInitialized.current = true;
  }, [location.href, tabs, activeTabId, openTab, setActiveTab]); 
}

function getDefaultTitle(type: string): string {
  switch (type) {
    case 'note': return 'New Note';
    case 'video': return 'New Video';
    default: return 'Tab';
  }
}