import { create } from 'zustand';
import { type PromptInputMessage } from '@/components/ai-elements/prompt-input';


export type AiContext =
  | { type: 'folder'; id: string; name: string }
  | { type: 'file'; id: string; name: string }
  | { type: 'note'; id: string; name: string }
  | null;

interface Aibody {
  webSearch: boolean;
  contextFolder?: {
    id:string,
    name:string
  }[];
  contextNote?: {
    id:string,
    title:string
  }[];
  model: string;
  filecontext?:string;
}
interface AiStore {
  isOpen: boolean;
  activeChatId: string | null;
  context: AiContext;
  pendingMessage: PromptInputMessage | null;
  body: Aibody;
  activeNoteId: string | null; // Tracks the open note
  isNotePanelOpen: boolean;         // Tracks if the panel is open
  // Actions
  onOpen: (context?: AiContext) => void;
  onClose: () => void;
  toggle: () => void;
  setActiveChatId: (id: string | null) => void;
  setContext: (context: AiContext) => void;
  setPendingMessage: (message: PromptInputMessage | null) => void;
  setBody: (body: Aibody) => void;
  setActiveNoteId: (id:string | null) => void;
  setIsNotePanelOpen: (open: boolean) => void;
}

export const useAiStore = create<AiStore>((set) => ({
  isOpen: false,
  activeChatId: null,
  context: null,
  pendingMessage: null,
  body: {
    webSearch: false,
    contextFolder: [],
    contextNote: [],
    model:"",
    filecontext:""
  },
  activeNoteId: null,
  isNotePanelOpen: false,

  onOpen: (context) => set({ isOpen: true, context: context || null }),
  onClose: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setActiveChatId: (id) => set({ activeChatId: id }),
  setContext: (context) => set({ context }),
  setPendingMessage: (message) => set({ pendingMessage: message }),
  setBody: (body) => set({ body }),
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setIsNotePanelOpen: (open) => set({ isNotePanelOpen: open }),
}));