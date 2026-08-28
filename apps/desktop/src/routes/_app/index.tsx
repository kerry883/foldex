import { HomeComponent } from '@/components/homecomponents/homecomponet'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/')({
  component: Home,
})

function Home() {
  return <HomeComponent/>
}