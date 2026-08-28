import WatchList from '@/components/videos/watchlist'
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/watch/')({
  component: WatchList,
})
