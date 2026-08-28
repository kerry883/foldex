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
import { useState, useMemo, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import type { DefaultChatTransport, UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "../ai-elements/reasoning";
import { useApiKeys } from "@/hooks/use-settings";
import { getAvailableModels } from "@/lib/providers";
import { toast } from "sonner";
import { useAiStore } from "@/stores/aistore";
import { useAddMessage, useChatMessages } from "@/hooks/use-chat";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ChatHistoryPopover } from "./chathistorypopover";
import { CreateFolder, CreateNote, GenerateCodeSnippet, GenerateMermaidDiagram, GenerateVideo, GetFolderItems, LoadingCodeSnippet, LoadingFolder, LoadingMermaidDiagram, LoadingNote, SourceGrid, UpdateFolder, UpdateNote, YouTubeEmbed } from "./toolui";
import { Tool, ToolContent, ToolHeader } from "../ai-elements/tool";
import { Spinner } from "@workspace/ui/components/spinner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { createClientTransport } from "@/lib/ai/client-transport";
import { useFolders } from "@/hooks/use-folders";
import { useNotes } from "@/hooks/use-notes";
import type { SuggestionItem } from "./suggestion-list";
import { PromptTipTapEditor } from "./aitextarea";
import { type ParsedAttachment, useFileParser } from "@/hooks/use-file-parser";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01FreeIcons, File02Icon, Folder01Icon, Globe02FreeIcons, Refresh01Icon } from "@hugeicons/core-free-icons";


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
  // Now this hook is safely INSIDE the provider!
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

