import { useLocation } from '@tanstack/react-router'; // <-- TanStack Import
import { useTabStore } from '@/stores/tabstore';
import { useTabSync } from '@/hooks/useTabsync';
import { TabBar } from './TabBar';
import { TabContent } from './tabContent';
import { parseTabFromUrl } from '@/hooks/useTabNavigation';

interface TabLayoutProps {
  children: React.ReactNode;
}

export function TabLayout({ children }: TabLayoutProps) {
  // 1. Sync hook runs automatically on URL changes
  useTabSync();

  const tabs = useTabStore((s) => s.tabs);
  
  // 2. Grab the location object from TanStack
  const location = useLocation();

  // 3. location.href already contains the full path + search string! 
  // No more manual string concatenation.
  const isTabRoute = parseTabFromUrl(location.href) !== null;

  if (tabs.length > 0 && isTabRoute) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <TabBar />
        <TabContent />
      </div>
    );
  }

  // Normal page content (Home, Settings, AI, etc.)
  return <>{children}</>;
}