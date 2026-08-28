import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { Toaster } from "sonner"

import { ThemeProvider } from "@workspace/ui/components/theme-provider"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

import { QueryProvider } from "@/components/queryprovider"
import appCss from "@/styles/app.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "foldex",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/icon.png",
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  )
}
