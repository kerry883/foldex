import { hc } from "hono/client"
import type { InferRequestType, InferResponseType } from "hono/client"
import type { AppType } from "backend/app"

const apiUrl = import.meta.env.VITE_API_URL ?? "https://api.foldex.space"

export const client = hc<AppType>(apiUrl, {
  init: { credentials: "include" },
})

type ClientResult = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

async function unwrap<T>(res: ClientResult | Promise<ClientResult>): Promise<T> {
  const resolved = await res
  const data = (await resolved.json()) as T & { error?: string }
  if (!resolved.ok) {
    throw new Error(data?.error ?? `Request failed (${resolved.status})`)
  }
  return data
}

const videos = client.api.videos

export type Video = InferResponseType<typeof videos[":id"]["$get"], 200>
export type GetVideoStatusResponse = InferResponseType<
  typeof videos[":id"]["getstatus"]["$get"],
  200
>
export type CreateVideoBody = InferRequestType<typeof videos.generate.$post>["json"]
export type UpdateVideoBody = InferRequestType<typeof videos[":id"]["$put"]>["json"]
export type FeedbackBody = InferRequestType<
  typeof videos[":id"]["feedback"]["$post"]
>["json"]
export type FeedbackResponse = InferResponseType<
  typeof videos[":id"]["feedback"]["$post"],
  200
>
export type UserFeedbackResponse = InferResponseType<
  typeof videos[":id"]["feedback"]["$get"],
  200
>

export const videoapi = {
  my: (folderId?: string) =>
    unwrap<InferResponseType<typeof videos.my.$get, 200>>(
      videos.my.$get({ query: folderId ? { folderId } : {} }),
    ),
  public: () => unwrap<Video[]>(videos.$get()),
  get: (id: string) => unwrap<Video>(videos[":id"].$get({ param: { id } })),
  getstatus: (id: string) =>
    unwrap<GetVideoStatusResponse>(videos[":id"].getstatus.$get({ param: { id } })),
  generate: (body: CreateVideoBody) =>
    unwrap<InferResponseType<typeof videos.generate.$post, 202>>(
      videos.generate.$post({ json: body }),
    ),
  update: (id: string, body: UpdateVideoBody) =>
    unwrap<InferResponseType<typeof videos[":id"]["$put"], 200>>(
      videos[":id"].$put({ param: { id }, json: body }),
    ),
  delete: (id: string) =>
    unwrap<InferResponseType<typeof videos[":id"]["$delete"], 200>>(
      videos[":id"].$delete({ param: { id } }),
    ),
  submitFeedback: (id: string, body: FeedbackBody) =>
    unwrap<FeedbackResponse>(
      videos[":id"].feedback.$post({ param: { id }, json: body }),
    ),
  getFeedback: (id: string) =>
    unwrap<UserFeedbackResponse>(videos[":id"].feedback.$get({ param: { id } })),
  retry: (id: string, body: { code: string; sceneName: string }) =>
    unwrap<InferResponseType<typeof videos[":id"]["retry"]["$post"], 202>>(
      videos[":id"].retry.$post({ param: { id }, json: body }),
    ),
}
