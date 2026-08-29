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
                                <a
                                    href="/"
                                    className="flex w-fit items-center gap-2 font-medium">
                                    <span>New</span>
                                    <span className="text-muted-foreground">Foldex 1.0 - AI-Powered Learning</span>

                                    <ArrowRight className="size-3.5" />
                                </a>

                                <div className="mt-8 grid items-end gap-4 md:grid-cols-2 md:gap-6">
                                    <h1 className="text-balance text-5xl font-medium tracking-tight md:text-6xl xl:text-7xl">
                                        Your AI Learning Canvas
                                    </h1>
                                    <div className="mx-auto flex max-w-md flex-col gap-6">
                                        <p className="text-muted-foreground text-balance text-lg">
                                            Local-first notes, custom blocks, and bring your own AI models. Master your learning with complete privacy.
                                        </p>

                                        <Button
                                            asChild
                                            size="lg"
                                            className="w-fit rounded-xl px-5">
                                            <Link to="/download">
                                                Get Started
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="mx-auto max-w-7xl max-xl:px-2">
                                <div className="bg-muted md:aspect-5/3 relative aspect-square overflow-hidden rounded-3xl lg:aspect-video">
                                    <div className="bg-background min-w-4xl lg:min-w-5xl xl:min-w-7xl ring-foreground/6.5 before:mask-radial-at-top-left before:mask-radial-from-65% before:mask-radial-[100%_60%] before:ring-foreground before:border-foreground/10 absolute left-4 top-4 z-10 rounded-2xl p-2 shadow-lg ring before:absolute before:-inset-px before:z-10 before:size-56 before:rounded-tl-2xl before:border-l before:border-t lg:left-16 lg:top-16">
                                        <div
                                            aria-hidden
                                            className="bg-foreground/2 z-1 absolute inset-0 rounded-2xl"
                                        />
                                        <img
                                            className="bg-background aspect-15/8 relative rounded-2xl object-cover"
                                            src="/app-preview.png"
                                            alt="The foldex workspace with the folder sidebar, search bar and video library"
                                            width="1024"
                                            height="554"
                                        />
                                    </div>

                                    <img
                                        src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                                        alt=""
                                        width={2070}
                                        height={1380}
                                        className="size-full rounded-3xl object-cover object-center"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}