
import type { CreateFolderBody, Folder, UpdateFolderBody } from "@/lib/api-types"

import * as localFolders from "@/lib/services/localfolders"

import { queryKeys } from "@/lib/query-keys"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"


export const useFolders = () =>{
    return useQuery({
        queryKey:queryKeys.folders.all,
        queryFn: async () =>(await localFolders.getusersfolders()) as unknown as Folder[]
    })
}

export const useFolder = (id:string)=>{
    return useQuery({
        queryKey:queryKeys.folders.detail(id),
        queryFn: async () =>(await localFolders.getfolderbyid(id)) as unknown as Folder,
        enabled:!!id
    })
}

export const useCreateFolder = () =>{
  const queryclient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateFolderBody) => {
        const folder = await localFolders.createfolder(data.name, data.parentId, data.isPinned, data.color);
        return folder as unknown as Folder;
    },
    onSuccess:()=>{
        queryclient.invalidateQueries({queryKey:queryKeys.folders.all})
    }
  })
}

export const useUpdateFolder = () =>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async ({id, data}: {id: string, data: UpdateFolderBody}) => {
            const folder = await localFolders.updatefolder(id, data.name, data.parentId ?? undefined, data.isPinned, data.color);
            return folder as unknown as Folder;
        },
        onSuccess:(updatedfolder: any)=>{
            if (updatedfolder?.id) {
                queryclient.setQueryData(queryKeys.folders.detail(updatedfolder.id), updatedfolder)
            }
            queryclient.invalidateQueries({queryKey:queryKeys.folders.all})
        }
    })
}

export const useDeleteFolder = () =>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const result = await localFolders.deletefolder(id);
            return result as unknown as {success: boolean};
        },
        onSuccess:()=>{
            queryclient.invalidateQueries({queryKey:queryKeys.folders.all})
            queryclient.invalidateQueries({queryKey:queryKeys.notes.all})
        }
    })
}