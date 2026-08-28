
import type { CreateNoteBody, Note, NoteListItem, UpdateNoteBody } from "@/lib/api-types";
import * as localNotes from "@/lib/services/localnotes";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useNotes(folderId?:string){
  return useQuery({
    queryKey: queryKeys.notes.list(folderId),
    queryFn: async () =>(await localNotes.getusersnotes(folderId)) as unknown as NoteListItem[],
  })
}

export const useNote = (id:string)=>{
  return useQuery({
    queryKey:queryKeys.notes.detail(id),
    queryFn: async () => (await localNotes.getnote(id)) as unknown as Note,
    enabled:!!id,
  })
}

export const useCreateNote = () =>{
  const queryclient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateNoteBody) => {
        const note = await localNotes.createnote(data.title ?? "untitled", data.folderId, data.content);
        return note as unknown as Note;
    },
    onSuccess:()=>{
      queryclient.invalidateQueries({queryKey:queryKeys.notes.all})
    }
  })
}

export const useUpdateNote = () =>{
  const queryclient = useQueryClient();
  return useMutation({
    mutationFn: async ({id, data}: {id: string, data: UpdateNoteBody}) => {
        const note = await localNotes.updatenote(id, data.title, data.content as any, data.folderId ?? undefined, data.isPinned);
        
        return note as unknown as Note
    },
    onSuccess:(updatedNote: any)=>{
      if (updatedNote?.id) {
        queryclient.setQueryData(queryKeys.notes.detail(updatedNote.id), updatedNote)
      }
      queryclient.invalidateQueries({queryKey:queryKeys.notes.all})
    }
  })
}

export const useDeleteNote = () =>{
  const queryclient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
        const result = await localNotes.deletenote(id);
        return result as unknown as {success: boolean};
    },
    onSuccess:(_,id)=>{
        queryclient.removeQueries({queryKey:queryKeys.notes.detail(id)})
        queryclient.invalidateQueries({queryKey:queryKeys.notes.all})
    }
  })
}

export const useMoveNote = () =>{
  const queryclient = useQueryClient();
  return useMutation({
    mutationFn: async ({id, folderId}: {id: string, folderId: string | null}) => {
        const note = await localNotes.movenote(id, folderId);
        return note as unknown as Note;
    },
    onSuccess:()=>{
      queryclient.invalidateQueries({queryKey:queryKeys.notes.all})
    }
  })
}
