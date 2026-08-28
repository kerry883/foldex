import { create } from 'zustand';


// Define the possible views
type CanvasView = 'note' | 'ytvideo' | 'code' | 'idle' |'mermaid'|'aivideo';

interface CodeSnippetData {
  title: string;
  language: string;
  code: string;
  description?: string;
}
interface MermaidData {
  title:string;
  diagram:string;
  description?:string;
}

interface ytvideoData {
  title:string;
  videoId:string;
}
interface aiVideoData {
  src:string;
  title:string;
  poster:string;
  description?:string;
}

interface CanvasStore {
  // UI State
  isCanvasOpen: boolean;
  activeView: CanvasView;

  // Data State
  activeNoteId: string| null;
  activeYtVideo: ytvideoData | null; 
  activeCodeSnippet: CodeSnippetData | null; // For the code execution panel
  activeMermaid: MermaidData | null; // For the mermaid panel
  activeAiVideo: aiVideoData | null;
  // Actions
  setCanvasOpen: (isOpen: boolean) => void;
  openNote: (noteId: string) => void;
  openYtVideo: (videoId: ytvideoData) => void;
  openCode: (code: CodeSnippetData) => void;
  openMermaid: (mermaid: MermaidData) => void;
  openAivideo: (aivideo: aiVideoData) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  isCanvasOpen: false,
  activeView: 'idle',
  activeNoteId: null,
  activeYtVideo: null,
  activeCodeSnippet: null,
  activeMermaid: null,
  activeAiVideo:null,

  setCanvasOpen: (isOpen) => set({ isCanvasOpen: isOpen }),

  openNote: (noteId) => set({ 
    isCanvasOpen: true, 
    activeView: 'note', 
    activeNoteId: noteId 
  }),

  openYtVideo: (ytvideo) => set({ 
    isCanvasOpen: true, 
    activeView: 'ytvideo', 
    activeYtVideo: ytvideo 
  }),

  openCode: (code) => set({
    isCanvasOpen: true,
    activeView: 'code',
    activeCodeSnippet: code
  }),
  openMermaid: (mermaid) => set({
    isCanvasOpen: true,
    activeView: 'mermaid',
    activeMermaid: mermaid
  }),
  openAivideo:(aivideo)=>set({
    isCanvasOpen:true,
    activeView:'aivideo',
    activeAiVideo:aivideo
  }),
}));