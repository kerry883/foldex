
export const queryKeys = {
  notes: {
    all: ["notes"] as const,
    list: (folderId?: string) => ["notes", "list", folderId ?? "all"] as const,
    detail: (id: string) => ["notes", "detail", id] as const,
  },
  folders: {
    all: ["folders"] as const,
    tree: () => ["folders", "tree"] as const,
    detail:(id:string)=>["folders","detail",id] as const,
  },
  templates: {
    all: ["templates"] as const,
    mine: () => ["templates", "mine"] as const,
    community: () => ["templates", "community"] as const,
    detail: (id: string) => ["templates", "detail", id] as const,
  },
  chats: {
    all: ["chats"] as const,
    list: () => ["chats", "list"] as const,
    detail: (id: string) => ["chats", "detail", id] as const,
  },
  auth: {
    session: ["auth", "session"] as const,
  },
  settings: {
    keys: ["settings", "keys"] as const,
    userSettings: ["settings", "userSettings"] as const,
  },
  videos:{
    all:["videos"] as const,
    mine:()=>["videos","mine"] as const,
    public:()=>["videos","public"] as const,
    detail:(id:string)=>["videos","detail",id] as const,
  }
};