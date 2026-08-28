const githubUrl = "https://github.com/kerry883/foldex"
const latestReleaseUrl = `${githubUrl}/releases/latest`

const releaseAssetUrl = (assetName: string) =>
  `${latestReleaseUrl}/download/${assetName}`

export const desktopDownloads = {
  windows: {
    url: releaseAssetUrl("foldex_windows_nsis.exe"),
    alternateUrl: releaseAssetUrl("foldex_windows_msi.msi"),
  },
  linux: {
    url: releaseAssetUrl("foldex_linux_appimage.AppImage"),
    debUrl: releaseAssetUrl("foldex_linux_deb.deb"),
    rpmUrl: releaseAssetUrl("foldex_linux_rpm.rpm"),
  },
  macos: {
    url: releaseAssetUrl("foldex_macos_dmg.dmg"),
  },
} as const

export const siteConfig = {
  name: "foldex",
  description:
    "A local-first desktop app for notes, folders and AI-assisted study. Bring your own AI models. Free and open source.",
  url: "https://foldex.space",
  downloadUrl: "/download",
  latestReleaseUrl,
  githubUrl,
  discordUrl: "https://discord.gg/bMHfCXz6bv",
  twitterUrl: "https://x.com/foldex",
  youtubeUrl: "https://www.youtube.com/@foldexapp",
  tiktokUrl: "https://www.tiktok.com/@foldexapp",
} as const
