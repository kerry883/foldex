
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNote, useUpdateNote } from "@/hooks/use-notes";

interface UpdateTitleProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UpdateTitle = ({ noteId, open, onOpenChange }: UpdateTitleProps) => {
  const {mutateAsync:updateTitle} = useUpdateNote();
  const {data:note} = useNote(noteId);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (note && open) {
      queueMicrotask(() => {
        setTitle(note.title);
      });
    }
  }, [note, open]);
  const handlerename = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateTitle({ id: noteId, data: { title: title } });
      setLoading(false);
      onOpenChange(false);
      toast.success("Note renamed successfully");
    } catch (error) {
      console.log(error);
      setError("Failed to rename note.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Note</DialogTitle>
        </DialogHeader>
        <div>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {if (e.key === "Enter") handlerename()}}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button disabled={loading} onClick={handlerename}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rename
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateTitle;