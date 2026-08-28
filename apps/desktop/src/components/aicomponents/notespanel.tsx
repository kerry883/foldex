import React, { useEffect, useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Copy, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useCanvasStore } from "@/stores/canvasStore";
import type { BlockNoteContent } from "@/lib/api-types";
import { useNote, useUpdateNote } from "@/hooks/use-notes";
import BlocknoteEditor from "../notescomponent/blocknote-editor";
import { blockNoteToPlainText } from "@/lib/blocknotehelper";

export default function NotesPanel() {
  const { activeNoteId } = useCanvasStore();
  if (!activeNoteId) return null;
  return (
    <div className="flex flex-col h-full">
      <NotePanelHeader noteId={activeNoteId} />
      <div className="flex-1 overflow-y-auto scrollbar-hidden">
        <NoteComponent noteId={activeNoteId} />
      </div>
    </div>
  );
}
function NotePanelHeader({ noteId }: { noteId: string }) {
  const {data:note} = useNote(noteId);
  const { setCanvasOpen } = useCanvasStore();
  if (!note) {
    return null;
  }
  const handleCopy = async () => {
    if (!note.content) return;
    try {
      // 1. Await the async conversion
      const data = await blockNoteToPlainText(note.content);
      // 2. Write to clipboard
      navigator.clipboard.writeText(data);
      toast.success("Note copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy note.");
    }
  };
  return (
    <div className="flex items-center justify-between p-2 border-b h-14">
      <span className="font-semibold text-sm truncate">
        {note ? note.title : "Loading..."}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCanvasOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


interface NoteComponentProps {
  noteId: string;
}

const NoteComponent = ({ noteId}: NoteComponentProps) => {
    const {data:note,isLoading:noteLoading} = useNote(noteId);
    const {mutateAsync:updateContent,isPending:updateContentLoading} = useUpdateNote();
  
    const [content, setContent] = useState<BlockNoteContent|undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);
  
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
        }, 5000); // 5 second debounce
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
    <div className="relative flex-1 p-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden   ">
      <BlocknoteEditor
        initialContent={note.content}
        onChangeContent={handleContentChange}
        editable={true}
      />
    </div>
  );
};
