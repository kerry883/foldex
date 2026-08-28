import { useTabStore, type TabType } from '@/stores/tabstore';
import { useTabNavigation } from '@/hooks/useTabNavigation';
import { cn } from '@workspace/ui/lib/utils';
import {
  FileText,
  File as FileIcon,
  CreditCard,
  Video,
  Folder,
  X,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@workspace/ui/components/context-menu';
import { useRef, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

function getTabIcon(type: TabType) {
  switch (type) {
    case 'note':
      return <FileText className="h-3.5 w-3.5 shrink-0" />;
    case 'video':
      return <Video className="h-3.5 w-3.5 shrink-0" />;
    default:
      return <FileIcon className="h-3.5 w-3.5 shrink-0" />;
  }
}

export function TabBar() {
  const { tabs, activeTabId, closeTab, closeOtherTabs, closeAllTabs, closeTabsToTheRight, reorderTabs } = useTabStore();
  const { switchToTab } = useTabNavigation();
     
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate()

  // Drag-and-drop state
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeTabId]);

  if (tabs.length === 0) return null;

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();

    closeTab(tabId);
    
    // After closing, check what the new active tab is and update URL
    const newState = useTabStore.getState();
    if (newState.activeTabId && newState.activeTabId !== tabId) {
      const newActiveTab = newState.tabs.find(t => t.id === newState.activeTabId);
      if (newActiveTab) {
        window.history.replaceState(null, '', newActiveTab.url);
      }
    } else if (!newState.activeTabId) {
      // No tabs left — soft navigate to home
          navigate({to:'/'});
    }
  };

  // ---- Drag-and-drop handlers ----
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragFromIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(index);
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragFromIdx !== null && dragFromIdx !== toIndex) {
      reorderTabs(dragFromIdx, toIndex);
    }
    setDragFromIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragFromIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="border-b bg-background shrink-0">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hidden"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const isDragOver = dragOverIdx === index && dragFromIdx !== index;

          return (
            <ContextMenu key={tab.id}>
              <ContextMenuTrigger asChild>
                <div
                  ref={isActive ? activeTabRef : undefined}
                  title={tab.title}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'group flex items-center gap-1.5 px-3 py-2 text-sm cursor-pointer border-r border-border',
                    'hover:bg-accent/50 transition-colors select-none shrink-0',
                    'max-w-[200px] min-w-[120px]',
                    isActive
                      ? 'bg-background border-b-2 border-b-primary text-foreground font-medium'
                      : 'bg-muted/30 text-muted-foreground',
                    dragFromIdx === index && 'opacity-40',
                    isDragOver && 'border-l-2 border-l-primary'
                  )}
                  onClick={() => switchToTab(tab.id)}
                >
                  {getTabIcon(tab.type)}
                  <span className="truncate flex-1 text-xs">{tab.title}</span>
                  <button
                    onClick={(e) => handleClose(e, tab.id)}
                    className={cn(
                      'shrink-0 rounded-sm p-0.5 hover:bg-destructive transition-colors',
                      'opacity-0 group-hover:opacity-100 cursor-pointer',
                      isActive && 'opacity-60'
                    )}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleClose({ stopPropagation: () => {} } as React.MouseEvent, tab.id)}>
                  Close
                </ContextMenuItem>
                <ContextMenuItem onClick={() => {
                  closeOtherTabs(tab.id);
                  // Sync URL to the remaining tab
                  window.history.replaceState(null, '', tab.url);
                }}>
                  Close Others
                </ContextMenuItem>
                <ContextMenuItem onClick={() => {
                  closeTabsToTheRight(tab.id);
                  // Sync URL to this tab (since active may have been to the right)
                  const newState = useTabStore.getState();
                  const activeTab = newState.tabs.find(t => t.id === newState.activeTabId);
                  if (activeTab) {
                    window.history.replaceState(null, '', activeTab.url);
                  }
                }}>
                  Close to the Right
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => {
                  closeAllTabs();
                  navigate({to:"/"});
                }}>
                  Close All
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
}