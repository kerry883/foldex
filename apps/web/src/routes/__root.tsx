import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import { ThemeProvider } from "@workspace/ui/components/theme-provider"
import appCss from "@workspace/ui/globals.css?url"

import { siteConfig } from "@/lib/site"

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
        title: `${siteConfig.name} - your personalized self learning platform`,
      },
      {
        name: "description",
        content: siteConfig.description,
      },
      {
        property: "og:title",
        content: `${siteConfig.name} - your personalized self learning platform`,
      },
      {
        property: "og:description",
        content: siteConfig.description,
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: siteConfig.url,
      },
      {
        property: "og:image",
        content: `${siteConfig.url}/icon310x310.png`,
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: `${siteConfig.name} - your personalized self learning platform`,
      },
      {
        name: "twitter:description",
        content: siteConfig.description,
      },
      {
        name: "twitter:image",
        content: `${siteConfig.url}/icon310x310.png`,
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
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
