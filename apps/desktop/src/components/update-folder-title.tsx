import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useFolder, useUpdateFolder } from "@/hooks/use-folders";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";

interface UpdateTitleProps {
  folderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UpdateFolderTitle = ({ folderId, open, onOpenChange }: UpdateTitleProps) => {
  const {mutateAsync:updateTitle} = useUpdateFolder();
  const {data:folder} = useFolder(folderId);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (folder && open) {
      queueMicrotask(() => {
        setTitle(folder.name);
      });
    }
  }, [folder, open]);
  const handlerename = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateTitle({ id: folderId, data: { name: title } });
      setLoading(false);
      onOpenChange(false);
      toast.success("Folder renamed successfully");
    } catch (error) {
      console.log(error);
      setError("Failed to rename folder.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
        </DialogHeader>
        <div>
          <Input
             value={title}
             onChange={(e:any) => setTitle(e.target.value)}
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
          <Button disabled={loading} onClick={handlerename} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rename
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateFolderTitle;