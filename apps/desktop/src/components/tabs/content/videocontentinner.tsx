import { Skeleton } from '@workspace/ui/components/skeleton';
import React, { useState, useEffect } from 'react';
import { Check, Copy, ExternalLink, Folder, Link, SlashIcon, ThumbsUp, ThumbsDown, X, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import { Separator } from '@workspace/ui/components/separator';
import { Button } from '@workspace/ui/components/button';
import { formatRelativeTime } from '@/lib/dateformater';
import { useTabNavigation } from '@/hooks/useTabNavigation';
import { SidebarTrigger } from '@workspace/ui/components/sidebar';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@workspace/ui/components/breadcrumb';
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { useMyVideos, useVideo, useSubmitFeedback, useUserFeedback } from '@/hooks/use-videos';
import { useTabStore } from '@/stores/tabstore';
import { useFolder } from '@/hooks/use-folders';
import { VideoPlayer } from '@/components/videos/videoplayer';
import { useGenerateVideo } from '@/hooks/useGenerateVideo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { CodeBlock } from 'streamdown';
interface VideoContentInnerProps {
  videoId: string;
  folderId?: string;
}
const DISLIKE_TAGS = [
  { id: 'text_overlapped', label: 'Text overlapped / cut off' },
  { id: 'pacing_issue', label: 'Animations too fast/slow' },
  { id: 'boring_visuals', label: 'Visuals were unhelpful' },
  { id: 'hallucination', label: 'Math/Code error' },
];
const VideoContentInner = ({ videoId, folderId }: VideoContentInnerProps) => {
  const {data:video,isLoading:videoLoading} = useVideo(videoId);
  const {data:folderVideos,isLoading:folderVideosLoading} = useMyVideos(folderId);
  const {data:looseVideos,isLoading:looseVideosLoading} = useMyVideos();
  const updateTabTitle = useTabStore((s) => s.updateTabTitle);
  const { openInTab } = useTabNavigation();
  const {data:folder,isLoading:folderLoading} = useFolder(folderId!);
  const { data: userFeedbackData } = useUserFeedback(videoId);
  const { mutate: submitFeedbackMutation } = useSubmitFeedback();
  const { handleRetry } = useGenerateVideo();
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const [showDislikeMenu, setShowDislikeMenu] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Sync vote from server
  useEffect(() => {
    if (userFeedbackData?.currentVote) {
      setUserVote(userFeedbackData.currentVote);
    }
  }, [userFeedbackData]);

  // Update tab title when video data loads
  useEffect(() => {
    if (video?.title) {
      updateTabTitle(`video-${videoId}`, video.title);
    }
  }, [video?.title, videoId, updateTabTitle]);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  };

  const getFaviconUrl = (url: string) => {
    const domain = getDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  };
  const handleLike = async () => {
    const newVote = userVote === 'like' ? null : 'like';
    setUserVote(newVote);
    setShowDislikeMenu(false);
    submitFeedbackMutation({ videoId, body: { type: 'like' } });
  };

  const handleDislikeClick = async () => {
    if (userVote === 'dislike') {
      setUserVote(null);
      setShowDislikeMenu(false);
      submitFeedbackMutation({ videoId, body: { type: 'dislike' } });
    } else {
      setUserVote('dislike');
      setShowDislikeMenu(true);
      setSelectedTags([]);
      submitFeedbackMutation({ videoId, body: { type: 'dislike' } });
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const submitDislikeTags = async () => {
    setShowDislikeMenu(false);
    if (selectedTags.length > 0) {
      submitFeedbackMutation({ videoId, body: { type: 'dislike', tags: selectedTags } });
    }
  };

  const onRetry = async () => {
    setIsRetrying(true);
    try {
      await handleRetry(videoId);
    } finally {
      setIsRetrying(false);
    }
  };

  const relatedVideos = folderId ? folderVideos : looseVideos;

  if (video === undefined || relatedVideos === undefined) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <Skeleton className="w-full aspect-video rounded-xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="lg:w-[400px] space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-40 aspect-video rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center h-full">
        <h1 className="text-2xl font-bold">Video not found</h1>
      </div>
    );
  }

  const isGenerating = video.status === 'queued' || video.status === 'generating';
  const isFailed = video.status === 'failed';
  const isReady = video.status === 'ready' && video.url;

  const suggestedVideos =
    relatedVideos?.filter(
      (v) => v.id !== videoId && v.status === 'ready',
    ) || [];

  const handleVideoClick = (id:string) => {
    openInTab('video', id, folderId, 'Video');
  };

  const handleCopyTranscript = async () => {
    if (video?.transcript) {
      try {
        await navigator.clipboard.writeText(video.transcript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy transcript:', err);
      }
    }
  };

  return (
    <div className="px-4 py-2 h-full overflow-y-auto">
      <div className="flex items-center mb-4 gap-2">
        <SidebarTrigger className="cursor-pointer" />
        <Breadcrumb>
          <BreadcrumbList>
            {folder && <BreadcrumbItem>
              <BreadcrumbLink className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>{folder?.name}</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
              }
            {folder && <BreadcrumbSeparator>
              <SlashIcon />
            </BreadcrumbSeparator>}
            
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <span>videos</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <SlashIcon />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{video.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Video Section */}
        <div className="flex-1">
          <div className="space-y-4">
            {/* Status-based video area */}
            {isGenerating ? (
              <div className="w-full aspect-video rounded-xl bg-muted/50 border border-border flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm font-medium text-foreground">
                  {video.status === 'queued' ? 'Queued for rendering...' : 'Rendering your video...'}
                </p>
                <p className="text-xs text-muted-foreground">This may take 1-3 minutes</p>
              </div>
            ) : isFailed ? (
              <div className="w-full aspect-video rounded-xl bg-destructive/5 border border-destructive/20 flex flex-col items-center justify-center gap-3 p-6">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm font-medium text-foreground">Video generation failed</p>
                <p className="text-xs text-muted-foreground text-center max-w-md">
                  The renderer encountered an error while processing your animation.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 cursor-pointer mt-2"
                  onClick={onRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Retrying...</>
                  ) : (
                    <><RefreshCcw className="h-4 w-4" /> Retry with AI Fix</>
                  )}
                </Button>
              </div>
            ) : isReady ? (
              <VideoPlayer
                src={video.url}
                poster={video.thumbnail}
                title={video.title}
                className="w-full"
              />
            ) : (
              <div className="w-full aspect-video rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Video unavailable</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {video.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {formatRelativeTime(video.createdAt)}
                </p>
              </div>

              <Separator />
              <div className="flex justify-between items-center">
                {(video.creatorname || video.creatorprofile) && (
                  <div className="flex items-center gap-3 py-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={video.creatorprofile}
                        alt={video.creatorname || "Creator"}
                        
                      />
                      <AvatarFallback >
                        {video.creatorname
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {video.creatorname || "Anonymous"}
                      </p>
                    </div>
                  </div>
                )}
                <div className="relative">
                  <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-full border border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-full cursor-pointer px-4 gap-2 ${userVote === 'like' ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary' : ''}`}
                      onClick={handleLike}
                    >
                      <ThumbsUp className={`h-4 w-4 ${userVote === 'like' ? 'fill-current' : ''}`} />
                      <span>{video.likes || 0}</span>
                    </Button>
                    <Separator orientation="vertical" className="h-6 bg-border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-full cursor-pointer px-4 gap-2 ${userVote === 'dislike' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive' : ''}`}
                      onClick={handleDislikeClick}
                    >
                      <ThumbsDown className={`h-4 w-4 ${userVote === 'dislike' ? 'fill-current' : ''}`} />
                      <span>{video.dislikes || 0}</span>
                    </Button>
                  </div>

                  {/* Dislike Tagging Popover */}
                  {showDislikeMenu && (
                    <div className="absolute top-full right-0 mt-2 w-72 bg-popover border border-border rounded-xl shadow-lg p-4 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold">What went wrong?</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowDislikeMenu(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {DISLIKE_TAGS.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            className={`text-xs px-3 cursor-pointer py-1.5 rounded-full border transition-colors ${selectedTags.includes(tag.id)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-transparent text-foreground hover:bg-muted border-border'
                              }`}
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>
                      <Button className="w-full h-8 text-xs cursor-pointer" onClick={submitDislikeTags} disabled={selectedTags.length === 0}>
                        Submit Feedback
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Separator />
              {video.description && (
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    Description
                  </h2>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {video.description}
                  </p>
                </div>
              )}
              <Tabs defaultValue="sources" className="w-full">
                <TabsList>
                  <TabsTrigger value='sources' className="cursor-pointer">Sources</TabsTrigger>
                  <TabsTrigger value='code' className="cursor-pointer">Code</TabsTrigger>
                  <TabsTrigger value='transcript' className="cursor-pointer">Transcript</TabsTrigger>
                </TabsList>
                <TabsContent value="sources">
                   {video.sources && video.sources.length > 0 ?(
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">
                      Sources ({video.sources.length})
                    </h2>
                    <div className="space-y-3">
                      {video.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <div className="flex gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                <img
                                  src={getFaviconUrl(source.url)}
                                  alt={getDomain(source.url)}
                                  width={32}
                                  height={32}
                                  className="w-6 h-6"
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                  {source.title || getDomain(source.url)}
                                </h3>
                                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                              </div>
                              {source.snippet && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {source.snippet}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                {getDomain(source.url)}
                              </p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
              ):(
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    No sources found
                  </p>
                </div>
              )}
               
                </TabsContent>
                <TabsContent value="code" className="min-w-0 w-full">
                  {video.code ?(
                  <div className="space-y-3 min-w-0 w-full">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-foreground">
                        Code
                      </h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={()=>{navigator.clipboard.writeText(video.code ?? "");setCopied(true);setTimeout(()=>setCopied(false),3000)}}
                        className="gap-2 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy Code
                          </>
                        )}
                      </Button>
                    </div>
                     <div className="bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-y-auto scrollbar-hidden">
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">
                        {video.code}
                      </p>
                    </div>                    
                  </div>
              ):(
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    No code found
                  </p>
                </div>
              )}
                
                </TabsContent>
                <TabsContent value="transcript">
                  {video.transcript ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-foreground">
                        Transcript
                      </h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyTranscript}
                        className="gap-2 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy Transcript
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-y-auto scrollbar-hidden">
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">
                        {video.transcript}
                      </p>
                    </div>
                  </div>
              ):(
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    No transcript found
                  </p>
                </div>
              )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Suggested Videos Sidebar */}
        {/* Suggested Videos Sidebar - YouTube Playlist Style */}
        <div className="lg:w-[400px]  lg:sticky lg:top-0 lg:h-[calc(100vh-140px)] flex flex-col pb-6">
          <div className="border border-border rounded-2xl bg-card/30 flex flex-col h-full overflow-hidden shadow-sm">

            {/* Playlist Header */}
            <div className="p-4 border-b border-border bg-card/80 backdrop-blur-sm z-10">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                More Videos
              </h2>
            </div>

            {/* Scrollable Playlist Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
              {suggestedVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No more videos available
                </p>
              ) : (
                suggestedVideos.map((suggestedVideo) => (
                  <div
                    key={suggestedVideo.id}
                    onClick={() => handleVideoClick(suggestedVideo.id)}
                    className="flex gap-3 cursor-pointer group p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-36 aspect-video bg-muted rounded-md overflow-hidden flex-shrink-0 border border-border/50">
                      {suggestedVideo.thumbnail ? (
                        <img
                          src={suggestedVideo.thumbnail}
                          alt={suggestedVideo.title || 'Video thumbnail'}
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <span className="text-[10px] text-muted-foreground">
                            No thumbnail
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Video Info & Creator */}
                    <div className="flex-1 min-w-0 py-0.5 flex flex-col">
                      <h3 className="font-medium text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors leading-snug">
                        {suggestedVideo.title || 'Untitled Video'}
                      </h3>

                      <div className="mt-auto pt-2 space-y-1">
                        {/* Creator Profile Pic & Name */}
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={suggestedVideo.creatorprofile} />
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                              {suggestedVideo.creatorname?.charAt(0)?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-muted-foreground truncate font-medium">
                            {suggestedVideo.creatorname || "Anonymous"}
                          </p>
                        </div>

                        {/* Timestamp */}
                        <p className="text-[11px] text-muted-foreground/80">
                          {formatRelativeTime(suggestedVideo.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoContentInner;