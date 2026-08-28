import { createFileRoute } from "@tanstack/react-router"

import CallToAction from "@/components/landingpage/calltoaction"
import CommunitySection from "@/components/landingpage/communitysection"
import FeaturesSection from "@/components/landingpage/featuresection"
import FooterSection from "@/components/landingpage/footer"
import HeroSection from "@/components/landingpage/hero-section"
import IntegrationsSection from "@/components/landingpage/intergration"
import WallOfLoveSection from "@/components/landingpage/testimonials"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <HeroSection />
      <FeaturesSection />
      <IntegrationsSection />
      <WallOfLoveSection />
      <CommunitySection />
      <CallToAction />
      <FooterSection />
    </div>
  )
}
