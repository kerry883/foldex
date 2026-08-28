import { createFileRoute } from "@tanstack/react-router"
import { HeartHandshake, Sparkles } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import FooterSection from "@/components/landingpage/footer"
import { HeroHeader } from "@/components/landingpage/hero-header"

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing - foldex" },
      {
        name: "description",
        content:
          "foldex is 100% free and open source. No paywalls, no premium tiers, no hidden subscriptions.",
      },
    ],
  }),
  component: PricingPage,
})

function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-auto">
      <HeroHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-32">
        <div className="mx-auto mt-12 max-w-2xl space-y-8 text-center">
          <div className="bg-muted/50 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium backdrop-blur-sm">
            <Sparkles className="text-primary fill-primary/20 mr-2 size-4" />
            <span>Pricing Plan</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Wait... Pricing? <br /> For an Open Source App?
          </h1>
          <p className="text-muted-foreground text-xl leading-relaxed">
            Gotcha! foldex is <strong>100% free and open-source</strong>. We
            don't have paywalls, premium tiers, or hidden subscriptions. Your
            data is yours, and the code is open for everyone.
          </p>

          <div className="mt-12 space-y-6 border-t pt-8">
            <h2 className="text-2xl font-semibold">Keep the servers running!</h2>
            <p className="text-muted-foreground">
              While the app is free, running the website and keeping development
              active takes time and resources. If you love what we do, consider
              buying us a coffee!
            </p>
            <Button size="lg" className="h-12 gap-2 rounded-full px-8">
              <HeartHandshake className="size-5" />
              Donate to the Project
            </Button>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  )
}
