import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ResizableSidebarLayout } from '@/components/sidebarcomponents/resizable-sidebar'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <ResizableSidebarLayout>
      <Outlet />
    </ResizableSidebarLayout>
  )
}