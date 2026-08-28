import { useTabStore, type Tab } from '@/stores/tabstore';
import { Spinner } from '@workspace/ui/components/spinner';
import { lazy, Suspense } from 'react'; 

//  Use React.lazy 
const NoteContentInner = lazy(() => import('./content/NoteContentInner'));
const VideoContentInner = lazy(() => import('./content/videocontentinner'));

function ContentSpinner() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <Spinner className="size-8" />
    </div>
  );
}

/**
 * Renders ALL open tabs simultaneously, hiding inactive ones with CSS.
 * This keeps components mounted so video playback, PDF scroll positions,
 * and flashcard study progress are preserved when switching tabs.
 */
export function TabContent() {
  const { tabs, activeTabId } = useTabStore();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden relative">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="absolute inset-0 h-full w-full"
          style={{ 
            display: tab.id === activeTabId ? 'flex' : 'none',
            flexDirection: 'column',
          }}
        >
          {/* 3. Wrap your TabRenderer in Suspense. 
              This tells React to show the ContentSpinner while the lazy component loads. */}
          <Suspense fallback={<ContentSpinner />}>
            <TabRenderer tab={tab} />
          </Suspense>
        </div>
      ))}
    </div>
  );
}

function TabRenderer({ tab }: { tab: Tab }) {
  switch (tab.type) {
    case 'note':
      return (
        <NoteContentInner
          noteId={tab.itemId}
          folderId={tab.folderId || undefined}
        />
      );
    case 'video':
      return (
        <VideoContentInner
          videoId={tab.itemId}
          folderId={tab.folderId || undefined}
        />
      );
    default:
      return <div className="p-4">Unknown content type</div>;
  }
}