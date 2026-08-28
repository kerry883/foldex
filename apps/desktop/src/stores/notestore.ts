import { create } from 'zustand';


interface NoteStore {
  folderId: string | null;
  setFolderId: (id: string) => void;
  }

export const useNoteStore = create<NoteStore>((set) => ({
  folderId: null,
  setFolderId: (id) => set({ folderId: id }),
}));