import VideoContentInner from '@/components/tabs/content/videocontentinner';
import { createFileRoute } from '@tanstack/react-router'

type VideoSearchParams = {
  folderId?: string;
}
export const Route = createFileRoute('/_app/video/$videoId')({
  component: VideoPage,
  validateSearch: (search: Record<string, unknown>): VideoSearchParams => {
    return {
      folderId: search.folderId as string | undefined,
    }
  },
})

function VideoPage() {
  const {videoId} = Route.useParams();
  const {folderId} = Route.useSearch();

  return <VideoContentInner videoId={videoId} folderId={folderId}/>
}
