import type { CreateTemplateBody, Note, Template } from "@/lib/api-types"
import * as localTemplates from "@/lib/services/localtemplates"
import { queryKeys } from "@/lib/query-keys"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"


export const useMyTemplates = () =>{
    return useQuery({
        queryKey:queryKeys.templates.mine(),
        queryFn: async () =>(await localTemplates.getmytemplates()) as unknown as Template[]
    })
}

export const useCommunityTemplates = () =>{
    return useQuery({
        queryKey:queryKeys.templates.community(),
        queryFn: async () =>
            ((await localTemplates.getmytemplates()) as unknown as Template[]).filter(
                (template) => template.ispublic,
            ),
    })
}

export const useTemplate = (id:string) =>{
    return useQuery({
        queryKey:queryKeys.templates.detail(id),
        queryFn: async () =>(await localTemplates.gettemplate(id)) as unknown as Template,        
        enabled:!!id
    })
}

export const useCreateTemplate = () =>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateTemplateBody) => {
            const tmpl = await localTemplates.createtemplate(data.name, data.schemapayload, data.description, data.isPublic);
            return tmpl as unknown as Template;
        },
        onSuccess:()=>{
            queryclient.invalidateQueries({queryKey:queryKeys.templates.all})
        }
    })
}

export const useCreateTemplateFromNote = () =>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async ({noteId, body}: {noteId: string, body: {title: string, description: string, ispublic: boolean}}) => {
            const tmpl = await localTemplates.createtemplatefromnote(noteId, body.title, body.description, body.ispublic);
            return tmpl as unknown as Template;
        },
        onSuccess:()=>{
            queryclient.invalidateQueries({queryKey:queryKeys.templates.all})
        }
    })
}

export const useApplyTemplate = () =>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async ({id, noteId}: {id: string, noteId?: string}) =>(await localTemplates.applytemplate(id, noteId)) as unknown as Note,
        onSuccess:()=>{
            queryclient.invalidateQueries({queryKey:queryKeys.templates.all})
            queryclient.invalidateQueries({queryKey:queryKeys.notes.all})
        }
    })
}

export const useUpdateTemplate = () =>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async ({id, data}: {id: string, data: Partial<CreateTemplateBody>}) => {
            const tmpl = await localTemplates.updatetemplate(id, data.name, data.schemapayload, data.description, data.isPublic);
            return tmpl as unknown as Template;
        },
        onSuccess:(updatedTemplate: any)=>{
            if (updatedTemplate?.id) {
                queryclient.setQueryData(queryKeys.templates.detail(updatedTemplate.id), updatedTemplate)
            }
            queryclient.invalidateQueries({queryKey:queryKeys.templates.all})
        }
    })
}

export const useDeleteTemplate = ()=>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const result = await localTemplates.deletetemplate(id);
            return result as unknown as {success: boolean};
        },
        onSuccess:()=>{
            queryclient.invalidateQueries({queryKey:queryKeys.templates.all})
        }
    })
}