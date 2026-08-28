import {
  Bell,
  ChevronsUpDown,
  LogIn,
  LogOut,
  Loader2,
  User as UserIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { useSession, signOut } from "@/lib/auth-client"
import { useEffect, useState } from "react"
import { getLocalDb } from "@/lib/localdb"
import { localUser } from "@/lib/schema.local"
import { eq } from "drizzle-orm"
import { useNavigate } from "@tanstack/react-router"

type LocalUserInfo = {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

async function markLocalUserLoggedOut() {
    try {
        const db = await getLocalDb();
        await db.delete(localUser);
        localStorage.removeItem("foldex_user_id");
    } catch (e) {
        console.error("Failed to mark user as logged out:", e);
    }
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const navigate = useNavigate();

  // Desktop: load local user from SQLite
  const [localUserInfo, setLocalUserInfo] = useState<LocalUserInfo | null>(null)
  const [localLoading, setLocalLoading] = useState(true)

  useEffect(() => {
    // Load user from local_user table
    const loadLocalUser = async () => {
      try {
        const db = await getLocalDb()
        const [user] = await db.select().from(localUser).where(eq(localUser.isLoggedIn, true))
        if (user) {
          setLocalUserInfo(user)
        }
      } catch (e) {
        console.error("Failed to load local user:", e)
      } finally {
        setLocalLoading(false)
      }
    }
    loadLocalUser()
  }, [])

  const handleLogout = async () => {
    await markLocalUserLoggedOut()
    setLocalUserInfo(null)
    await signOut()
    navigate({to:"/"})
  }

  // Determine if loading
  const isLoading = localLoading 

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center justify-center h-12 w-full text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Determine the user data source
  const user = localUserInfo

  // Guest mode — show "Sign In" button
  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="md:h-8 md:p-0 cursor-pointer"
            onClick={() => navigate({to:"/signin"})}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Guest</span>
              <span className="truncate text-xs text-muted-foreground">Sign in to sync</span>
            </div>
            <LogIn className="ml-auto size-4 text-muted-foreground" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const initials = user.name ? user.name.substring(0, 2).toUpperCase() : "U"
  const avatarUrl = user.image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}&radius=10`

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0 cursor-pointer"
            >
              <Avatar className="h-8 w-8 rounded-lg cursor-pointer">
                <AvatarImage src={avatarUrl} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
