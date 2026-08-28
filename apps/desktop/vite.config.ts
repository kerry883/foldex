import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    exclude: ["backend"],
  },
  ssr: {
    external: ["backend"],
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
      // The desktop app is bundled by Tauri as static assets, so the whole app
      // ships as a client-rendered SPA behind a prerendered shell.
      spa: {
        enabled: true,
        prerender: {
          outputPath: "/index.html",
          crawlLinks: false,
        },
      },
    }),
    viteReact(),
  ],
})

export default config
