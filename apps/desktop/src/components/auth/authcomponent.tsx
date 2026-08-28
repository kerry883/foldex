import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { authClient } from "@/lib/auth-client";
import { Link, useNavigate } from "@tanstack/react-router";
import { getLocalDb } from "@/lib/localdb";
import { localUser } from "@/lib/schema.local";


type Step = "email" | "otp";
type AuthMode = "signIn"| "signUp"|null;

export function AuthForm({ className, ...props }: React.ComponentProps<"div">) {
     

  
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  // Helper: Save user info locally after successful auth (for desktop)
  async function saveUserLocally(user: { id: string; name: string; email: string; image?: string | null }) {
    // Always persist userId to localStorage so getUserId() works everywhere
    localStorage.setItem("foldex_user_id", user.id);
    const db = await getLocalDb();
    await  db.insert(localUser).values({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image ?? null,
                isLoggedIn: true,
    });
  }

  // Step 1 — Send OTP to email
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError("");
    setLoading(true);

    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in", // Better Auth auto-registers if user doesn't exist
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Couldn't send code. Please try again.");
    } else {
      setStep("otp");
    }
  }

  // Step 2 — Verify the OTP
  async function handleVerifyOtp(value: string) {
    setError("");
    setLoading(true);

    const { data, error } = await authClient.signIn.emailOtp({
      email,
      otp: value,
    });

    setLoading(false);

    if (error) {
      console.log(error);
      setError("Invalid or expired code. Please try again.");
      setOtp(""); // clear so user can re-enter
    } else if (data?.user) {
      console.log("OTP verified successfully")
      // Save user to local DB and localStorage
      await saveUserLocally(data.user);
      navigate({to:"/"});
    }
  }

  // OTP input onChange — auto-submit when all 6 digits entered
  function handleOtpChange(value: string) {
    setOtp(value);
    if (value.length === 6) {
      handleVerifyOtp(value);
    }
  }

  // Resend code
  async function handleResend() {
    setError("");
    setOtp("");
    setResendLoading(true);
    await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    setResendLoading(false);
  }

  // Google
  async function handleGoogle() {
    setGoogleLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/app?view=home",
    });
    setGoogleLoading(false);
  }

  return (
    <div className={cn("flex flex-col gap-6 relative", className)} {...props}>
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute -top-12 left-0 cursor-pointer" 
          onClick={() => navigate({to:"/"})}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to App
        </Button>
      {/* Header */}
      <div className="flex flex-col items-center gap-1 text-center">
        {step === "otp" ? (
          <>
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-sm text-balance text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="text-foreground font-medium">{email}</span>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Welcome to Foldex</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Sign in or create an account to continue
            </p>
          </>
        )}
      </div>
      <div id="clerk-captcha"></div>
      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {step === "email" ? (
        <>
          {/* Google */}
          {/* <Button
            variant="outline"
            type="button"
            className="w-full cursor-pointer"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div> */}

          {/* Email form */}
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full cursor-pointer" disabled={loading || !email}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Sending code..." : "Continue with Email"}
            </Button>
          </form>

          {/* <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link to" className="underline underline-offset-4 hover:text-foreground">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p> */}
        </>
      ) : (
        /* OTP Step */
        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={handleOtpChange}
              disabled={loading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </div>
          )}
          {resendLoading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Resending...
            </div>
          )}

          <div className="flex flex-col gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive a code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || loading}
                className="text-foreground underline underline-offset-4 hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
              >
                Resend
              </button>
            </p>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError("");
              }}
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3 w-3" />
              Use a different email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}