import { createFileRoute } from "@tanstack/react-router"
import { Sparkles } from "lucide-react"

import FooterSection from "@/components/landingpage/footer"
import { HeroHeader } from "@/components/landingpage/hero-header"

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About - foldex" },
      {
        name: "description",
        content:
          "Why foldex exists: a local-first, open-source second brain with bring-your-own AI models.",
      },
    ],
  }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-auto">
      <HeroHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-32">
        <div className="mx-auto mt-12 max-w-3xl space-y-8">
          <div className="bg-muted/50 mx-auto flex w-fit items-center rounded-full border px-3 py-1 text-sm font-medium backdrop-blur-sm">
            <Sparkles className="text-primary fill-primary/20 mr-2 size-4" />
            <span>Our Mission</span>
          </div>
          <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Rethinking How We Think
          </h1>

          <div className="mx-auto mt-12">
            <p className="text-muted-foreground text-center text-lg leading-relaxed">
              foldex was born out of frustration with modern note-taking apps.
              They are either too complex, locking your data in the cloud, or
              too simple, missing the powerful features needed for true
              knowledge management.
            </p>

            <div className="mt-16 space-y-8">
              <h2 className="border-b pb-2 text-3xl font-semibold">
                The Philosophy
              </h2>
              <ul className="text-muted-foreground space-y-6 text-lg">
                <li className="flex flex-col space-y-1">
                  <strong className="text-foreground">Local First</strong>
                  <span>
                    Your notes live on your machine. You own your data. You work
                    completely offline.
                  </span>
                </li>
                <li className="flex flex-col space-y-1">
                  <strong className="text-foreground">100% Open Source</strong>
                  <span>
                    Transparent, community-driven development without hidden
                    subscriptions.
                  </span>
                </li>
                <li className="flex flex-col space-y-1">
                  <strong className="text-foreground">Bring Your Own AI</strong>
                  <span>
                    Don't get locked into a single provider. Plug in OpenAI,
                    Anthropic, DeepSeek, or run models locally.
                  </span>
                </li>
                <li className="flex flex-col space-y-1">
                  <strong className="text-foreground">Custom Blocks</strong>
                  <span>
                    Flexibility to shape your workspace exactly how you need it
                    with our block-based editor.
                  </span>
                </li>
              </ul>
            </div>

            <p className="text-foreground mt-16 border-t pt-12 text-center text-xl font-medium leading-relaxed">
              We believe that a second brain should be an extension of
              yourself—private, fast, and endlessly customizable. Join us on our
              journey to build the ultimate open-source knowledge management
              tool.
            </p>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  )
}