export const formatMessageText = (text: string) => {
  if (!text) return text;
  
  // Hunt for our [[type::label]] secret code
  const regex = /\[\[(folder|note|file)::(.+?)\]\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add the normal text before the pill
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    const type = match[1];
    const label = match[2];
    
    // Swap the code for a beautiful UI Pill!
    parts.push(
      <span key={match.index} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-sm mx-1 align-middle border border-primary/20">
        {type === 'folder' && <HugeiconsIcon icon={Folder01Icon} size={12} />}
        {type === 'note' && <HugeiconsIcon icon={File02Icon} size={12} />}
        {label}
      </span>
    );
    
    lastIndex = regex.lastIndex;
  }
  
  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const AiChatComponent = ({chatId}:{chatId:string}) => {
  const [text, setText] = useState<string>("");
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const {data:initialMessages,isLoading:isLoadingInitialMessages}=useChatMessages(chatId);
  const {mutateAsync:addMessage,isPending:isPendingAddMessage}=useAddMessage();
  const [contextFolder, setContextFolder] = useState<{id:string,name: string}[]>([]);
    const [contextNote, setContextNote] = useState<{id:string,title: string}[]>([]);
    const {data:allFolders}=useFolders();
    const {data:allNotes}=useNotes();

  // Dynamic models
  const { data: apiKeys } = useApiKeys();
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
  const selectedModel = model || (availableModels.length > 0 ? availableModels[0].model.id : "");
  const isOnline = useOnlineStatus();
   const { state: parseStates, parse, remove: removeParsed, isParsing, buildContext } = useFileParser();
  const pendingMessageProcessedRef = useRef(false);
  const [hasProcessedPendingMessage, setHasProcessedPendingMessage] =
    useState(false);
  const { body } = useAiStore();

  const pendingMessage = useAiStore((state) => state.pendingMessage);
  const setPendingMessage = useAiStore((state) => state.setPendingMessage);
  const hasInitialized = useRef(false);

  // Desktop: run AI directly in browser via ClientChatTransport
  const transport = useMemo(() => {
      return createClientTransport();
  }, []);

  const { messages, status, sendMessage,setMessages,regenerate } = useChat({
    transport,
    id: chatId,
    onFinish: async (message) => {
        if (message.message.role === "assistant") {
          const textContent = message.message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n");
          await addMessage({
            id:chatId,
            body:{
              role: message.message.role,
              content: textContent,
              parts: message.message.parts,
            }
          });
        }
      },
    onError: (error) => {
      toast.error(error.message || "Something went wrong with the AI request");
    },
  });
  useEffect(() => {
      console.log("activeChatId", chatId);
      console.log("clearing old messages now ")
      hasInitialized.current = false; // Allow the new chat to load
      pendingMessageProcessedRef.current = false; 
      setMessages([]); // Clear old messages immediately to avoid "ghosting"
  }, [chatId, setMessages]);
  useEffect(() => {
    if (
      initialMessages &&
      initialMessages.length > 0 &&
      !hasInitialized.current
    ) {
      hasInitialized.current = true;
      const transformedMessages = initialMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        parts: msg.parts || [{ type: "text", text: msg.content }],
      }));

      setMessages(transformedMessages as unknown as UIMessage[]);
      console.log(" Loaded messages from database:", transformedMessages.length);
    }
  }, [initialMessages, setMessages]);

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
      await addMessage({
        id:chatId,
        body:{
          role: "user",
          content: message.text || "",
          parts: [{ type: "text", text: message.text }],
        },
      });
    } catch (error) {
      console.error("Failed to save user message:", error);
    }

    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: [],
      },
      {
        body: {
          model: selectedModel,
          webSearch: useWebSearch,
          contextFolder:contextFolder,
          contextNote:contextNote,
          filecontext:parsedFileContext
        },
      }
    );
    setText("");
  };
  useEffect(() => {
    const sendInitialMessage = async () => {
      // Check if there is a pending message and we haven't processed it yet
      if (
        pendingMessage &&
        !pendingMessageProcessedRef.current &&
        initialMessages &&
        initialMessages.length === 0
      ) {
        console.log("Sending pending message from store:", pendingMessage);
        pendingMessageProcessedRef.current = true;

        // Send the pending message
            
    
        setModel(body.model);
        setUseWebSearch(body.webSearch);
        try {
          await addMessage({
            id:chatId,
            body:{
              role: "user",
              content: pendingMessage.text || "",
              parts: [{ type: "text", text: pendingMessage.text }],
            }
            
          });
        } catch (error) {
          console.error("Failed to save user message:", error);
        }
        console.log("body", body);
        sendMessage(
          {
            text: pendingMessage.text || "",
            files: [],
          },
          {
            body: {
              webSearch: useWebSearch,
              model: selectedModel,
              contextFolder:body.contextFolder,
              contextNote:body.contextNote,
              filecontext:body.filecontext
            },
          },
        );
        // Clear the pending message from the store
        setPendingMessage(null);
        setHasProcessedPendingMessage(true);
      }
    };

    sendInitialMessage();
  }, [pendingMessage, initialMessages, setPendingMessage, body]);

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
    <div className=" p-6 relative size-full">
      <div className="flex flex-col h-full">
        <div className="flex gap-3 items-center">
        <SidebarTrigger />
        <ChatHistoryPopover />
      </div>
        <Conversation>
          <ConversationContent>
            {messages.map((message, messageIndex) => {
             // 1. Combine all text parts into one string for the Copy button
              const fullText = message.parts
                .filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("\n");

              // 2. Check if this is the very last message in the entire chat
              const isLastMessageInChat = messageIndex === messages.length - 1;
            return(
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                      return (
                          <MessageResponse key={`${message.id}-${i}`}  >
                            {part.text}
                          </MessageResponse>  
                        );
                       case "reasoning":
                          return (
                            <Reasoning
                              key={`${message.id}-${i}`}
                              className="w-full"
                              isStreaming={
                                status === "streaming" &&
                                i === message.parts.length - 1 &&
                                message.id === messages.at(-1)?.id
                              }
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );
                        
                        case "tool-createNote":
                          return (
                          <div key={`${message.id}-${i}`}>
                            {part.state === "input-available" && (
                              <LoadingNote title="Creating Note" />
                            )}
                            {part.state === "output-available" && (
                              <CreateNote output={part.output} />
                            )}
                          </div>
                        );
          

                      case "tool-updateNote":
                        return (
                          <div key={`${message.id}-${i}`}>
                            {part.state === "input-available" && (
                              <LoadingNote title="Updating Note" />
                            )}
                            {part.state === "output-available" && (
                              <UpdateNote output={part.output} />
                            )}
                          </div>
                        );
                
                      case "tool-getfolderitems":
                        return (
                          <Tool key={`${message.id}-${i}`}>
                            <ToolHeader
                              state={part.state}
                              type="tool-getfolderitems"
                              title="Analyzing Folder"
                            />
                            <ToolContent>
                              {part.state === "output-available" && (
                                <GetFolderItems output={part.output} />
                              )}
                            </ToolContent>
                          </Tool>
                        );
                      

                      
                      case "tool-searchTheWeb":
                        return (
                          <div key={`${message.id}-${i}`}>
                            {part.state === "input-available" && (
                              <div className="flex items-center gap-2">
                                <Spinner />{" "}
                                <p className="text-sm text-muted-foreground">
                                  Searching the Web
                                </p>
                              </div>
                            )}
                            {part.state === "output-available" && (
                              <SourceGrid output={part.output} />
                            )}
                          </div>
                        );
                      
                      case "tool-getNoteContent":
                        return (
                          <Tool key={`${message.id}-${i}`}>
                            <ToolHeader
                              state={part.state}
                              type="tool-getNoteContent"
                              title="Fetching Note Content"
                            />
                          </Tool>
                        );
                      
                      case "tool-generateCodeSnippet":
                        return (
                          <div key={`${message.id}-${i}`}>
                            {part.state === "input-available" && (
                              <LoadingCodeSnippet title="Generating Code" />
                            )}
                            {part.state === "output-available" && (
                              <GenerateCodeSnippet output={part.output} />
                            )}
                          </div>
                        );
                      
                      case "tool-generateMermaidDiagram":
                        return (
                          <div key={`${message.id}-${i}`}>
                            {part.state === "input-available" && (
                              <LoadingMermaidDiagram title="Generating Mermaid Diagram" />
                            )}
                            {part.state === "output-available" && (
                              <GenerateMermaidDiagram output={part.output} />
                            )}
                          </div>
                        );
                      
                      case "tool-youtubeVideo":
                        return (
                          <div key={`${message.id}-${i}`}>
                            {part.state === "output-available" && (
                              <YouTubeEmbed output={part.output} />
                            )}
                          </div>
                        );
                      
                      case "tool-createFolder":
                        return (
                          <div key={`${message.id}-${i}`}>
                            {part.state === "input-available" && (
                              <LoadingFolder title="Creating Folder" />
                            )}
                            {part.state === "output-available" && (
                              <CreateFolder output={part.output} />
                            )}
                          </div>
                        );
                      
                      case "tool-updateFolder":
                        return (
                          <div key={`${message.id}-${i}`}>
                            {part.state === "input-available" && (
                              <LoadingFolder title="Updating Folder" />
                            )}
                            {part.state === "output-available" && (
                              <UpdateFolder output={part.output} />
                            )}
                          </div>
                        );
                      
                      case "tool-generateVideo":
                        return (
                          <div key={`${message.id}-${i}`}>
                            {part.state === "output-available" && (
                              <GenerateVideo output={part.output} />
                            )}
                          </div>
                        );
                      
                      default:
                        return null;
                    }
                  })}
                  {message.role === "assistant" && (
                      <MessageActions>
                        {/* Only show Retry on the absolute last message */}
                        {isLastMessageInChat && (
                          <MessageAction
                            onClick={() => regenerate()}
                            label="Retry"
                            className="cursor-pointer"
                          >
                            <HugeiconsIcon icon={Refresh01Icon} className="size-3" />
                          </MessageAction>
                        )}

                        {/* Show Copy on every AI message, copying the combined text */}
                        <MessageAction
                          onClick={() => navigator.clipboard.writeText(fullText)}
                          label="Copy"
                          className="cursor-pointer"
                        >
                          <HugeiconsIcon icon={Copy01FreeIcons} className="size-3" />
                        </MessageAction>
                      </MessageActions>
                    )}
                </MessageContent>
              </Message>
            )})}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

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
                             onUpdate={(newtext)=>setText(newtext)}
                             onMentionsChange={handleMentionsChange}
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
                <HugeiconsIcon icon={Globe02FreeIcons} size={16} />
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
            <PromptInputSubmit disabled={(!text || !status) || isParsing || !selectedModel || !isOnline} status={status} />
          </PromptInputFooter>
        </PromptInput>
        </PromptInputProvider>
      </div>
    </div>
  );
};

export default AiChatComponent;