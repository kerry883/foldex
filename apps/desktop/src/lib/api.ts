import apiClient from "./api-client"
import type { CreateVideoBody, FeedbackBody, FeedbackResponse, GenerateFromPromptBody, GetVideoStatusResponse,  Template, UpdateVideoBody, UserFeedbackResponse,  Video } from "./api-types"


export const templateapi = {
  community:()=>
    apiClient.get<Template[]>('/api/templates/community').then(r=>r.data),
}


export const videoapi = {
  my:(folderId?:string)=>
    apiClient.get<Video[]>('/api/videos/my',{params:folderId ? {folderId}: {}}).then(r=>r.data),
  public:()=>
    apiClient.get<Video[]>('/api/videos').then(r=>r.data),
  get:(id:string)=> apiClient.get<Video>(`/api/videos/${id}`).then(r=>r.data),
  getstatus:(id:string)=> apiClient.get<GetVideoStatusResponse>(`/api/videos/${id}/getstatus`).then(r=>r.data),
  generate:(body:CreateVideoBody)=>
    apiClient.post<{success:boolean, videoId:string, remaining:number}>('/api/videos/generate',body).then(r=>r.data),
  generateFromPrompt:(body:GenerateFromPromptBody)=>
    apiClient.post<{success:boolean, videoId:string, remaining:number}>('/api/videos/generate-from-prompt',body).then(r=>r.data),
  update:(id:string,body:UpdateVideoBody)=> apiClient.put<Video>(`/api/videos/${id}`,body).then(r=>r.data),
  delete:(id:string)=> apiClient.delete<{success:boolean}>(`/api/videos/${id}`).then(r=>r.data),
  submitFeedback:(id:string, body:FeedbackBody)=>
    apiClient.post<FeedbackResponse>(`/api/videos/${id}/feedback`,body).then(r=>r.data),
  getFeedback:(id:string)=>
    apiClient.get<UserFeedbackResponse>(`/api/videos/${id}/feedback`).then(r=>r.data),
  retry:(id:string, body?: {code: string, sceneName: string})=>
    apiClient.post<{success:boolean, videoId:string, explanation:string}>(`/api/videos/${id}/retry`, body).then(r=>r.data),
}
