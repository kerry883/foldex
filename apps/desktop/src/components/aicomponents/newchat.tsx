import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
  PromptInputProvider,
} from "@/components/ai-elements/prompt-input";
import { GlobeIcon, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Suggestion, Suggestions } from "../ai-elements/suggestion";
import { useApiKeys } from "@/hooks/use-settings";
import { getAvailableModels } from "@/lib/providers";
import { toast } from "sonner";
import { ChatHistoryPopover } from "./chathistorypopover";
import { useCreateChat } from "@/hooks/use-chat";
import { useAiStore } from "@/stores/aistore";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSession } from "@/hooks/use-auth";
import { useFolders } from "@/hooks/use-folders";
import { useNotes } from "@/hooks/use-notes";
import type { SuggestionItem } from "./suggestion-list";
import { PromptTipTapEditor } from "./aitextarea";
import { type ParsedAttachment, useFileParser } from "@/hooks/use-file-parser";
import { useNavigate } from "@tanstack/react-router";


const PromptInputAttachmentsDisplay = ({ 
  parseStates, 
  onRemoveParsed 
}: { 
  parseStates: Map<string, ParsedAttachment>,
  onRemoveParsed: (id: string) => void 
}) => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          parseState={parseStates.get(attachment.id)} 
          onRemove={() => {
            attachments.remove(attachment.id); // Removes from UI
            onRemoveParsed(attachment.id);     // Removes from your custom hook's Map!
          }}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

const BackgroundParserWatcher = ({ parse }: { parse: any }) => {
  const attachments = usePromptInputAttachments();
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    attachments.files.forEach((filePart) => {
      if (!prevIdsRef.current.has(filePart.id) && filePart.type === "file") {
        prevIdsRef.current.add(filePart.id);
        parse(filePart.id, filePart); // starts immediately on add
      }
    });
  }, [attachments.files, parse]);

  return null; // It renders nothing visually!
};

const suggestions = [
    "Help Me Study",
    "Help Me with my Homework",
    "Help Me Prepare for my Exam",
    "Create a Note ",
]

