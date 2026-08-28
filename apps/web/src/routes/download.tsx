import {
  Apple,
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  Laptop,
  Monitor,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"

import FooterSection from "@/components/landingpage/footer"
import { HeroHeader } from "@/components/landingpage/hero-header"
import { desktopDownloads, siteConfig } from "@/lib/site"

type DesktopPlatform = keyof typeof desktopDownloads
type DetectedPlatform = DesktopPlatform | "unknown"

type PlatformOption = {
  id: DesktopPlatform
  name: string
  description: string
  packageName: string
  url: string
  icon: LucideIcon
  alternatives: Array<{ label: string; url: string }>
}

const platformOptions: PlatformOption[] = [
  {
    id: "windows",
    name: "Windows",
    description: "For Windows 10 and 11.",
    packageName: "NSIS installer (.exe)",
    url: desktopDownloads.windows.url,
    icon: Monitor,
    alternatives: [
      {
        label: "Download MSI installer",
        url: desktopDownloads.windows.alternateUrl,
      },
    ],
  },
  {
    id: "macos",
    name: "macOS",
    description: "Universal app for Apple Silicon and Intel Macs.",
    packageName: "Disk image (.dmg)",
    url: desktopDownloads.macos.url,
    icon: Apple,
    alternatives: [],
  },
  {
    id: "linux",
    name: "Linux",
    description: "For most modern 64-bit Linux distributions.",
    packageName: "AppImage",
    url: desktopDownloads.linux.url,
    icon: Laptop,
    alternatives: [
      {
        label: "Download .deb package",
        url: desktopDownloads.linux.debUrl,
      },
      {
        label: "Download .rpm package",
        url: desktopDownloads.linux.rpmUrl,
      },
    ],
  },
]

function detectPlatform(): DetectedPlatform {
  if (typeof navigator === "undefined") {
    return "unknown"
  }

  const browserPlatform = `${navigator.platform} ${navigator.userAgent}`.toLowerCase()

  if (/android|iphone|ipad|ipod/.test(browserPlatform)) {
    return "unknown"
  }

  if (browserPlatform.includes("win")) {
    return "windows"
  }

  if (browserPlatform.includes("mac")) {
    return "macos"
  }

  if (browserPlatform.includes("linux") || browserPlatform.includes("x11")) {
    return "linux"
  }

  return "unknown"
}

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download foldex" },
      {
        name: "description",
        content:
          "Download the foldex desktop app for Windows, macOS, or Linux.",
      },
    ],
  }),
  component: DownloadPage,
})

function DownloadPage() {
  const [detectedPlatform, setDetectedPlatform] =
    useState<DetectedPlatform>("unknown")

  useEffect(() => {
    setDetectedPlatform(detectPlatform())
  }, [])

  const detectedOption = platformOptions.find(
    (platform) => platform.id === detectedPlatform,
  )

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <HeroHeader />
      <main className="flex-1 px-6 pb-20 pt-32 md:pt-40">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          <div className="mx-auto mt-10 max-w-3xl text-center">
            <div className="bg-primary/10 text-primary mx-auto flex size-14 items-center justify-center rounded-2xl">
              <Download className="size-7" />
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
              Download foldex
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg text-balance">
              {detectedOption
                ? `We detected ${detectedOption.name}. Download the recommended app for your device, or choose another platform below.`
                : "Choose the desktop app for your operating system."}
            </p>
            <p
              className="text-muted-foreground mt-3 text-sm"
              aria-live="polite"
            >
              {detectedOption
                ? `Recommended for your device: ${detectedOption.name}`
                : "Platform detection is unavailable. Select a download below."}
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {platformOptions.map((platform) => {
              const Icon = platform.icon
              const isRecommended = detectedPlatform === platform.id

              return (
                <section
                  key={platform.id}
                  className={`bg-card relative flex flex-col rounded-2xl border p-6 shadow-sm transition-shadow ${
                    isRecommended
                      ? "border-primary ring-primary/20 ring-4"
                      : "hover:shadow-md"
                  }`}
                >
                  {isRecommended && (
                    <span className="bg-primary text-primary-foreground absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium">
                      <Check className="size-3.5" />
                      Recommended for you
                    </span>
                  )}
                  <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
                    <Icon className="size-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold">{platform.name}</h2>
                  <p className="text-muted-foreground mt-2 min-h-12 text-sm">
                    {platform.description}
                  </p>
                  <p className="text-muted-foreground mt-5 text-xs">
                    {platform.packageName}
                  </p>
                  <a
                    href={platform.url}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
                  >
                    <Download className="size-4" />
                    Download for {platform.name}
                  </a>
                  {platform.alternatives.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                      {platform.alternatives.map((alternative) => (
                        <a
                          key={alternative.url}
                          href={alternative.url}
                          className="text-muted-foreground hover:text-foreground text-center text-xs transition-colors"
                        >
                          {alternative.label}
                        </a>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>

          <div className="bg-muted/50 mx-auto mt-10 flex max-w-2xl flex-col items-center gap-3 rounded-2xl border p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="font-medium">Need an older release?</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Browse every installer and release note on GitHub.
              </p>
            </div>
            <a
              href={siteConfig.latestReleaseUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:text-primary/80 inline-flex shrink-0 items-center gap-2 text-sm font-medium transition-colors"
            >
              View all releases
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  )
}
