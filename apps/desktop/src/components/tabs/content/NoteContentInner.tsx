import { useTabStore } from '@/stores/tabstore';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useNote, useUpdateNote } from '@/hooks/use-notes';
import Notesheader from '@/components/notescomponent/noteheader';
import BlocknoteEditor from '@/components/notescomponent/blocknote-editor';
import type { BlockNoteContent } from '@/lib/api-types';
import { useAiStore } from '@/stores/aistore';
import AiModalComponent from '@/components/aicomponents/aimodal';
import CanvasModal from '@/components/aicomponents/canvasmodal';
import { useNoteStore } from '@/stores/notestore';



interface NoteContentInnerProps {
  noteId: string;
  folderId?: string;
}

const NoteContentInner = ({ noteId, folderId }: NoteContentInnerProps) => {
  const {data:note,isLoading:noteLoading} = useNote(noteId);
  const {isOpen}=useAiStore();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);
  const {mutateAsync:updateContent,isPending:updateContentLoading} = useUpdateNote();
  const [panelWidth, setPanelWidth] = useState(420);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const {setFolderId}=useNoteStore();

  const [content, setContent] = useState<BlockNoteContent|undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
      if (note?.folderId) {
        setFolderId(note.folderId);
      }
  }, [note]);

  useEffect(() => {
    if (note?.title) {
      updateTabTitle(`note-${noteId}`, note.title);
    }
  }, [note?.title, noteId, updateTabTitle]);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX - e.clientX;
      const containerWidth = containerRef.current?.offsetWidth || 1000;
      const newWidth = Math.min(
        Math.max(startWidth + delta, 400),
        containerWidth * 0.7
      );
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);

  // Refs for debouncing
  const contentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const titleTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleContentChange = (newContent:BlockNoteContent) => {
      setContent(newContent);
      setIsSaving(true);
  
      // Clear previous timer
      if (contentTimerRef.current) {
        clearTimeout(contentTimerRef.current);
      }
  
      // Set new timer
      contentTimerRef.current = setTimeout(async () => {
        try {
          await updateContent({
            id:noteId,
            data:{
              content:newContent,
            },
          });
        } catch (error) {
          console.error("Failed to save content:", error);
        } finally {
          setIsSaving(false);
        }
      }, 2000); // 2 second debounce
    };
  
    // Cleanup timers on unmount
    useEffect(() => {
      return () => {
        if (contentTimerRef.current) {
          clearTimeout(contentTimerRef.current);
        }
        if (titleTimerRef.current) {
          clearTimeout(titleTimerRef.current);
        }
      };
    }, []);
  
    // Loading state
    if (noteLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
   if(!note){
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">note not found</p>
      </div>
    );
   }
  

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <Notesheader
        noteId={noteId}
        folderId={folderId}
      />
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
        <div className="p-4 pb-12">
              <BlocknoteEditor
                initialContent={note.content}
                onChangeContent={handleContentChange}
                editable={true}
              />
        </div>
      </div>
      {note && (
        <div className="absolute bottom-2 right-4 text-xs text-muted-foreground z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded pointer-events-none">
          {isSaving ? "Saving..." : "Saved"} Last edited: {new Date(note.updatedAt).toLocaleString()}
        </div>
      )}
       {isOpen && (
        <>
          {/* Desktop: floating right-anchored resizable panel */}
          <div
            className="hidden md:flex z-50 absolute right-0 top-0 h-full p-3 pl-0"
            style={{ width: panelWidth }}
          >
            {/* Drag handle */}
            <div
              className="w-1.5 h-full cursor-col-resize flex items-center justify-center shrink-0 group hover:bg-primary/10 rounded-l-md transition-colors"
              onMouseDown={handleMouseDown}
            >
              <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
            </div>
            <div className="flex-1 h-full bg-background rounded-3xl border shadow-sm overflow-hidden flex flex-col">
              <AiModalComponent />
            </div>
          </div>

          {/* Mobile: fullscreen overlay */}
          <div className="md:hidden z-50 fixed inset-0 w-full h-full bg-background/80 backdrop-blur-sm">
            <div className="h-full w-full bg-background flex flex-col">
              <AiModalComponent />
            </div>
          </div>
        </>
      )}
      <CanvasModal />
    </div>
  );
};

export default NoteContentInner;