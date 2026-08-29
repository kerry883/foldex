import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { motion, type Variants } from "framer-motion"; 
import { AuthForm } from "@/components/auth/authcomponent";
import { HugeiconsIcon } from '@hugeicons/react'
import {Bug02FreeIcons, MailWarning, QuoteUpIcon} from '@hugeicons/core-free-icons'
import { Logo } from "@/components/logo";

export const Route = createLazyFileRoute('/signin')({
  component: SignInPage,
})

function SignInPage() {
  // 2. Explicitly type your variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    // 3. Swapped min-h-svh for min-h-[100dvh]
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left — Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to='/'className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md ">
              <Logo width={24} height={24} className="text-foreground" />
            </div>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <AuthForm />
          </div>
        </div>
      </div>

      {/* Right — Animated Welcome Panel */}
      {/* 4. Added overflow-y-auto so this side can scroll in Firefox/Zen if it gets too tall */}
      <div className="relative hidden bg-muted/30 border-l lg:flex flex-col justify-center p-10 overflow-y-auto">
        <motion.div
          className="relative z-10 max-w-lg mx-auto space-y-5 "
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="space-y-6">
            <div
              role="img"
              aria-label="Foldex logo"
              className="flex w-20 h-20 items-center justify-center rounded-2xl shadow-sm border border-border"
            >
              <Logo width={44} height={44} className="text-foreground" />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="relative">
            <HugeiconsIcon icon={QuoteUpIcon} className="absolute -top-4 -left-6 h-10 w-10 text-primary/10 " />
            <blockquote className="space-y-4">
              <p className="text-2xl font-medium tracking-tight text-foreground leading-snug">
                "Welcome to Foldex! We're building the ultimate AI learning platform for students. Since we're in early beta, you're getting a first look—thanks for joining the journey early."
              </p>
              <footer className="flex items-center gap-3">
                <div className="h-px w-8 bg-primary/40" />
                <span className="font-semibold text-muted-foreground">
                  — Pato
                </span>
              </footer>
            </blockquote>
          </motion.div>

           <motion.div variants={itemVariants}>
            <div className="rounded-2xl  border  p-4 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <HugeiconsIcon icon={MailWarning} className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold">Check your spam folder</h3>
                  <p className="text-sm text-zinc-400">
                    Because we are a brand new domain, our OTP verification emails might occasionally land in your spam or junk folder. 
                  </p>
                </div>
              </div>
            </div>
           </motion.div>

          
          <motion.div variants={itemVariants} className="space-y-2">
            <div className="rounded-2xl bg-background border shadow-sm p-4 space-y-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <HugeiconsIcon icon={Bug02FreeIcons} className="h-5 w-5 text-primary" />
                Pardon our dust
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                As we actively develop and add new features, you might bump into a few glitches. Your feedback directly shapes Foldex.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <HugeiconsIcon icon={Bug02FreeIcons} className="h-4 w-4" />
                  </div>
                  <span>Submit the Bug in our github issues page </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
       
      </div>
    </div>
  );
}
