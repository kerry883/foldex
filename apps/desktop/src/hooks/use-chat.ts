import type { AddMessageBody, Chat, CreateChatBody, Message } from "@/lib/api-types"
import * as localChats from "@/lib/services/localchats"
import { queryKeys } from "@/lib/query-keys"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"


export const useChats = ()=>{
    return useQuery({
        queryKey:queryKeys.chats.all,
        queryFn: async () => (await localChats.fetchchats()) as unknown as Chat[]
    })
}

export const useChatMessages = (id:string)=>{
    return useQuery({
        queryKey:queryKeys.chats.detail(id),
        queryFn: async () => (await localChats.getchat(id)) as unknown as Message[],
        enabled:!!id
    })
}

export const useCreateChat = () =>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateChatBody) => {
            const chat = await localChats.createchat(data.title);
            return chat as unknown as Chat;
        },
        onSuccess:()=>{
            queryclient.invalidateQueries({queryKey:queryKeys.chats.all})
        }
    })
}

export const useUpdateChat = () =>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async ({id, data}: {id: string, data: {title: string}}) => {
            const chat = await localChats.updatechat(id, data.title);
            return chat as unknown as Chat;
        },
        onSuccess:(updatedChat: any)=>{
            if (updatedChat?.id) {
                queryclient.setQueryData(queryKeys.chats.detail(updatedChat.id), updatedChat)
            }
            queryclient.invalidateQueries({queryKey:queryKeys.chats.all})
        }
    })
}

export const useDeleteChat = () =>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const result = await localChats.deletechat(id);
            return result as unknown as {success: boolean};
        },
        onSuccess:()=>{
            queryclient.invalidateQueries({queryKey:queryKeys.chats.all})
        }
    })
}

export const useAddMessage = () =>{
    const queryclient = useQueryClient();
    return useMutation({
        mutationFn: async ({id, body}: {id: string, body: AddMessageBody}) => {
            const msg = await localChats.addmessage(id, body.role, body.content, body.parts);
            return msg as unknown as Message;
        },
        onSuccess:(_, {id})=>{
            queryclient.invalidateQueries({queryKey:queryKeys.chats.detail(id)})
        }
    })
}