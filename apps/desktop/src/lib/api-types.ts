// BlockNote stores documents as an array of block objects.
// jsonb in PostgreSQL is automatically parsed by Drizzle,
// so by the time it reaches the frontend via Axios it's already
// a JavaScript array — no JSON.parse() needed.
export type BlockNoteContent = Record<string, unknown>[] | null;

export type Note = {
  id: string;
  title: string;
  folderId: string | null;
  content: BlockNoteContent;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NoteListItem = Omit<Note, "content"> & { preview: string | null };

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  isPinned: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
  children?: Folder[];
};

export type Template = {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  schemapayload: unknown;
  ispublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Chat = {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  chatId: string;
  role: string;
  content: string;
  parts: unknown;
};

export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  user: User;
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
};

// request body types — what you SEND to the backend
export type CreateNoteBody = {
  title?: string;
  content?: BlockNoteContent;
  folderId?: string;
  isPinned?: boolean;
};

export type UpdateNoteBody = {
  title?: string;
  content?: BlockNoteContent;
  folderId?: string | null;
  isPinned?: boolean;
};

export type CreateFolderBody = {
  name: string;
  parentId?: string;
  isPinned?: boolean;
  color?: string;
};

export type UpdateFolderBody = {
  name?: string;
  parentId?: string | null;
  isPinned?: boolean;
  color?: string;
};

export type CreateTemplateBody = {
  name: string;
  description?: string;
  schemapayload: unknown;
  isPublic?: boolean;
};

export type CreateChatBody = {
  title: string;
};

export type AddMessageBody = {
  role: string;
  content: string;
  parts: unknown;
};

// Settings / API Keys
export type ApiKeyInfo = {
  provider: string;
  displayHint: string;
  isValid: boolean;
  updatedAt: string;
};

export type UserSettings = {
  systemPrompt: string | null;
  defaultSystemPrompt: string;
};

export type KeyValidationResult = {
  valid: boolean;
  error?: string;
};

export type GetVideoStatusResponse = {
  id: string;
  status: string; // "queued" | "generating" | "ready" | "failed"
  videoUrl: string | null;
  thumbnail: string | null;
  error: string;
};

export type CreateVideoBody = {
  title: string;
  sceneName: string;
  code: string;
  folderId?: string;
  description?: string;
  prompt?: string;
};

export type Video = {
    id:string,
    userId: string,
    folderId: string | null,
    title: string,
    description: string | null,
    transcript: string | null,
    url: string,
    filesize: number,
    thumbnail: string,
    prompt: string,
    isPublic: boolean,
    status: string,    
    sources: { title: string, url: string, snippet: string }[], 
    creatorname: string,
    creatorprofile: string,
    code: string,
    model: string | null,
    tags: string[] | null,
    errorTraceback: string,    
    likes: number,
    dislikes: number,    
    createdAt: string,
    updatedAt: string,
};

export type UpdateVideoBody = {
    id:string,
    folderId?: string | null,
    isPublic?: boolean,
};

export type GenerateFromPromptBody = {
    prompt: string;
    model: string;
    fileContext?: string;
    folderId?: string;
};

export type FeedbackBody = {
    type: 'like' | 'dislike';
    tags?: string[];
};

export type FeedbackResponse = {
    success: boolean;
    action: 'created' | 'switched' | 'removed';
    currentVote: 'like' | 'dislike' | null;
};

export type UserFeedbackResponse = {
    currentVote: 'like' | 'dislike' | null;
    tags: string[] | null;
};
