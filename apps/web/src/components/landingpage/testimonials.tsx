import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import { Card, CardContent } from '@workspace/ui/components/card'

type Testimonial = {
    name: string
    role: string
    quote: string
}

const testimonials: Testimonial[] = [
    {
        name: 'Wanjiru Kamau',
        role: 'Computer Science Student, University of Nairobi',
        quote: 'Campus wifi drops almost every afternoon, but foldex keeps working. My notes live on my laptop, so a bad connection stopped being an excuse not to revise.',
    },
    {
        name: 'Brian Otieno',
        role: 'Software Developer, Nairobi',
        quote: 'Another dollar subscription was never going to happen. I plugged in my own Gemini key and now I only pay for what I actually use.',
    },
    {
        name: 'Amina Hassan',
        role: 'Lecturer, Technical University of Mombasa',
        quote: 'I generate a short animation for the concepts my students always struggle with. Explaining Fourier transforms with a narrated video beats another chalkboard diagram.',
    },
    {
        name: 'Kiprotich Langat',
        role: 'Actuarial Science Student, JKUAT',
        quote: 'The flashcards it builds from my own notes carried me through second year stats. It quizzes me on what I actually wrote, not some generic question bank.',
    },
    {
        name: 'Sharon Nekesa',
        role: 'Medical Student, Moi University',
        quote: 'I dropped three years of lecture PDFs into it and every one was parsed. Anatomy revision finally lives in one place instead of a WhatsApp group.',
    },
    {
        name: 'Collins Barasa',
        role: 'Data Analyst, Westlands',
        quote: 'A blackout hit in the middle of writing up an analysis and I lost nothing. Everything is in a local database, so the app is never waiting on someone else’s server.',
    },
    {
        name: 'Mercy Wairimu',
        role: 'Form Four Student, Nakuru',
        quote: 'My physics teacher showed us foldex during prep. Now I write my own revision notes and the AI checks whether I actually understood them.',
    },
    {
        name: 'Dennis Mutua',
        role: 'Backend Engineer, Moringa School alumnus',
        quote: 'Diagrams and code blocks sit right next to my study notes. I stopped juggling one app for documentation and another for learning.',
    },
    {
        name: 'Faith Chebet',
        role: 'Agricultural Economics Student, Egerton University',
        quote: 'Bundles are expensive here. Knowing my notes are not syncing to a cloud on every keystroke genuinely saves me money.',
    },
    {
        name: 'Salim Bakari',
        role: 'ICT Teacher, Malindi',
        quote: 'Our lab machines are old and offline for half the term. This is the first tool I have found that does not fall apart without internet.',
    },
    {
        name: 'Purity Nduta',
        role: 'Engineering Student, Dedan Kimathi University of Technology',
        quote: 'I asked it to animate how a cantilever beam deflects and had a narrated video in minutes. That is the part a textbook could never do for me.',
    },
    {
        name: 'Victor Ochieng',
        role: 'Freelance Developer, Kisumu',
        quote: 'Open source, and my API keys stay in a vault on my own machine. As someone who reads the code before installing anything, that mattered more than any feature.',
    },
]

const getInitials = (name: string) =>
    name
        .split(' ')
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')

const chunkArray = (array: Testimonial[], chunkSize: number): Testimonial[][] => {
    const result: Testimonial[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize))
    }
    return result
}

const testimonialChunks = chunkArray(testimonials, Math.ceil(testimonials.length / 3))

export default function WallOfLoveSection() {
    return (
        <section>
            <div className="py-16 md:py-32">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-semibold">Loved by the Community</h2>
                        <p className="mt-6">From lecture halls in Nairobi to prep rooms in Kisumu, here is what students, teachers and developers across Kenya are saying.</p>
                    </div>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
                        {testimonialChunks.map((chunk, chunkIndex) => (
                            <div
                                key={chunkIndex}
                                className="*:bg-muted space-y-3 *:border-none *:shadow-none">
                                {chunk.map(({ name, role, quote }, index) => (
                                    <Card key={index}>
                                        <CardContent className="grid grid-cols-[auto_1fr] gap-3 pt-6">
                                            <Avatar className="size-9">
                                                <AvatarFallback>{getInitials(name)}</AvatarFallback>
                                            </Avatar>

                                            <div>
                                                <h3 className="font-medium">{name}</h3>

                                                <span className="text-muted-foreground block text-sm tracking-wide">{role}</span>

                                                <blockquote className="mt-3">
                                                    <p className="text-gray-700 dark:text-gray-300">{quote}</p>
                                                </blockquote>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}