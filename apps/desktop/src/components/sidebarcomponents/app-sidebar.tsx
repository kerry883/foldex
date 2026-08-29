import * as React from "react"
import { ArchiveX, Command, Compass, File, FileText, Folder, Home, Inbox, Plus, Send, Settings, Sparkles, Trash2, VideoIcon } from "lucide-react"

import { NavUser } from "@/components/sidebarcomponents/nav-user"
import { Label } from "@workspace/ui/components/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { NavMain } from "./nav-main"
import { NavContent } from "./nav-content"
import { Dialog, DialogContent, DialogTrigger } from "@workspace/ui/components/dialog"
import SettingsComponent from "../settingscomponents/settings-component"
import { useSettingsStore } from "@/stores/settingsstore"
import { Suspense } from "react"
import { Logo } from "@/components/logo"

// This is sample data
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Ask AI",
      url: "/chat",
      icon: Sparkles,
    },
    {
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title:"video vault",
      url: "/watch",
      icon: VideoIcon,
    }
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpen } = useSidebar()
  const isSettingsOpen = useSettingsStore((state) => state.isOpen);
  const setIsSettingsOpen = useSettingsStore((state) => state.setOpen);

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* This is the first sidebar */}
      {/* We disable collapsible and adjust width to icon. */}
      {/* This will make the sidebar appear as icons. */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
                  <Logo width={32} height={32} className="text-foreground" />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <Suspense fallback={<div className="h-20" />}>
              <NavMain items={data.navMain} />
              </Suspense>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <SidebarMenuButton className="md:h-8 md:p-0 cursor-pointer">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                      <Settings className="size-4" />
                    </div>
                  </SidebarMenuButton>
                </DialogTrigger>
                <DialogContent className="md:max-w-[700px] lg:max-w-[1000px] h-[85vh] p-0 overflow-hidden rounded-xl">
                  <SettingsComponent />
                </DialogContent>
              </Dialog>
            </SidebarMenuItem>
          </SidebarMenu>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      <Suspense fallback={null}>
      <NavContent />
      </Suspense>
    </Sidebar>
  )
}
