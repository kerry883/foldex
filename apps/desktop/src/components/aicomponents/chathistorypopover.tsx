import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router'; 

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  ChevronsUpDown,
  MessageSquare,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronsDown,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useChats, useDeleteChat, useUpdateChat } from '@/hooks/use-chat';
import type { Chat } from '@/lib/api-types';

export function ChatHistoryPopover() {
  const { data: chats } = useChats();
  
 
  const navigate = useNavigate();
  // strict: false allows this component to exist on /chat (no ID) without crashing
  const { chatId } = useParams({ strict: false }); 

  // Mutations
  const { mutateAsync: deleteChat } = useDeleteChat();
  const { mutateAsync: updateChat } = useUpdateChat();

  // Dialog state
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const currentChat = chats?.find((c) => c.id === chatId);
  const otherChats = chats?.filter((c) => c.id !== chatId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // ---------- Handlers ----------
  const handleRenameClick = (chat: Chat) => {
    setSelectedChat(chat);
    setNewTitle(chat.title);
    setRenameDialogOpen(true);
  };

  const handleDeleteClick = (chat: Chat) => {
    setSelectedChat(chat);
    setDeleteAlertOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!selectedChat || !newTitle.trim()) return;
    try {
      await updateChat({ id: selectedChat.id, data: { title: newTitle.trim() } });
      toast.success('Chat renamed successfully!');
      setRenameDialogOpen(false);
      setSelectedChat(null);
      setNewTitle('');
    } catch (e) {
      toast.error('Failed to rename chat.');
      console.error(e);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedChat) return;
    try {
      await deleteChat(selectedChat.id);
      toast.success('Chat deleted.');
      setDeleteAlertOpen(false);
      
      //  TanStack Navigation: If they deleted the active chat, kick them to New Chat
      if (chatId === selectedChat.id) {
        navigate({ to: '/chat' });
      }
      
      setSelectedChat(null);
    } catch (e) {
      toast.error('Failed to delete chat.');
      console.error(e);
    }
  };

  // ---------- UI ----------
  return (
    <>
      {/* ---------- POPOVER ---------- */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="text-lg font-bold gap-2 px-2 cursor-pointer"
          >
            <span className="truncate max-w-48">
              {currentChat ? currentChat.title : 'New Chat'}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>

        {/* ---- POPOVER CONTENT ---- */}
        <PopoverContent
         className="w-80 p-0 flex flex-col max-h-96"  
        >
           <ScrollArea className="flex-1 overflow-auto scrollbar-hidden">
            <div className="p-2">
              {otherChats && otherChats.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground px-2">
                    Recent Chats
                  </p>

                  {otherChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="group flex items-center justify-between w-80 pr-2"
                    >
                      {/* Chat link */}
                      <Button
                        variant="ghost"
                        className="flex-1 justify-start gap-2 font-normal truncate cursor-pointer"
                        // 4. TanStack Navigation: Clean, strictly typed path!
                        onClick={() => navigate({ 
                          to: '/chat/$chatId', 
                          params: { chatId: chat.id } 
                        })}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="truncate">{chat.title}</span>
                      </Button>

                      {/* Three-dot menu (visible on hover) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            onSelect={() => handleRenameClick(chat)}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => handleDeleteClick(chat)}
                            className="text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No recent chats
                </div>
              )}
            </div>
      
             </ScrollArea>
          {/* New-chat button (always at bottom) */}
          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 cursor-pointer"
              //  TanStack Navigation: Back to root chat page
              onClick={() => navigate({ to: '/chat' })}
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* ---------- RENAME DIALOG ---------- */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new title for your chat: &quot;
              {selectedChat?.title || ''}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={e=>e.key === "Enter" && handleRenameSubmit()}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} className="cursor-pointer">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- DELETE ALERT ---------- */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat history.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}