export default function NewChatComponent() {
  const [text, setText] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const {mutateAsync:createChat,isPending:isCreatingChat}=useCreateChat();
     
  const {setPendingMessage,setBody}=useAiStore();
  const isOnline = useOnlineStatus();
  const {data:user}=useSession();
  const [contextFolder, setContextFolder] = useState<{id:string,name: string}[]>([]);
  const [contextNote, setContextNote] = useState<{id:string,title: string}[]>([]);
  const {data:allFolders}=useFolders();
  const {data:allNotes}=useNotes();
  const { state: parseStates, parse, remove: removeParsed,hasErrors, isParsing, buildContext } = useFileParser();
  const naviagate = useNavigate()
  

  // Dynamic models from configured API keys
  const { data: apiKeys,isLoading:isapiloading } = useApiKeys();
  const configuredProviders = useMemo(
    () => (apiKeys ?? []).map(k => k.provider),
    [apiKeys]
  );
  const availableModels = useMemo(
    () => getAvailableModels(configuredProviders),
    [configuredProviders]
  );
  const hasTavilyKey = configuredProviders.includes("tavily");
  const [model, setModel] = useState<string>("");
  
  const [greeting, setGreeting] = useState<string>("How can I help you today?");

  
  useEffect(() => {
    const hour = new Date().getHours();
    const userName = user?.user.name || "User" ; 

    const morning = [
      `Good morning, ${userName} ☀️`, 
      `Early bird catches the worm, ${userName}!`, 
      `Ready to crush it today, ${userName}?`
    ];
    const afternoon = [
      `Good afternoon, ${userName} 👋`, 
      `Back at it, ${userName}?`, 
      `Keep up the momentum, ${userName}!`
    ];
    const evening = [
      `Good evening, ${userName} 🌙`, 
      `${userName} returns! 🔥`, 
      `Ready to study, ${userName}?`
    ];
    const night = [
      `Late night session, ${userName}? 🦉`, 
      `Burning the midnight oil, ${userName}?`, 
      `Still awake, ${userName}?`
    ];

    let options = [];
    if (hour < 12) options = morning;
    else if (hour < 17) options = afternoon;
    else if (hour < 22) options = evening;
    else options = night; // 10 PM to Midnight

    // Pick a random greeting from the selected time block
    const randomGreeting = options[Math.floor(Math.random() * options.length)];
    setGreeting(randomGreeting);
  }, []);

  // Set default model once available
  const selectedModel = model || (availableModels.length > 0 ? availableModels[0].model.id : "");

  

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) return;
    if (!selectedModel) {
      toast.error("No AI model available. Add an API key in Settings → API Keys.");
      return;
    }
    if (!isOnline) {
      toast.error("You're offline. AI features require an internet connection.");
      return;
    }

    const parsedFileContext = buildContext();
    
     try {
      const title =
        message.text.slice(0, 50) + (message.text.length > 50 ? "..." : "");
      const chat = await createChat({ title });
     // Don't generate title here - wait for AI response in page's chat component

      setPendingMessage(message);
      setBody({
        webSearch:useWebSearch,
        model:selectedModel,
        contextFolder:contextFolder,
        contextNote:contextNote,
        filecontext:parsedFileContext
      });
      naviagate({
        to:"/chat/$chatId",
        params:{chatId:chat.id}
      })
      
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setText(suggestion);
  };

  const mentionItems: SuggestionItem[] = [
    ...(allFolders?.map(f => ({ id: f.id, label: f.name, type: 'folder' as const })) || []),
    ...(allNotes?.map(n => ({ id: n.id, label: n.title, type: 'note' as const })) || []),
  ]

   const handleMentionsChange = (extractedMentions: {id: string, type: string}[]) => {
    // Filter the original data arrays to match the IDs extracted from the Tiptap JSON
    if (allFolders) {
      setContextFolder(allFolders.filter(f => extractedMentions.some(m => m.id === f.id && m.type === 'folder')))
    }
    if (allNotes) {
      setContextNote(allNotes.filter(n => extractedMentions.some(m => m.id === n.id && m.type === 'note')))
    }
  }
  const promptItems: SuggestionItem[] = [
    {
      id: "summarize",
      label: "Summarize",
      type: "prompt",
      description: "Create a detailed summary of the attached documents",
      promptText: "Please provide a comprehensive summary of the attached materials. Break it down into key themes, main arguments, and actionable takeaways."
    },
    {
      id: "quiz",
      label: "Quiz Me",
      type: "prompt",
      description: "Generate 5 practice questions",
      promptText: "Act as an expert tutor. Based on this material, generate 5 challenging multiple-choice questions to test my understanding. Do not provide the answers until I respond."
    }
  ]
  
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      {/* header */}
      <div className="flex items-center p-2 gap-2">
        <SidebarTrigger className="cursor-pointer" />
        <ChatHistoryPopover />
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center">
        <div className="p-4 flex justify-center items-center">
          <h1 className="text-3xl font-bold">{greeting}</h1>
        </div>

        {!isapiloading &&availableModels.length === 0 && !isapiloading && (
          <div className="text-center text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-muted/50 border border-border/60">
            No AI models available. Go to{" "}
            <p className="text-primary underline">Settings → API Keys</p>{" "}
            to add a provider key.
          </div>
        )}
        {isapiloading && (
          <div className="text-center flex-row text-sm text-muted-foreground  p-4 justify-center items-center rounded-lg bg-muted/50 border border-border/60">
            Loading your apikeys ...
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"  />
          </div>
        )}
        {!isOnline && (
          <div className="text-center text-sm text-amber-600 dark:text-amber-400 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            You&apos;re offline. AI chat requires an internet connection. Notes &amp; folders still work.
          </div>
        )}

      <PromptInputProvider>
        <BackgroundParserWatcher parse={parse} />
        <PromptInput
          onSubmit={handleSubmit}
          className="mt-4"
          globalDrop
          multiple
        >
          <PromptInputHeader>
            <PromptInputAttachmentsDisplay parseStates={parseStates} onRemoveParsed={removeParsed} />
          </PromptInputHeader>
          <PromptInputBody>
            <PromptTipTapEditor
                 mentionItems={mentionItems}
                 promptItems={promptItems}
                 onMentionsChange={handleMentionsChange}
                 onUpdate={(newtext)=>setText(newtext)}
                 onSubmit={(_text, currentMentions) => {
                   const form = document.querySelector('.tiptap')?.closest('form') as HTMLFormElement
                   if (form && typeof form.requestSubmit === 'function') {
                     form.requestSubmit()
                   }
                 }}
               />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger className="cursor-pointer" />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments className="cursor-pointer" />
                  <PromptInputActionAddScreenshot className="cursor-pointer" />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputButton
                onClick={() => {
                  if (!hasTavilyKey) {
                    toast.error("Add a Tavily API key in Settings to enable web search");
                    return;
                  }
                  setUseWebSearch(!useWebSearch);
                }}
                tooltip={{ content: hasTavilyKey ? "Search the web" : "Tavily key required", shortcut: "⌘K" }}
                variant={useWebSearch ? "default" : "ghost"}
                disabled={!hasTavilyKey}
                className="cursor-pointer"
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              {availableModels.length > 0 && (
                <PromptInputSelect
                  onValueChange={(value) => setModel(value)}
                  value={selectedModel}
                >
                  <PromptInputSelectTrigger>
                    <PromptInputSelectValue className="cursor-pointer" />
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {availableModels.map(({ model: m, providerIcon }) => (
                      <PromptInputSelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2 cursor-pointer">
                          {providerIcon && (
                            <img src={providerIcon} alt="" className="h-4 w-4" />
                          )}
                          <span>{m.name}</span>
                        </div>
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              )}
            </PromptInputTools>
            <PromptInputSubmit disabled={ !text || isParsing || hasErrors || !selectedModel || !isOnline} />
          </PromptInputFooter>
        </PromptInput>
        </PromptInputProvider>
      </div>
    </div>
  );
}