import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import { InfiniteSlider } from '@/components/motion-primitives/infinite-slider'
import { Link } from '@tanstack/react-router'
import { Logo } from '@/components/logo'

export default function IntegrationsSection() {
    return (
        <section>
            <div className="bg-muted dark:bg-background py-24 md:py-32">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="bg-muted/25 group relative mx-auto max-w-[22rem] items-center justify-between space-y-6 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] sm:max-w-md">
                        <div
                            role="presentation"
                            className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:32px_32px] opacity-50"></div>
                        <div>
                            <InfiniteSlider
                                gap={24}
                                speed={20}
                                speedOnHover={10}>
                                <IntegrationCard>
                                   <img src="/chatgpt-icon.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/claude-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/gemini-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/deepseek-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/grok-icon.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/kimi-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>

                        <div>
                            <InfiniteSlider
                                gap={24}
                                speed={20}
                                speedOnHover={10}
                                reverse>
                                <IntegrationCard>
                                   <img src="/chatgpt-icon.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/claude-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/gemini-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/deepseek-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/grok-icon.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/kimi-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>
                        <div>
                            <InfiniteSlider
                                gap={24}
                                speed={20}
                                speedOnHover={10}>
                                <IntegrationCard>
                                   <img src="/chatgpt-icon.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/claude-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/gemini-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/deepseek-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/grok-icon.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                                <IntegrationCard>
                                    <img src="/kimi-color.svg" alt="" className="h-4 w-4" />
                                </IntegrationCard>
                            </InfiniteSlider>
                        </div>
                        <div className="absolute inset-0 m-auto flex size-fit justify-center gap-2">
                            <IntegrationCard
                                className="shadow-black-950/10 size-16 bg-white/25 shadow-xl backdrop-blur-md backdrop-grayscale dark:border-white/10 dark:shadow-white/15"
                                isCenter={true}>
                                <Logo width={32} height={32} className="text-white" />
                            </IntegrationCard>
                        </div>
                    </div>
                    <div className="mx-auto mt-12 max-w-lg space-y-6 text-center">
                        <h2 className="text-balance text-3xl font-semibold md:text-4xl">Plug in your preferred AI models</h2>
                        <p className="text-muted-foreground">Bring your own API keys. Seamlessly switch between the best LLMs for your specific note-taking and thinking workflows.</p>

                        <Button
                            variant="outline"
                            size="sm"
                            asChild>
                            <Link to="/download">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}

const IntegrationCard = ({ children, className, isCenter = false }: { children: React.ReactNode; className?: string; position?: 'left-top' | 'left-middle' | 'left-bottom' | 'right-top' | 'right-middle' | 'right-bottom'; isCenter?: boolean }) => {
    return (
        <div className={cn('bg-background relative z-20 flex size-12 rounded-full border', className)}>
            <div className={cn('m-auto size-fit *:size-5', isCenter && '*:size-8')}>{children}</div>
        </div>
    )
}