import WatchVideoPage from '@/components/videos/watchpage'
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/watch/$watchId')({
  component: WatchPage,
})

function WatchPage() {
  const {watchId}=Route.useParams();
  return <WatchVideoPage  videoId={watchId} />
}
