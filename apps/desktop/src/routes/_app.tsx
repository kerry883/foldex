import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { ResizableSidebarLayout } from '@/components/sidebarcomponents/resizable-sidebar'
import { peekForUpdate } from '@/hooks/use-updater'
import { useSettingsStore } from '@/stores/settingsstore'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  useEffect(() => {
    let cancelled = false

    peekForUpdate().then((update) => {
      if (cancelled || !update) return
      toast(`foldex ${update.version} is available`, {
        description: 'Install it from Settings to get the latest version.',
        duration: 10000,
        action: {
          label: 'View',
          onClick: () => useSettingsStore.getState().open('updates'),
        },
      })
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ResizableSidebarLayout>
      <Outlet />
    </ResizableSidebarLayout>
  )
}