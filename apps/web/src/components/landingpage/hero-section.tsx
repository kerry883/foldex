import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { HeroHeader } from './hero-header'
import { siteConfig } from '@/lib/site'

export default function HeroSection() {
    return (
        <>
            <HeroHeader />

            <main>
                <section className="overflow-hidden">
                    <div className="relative pt-24 lg:pt-40">
                        <div className="space-y-12 md:space-y-16">
                            <div className="relative mx-auto max-w-7xl px-6">
                                <Link
                                    to="/download"
                                    className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-2 font-medium duration-150">
                                    <span className="text-foreground">New</span>
                                    <span>Foldex 1.0 — bring your own AI models</span>
                                    <ArrowRight className="size-3.5" />
                                </Link>

                                <div className="mt-8 grid items-end gap-4 md:grid-cols-2 md:gap-6">
                                    <h1 className="text-balance text-5xl font-medium tracking-tight md:text-6xl xl:text-7xl">
                                        Your personal learning workspace
                                    </h1>
                                    <div className="flex max-w-md flex-col gap-6 md:mx-auto">
                                        <p className="text-muted-foreground text-balance text-lg">
                                            Notes, folders and AI-assisted study in one local-first desktop app. Your
                                            files stay on your machine, and you plug in whichever AI model you already
                                            pay for.
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <Button asChild size="lg" className="rounded-xl px-5">
                                                <Link to="/download">Download for free</Link>
                                            </Button>
                                            <Button asChild size="lg" variant="ghost" className="rounded-xl px-5">
                                                <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                                                    View on GitHub
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mx-auto max-w-7xl max-xl:px-2">
                                <div className="bg-muted md:aspect-5/3 relative aspect-square overflow-hidden rounded-3xl lg:aspect-video">
                                    <div
                                        aria-hidden
                                        className="absolute inset-0 [background:radial-gradient(75%_75%_at_20%_10%,var(--color-primary)/12%_0,transparent_70%),radial-gradient(60%_60%_at_85%_90%,var(--color-foreground)/8%_0,transparent_70%)]"
                                    />

                                    <div className="bg-background min-w-4xl lg:min-w-5xl xl:min-w-7xl ring-foreground/10 absolute left-4 top-4 z-10 rounded-2xl p-2 shadow-2xl shadow-black/20 ring-1 lg:left-16 lg:top-16">
                                        <img
                                            className="bg-background aspect-15/8 relative hidden rounded-2xl dark:block"
                                            src="/app-preview.svg"
                                            alt="Foldex desktop app showing notes organised in folders alongside an AI chat panel"
                                            width="1500"
                                            height="800"
                                        />
                                        <img
                                            className="bg-background border-border/25 aspect-15/8 relative rounded-2xl border dark:hidden"
                                            src="/app-preview-light.svg"
                                            alt="Foldex desktop app showing notes organised in folders alongside an AI chat panel"
                                            width="1500"
                                            height="800"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
