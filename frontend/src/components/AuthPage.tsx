"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import BriefLogo from "@/components/BriefLogo";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, pendingVerificationEmail, clearPendingVerification } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetSent(false);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : "";
      if (mode === "signin") {
        if (code === "auth/email-not-verified") {
          // Verification screen will show automatically
        } else if (
          code === "auth/wrong-password" ||
          code === "auth/user-not-found" ||
          code === "auth/invalid-credential"
        ) {
          setError("Email or password is incorrect");
        } else {
          setError("Email or password is incorrect");
        }
      } else {
        if (code === "auth/email-already-in-use") {
          setError("User already exists. Please sign in");
        } else if (code === "auth/weak-password") {
          setError("Password must be at least 6 characters");
        } else {
          setError("Something went wrong. Please try again");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setResetSent(false);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : "";
      if (code === "auth/popup-closed-by-user") {
        setError("");
      } else {
        setError("Could not sign in with Google. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setResetSent(false);
    if (!email) {
      setError("Enter your email address first");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch {
      setError("Could not send reset email. Check your email address");
    }
  };

  // Verification screen
  if (pendingVerificationEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef1f5] dark:bg-[#09090b] px-4">
        <div className="w-full max-w-[420px] bg-white dark:bg-card rounded-2xl shadow-[0_2px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_32px_rgba(0,0,0,0.3)] p-8 sm:p-10">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#111] dark:text-foreground mb-2">
              Verify your email
            </h2>
            <p className="text-sm text-[#666] dark:text-muted text-center leading-relaxed">
              We have sent you a verification email to{" "}
              <span className="font-medium text-[#111] dark:text-foreground">
                {pendingVerificationEmail}
              </span>
              . Please verify it and log in.
            </p>
            <button
              onClick={() => {
                clearPendingVerification();
                setMode("signin");
                setError("");
                setResetSent(false);
              }}
              className="mt-6 w-full py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef1f5] dark:bg-[#09090b] px-4">
      <div className="w-full max-w-[420px] bg-white dark:bg-card rounded-2xl shadow-[0_2px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_32px_rgba(0,0,0,0.3)] p-8 sm:p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <BriefLogo size={36} />
          <span className="text-xl font-semibold text-[#111] dark:text-foreground tracking-[-0.01em] mt-2">
            brief
          </span>
          <p className="text-sm text-[#666] dark:text-muted mt-1">
            Welcome to Brief
          </p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#ddd] dark:border-border bg-white dark:bg-card text-sm font-medium text-[#333] dark:text-foreground hover:bg-[#f9f9f9] dark:hover:bg-surface disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
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
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#e5e5e5] dark:bg-border" />
          <span className="text-xs text-[#999] dark:text-muted">or</span>
          <div className="flex-1 h-px bg-[#e5e5e5] dark:bg-border" />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div>
            <label className="block text-sm font-medium text-[#333] dark:text-foreground mb-1.5">
              Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <svg className="w-[18px] h-[18px] text-[#999] dark:text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#ddd] dark:border-border bg-white dark:bg-card text-sm text-[#111] dark:text-foreground placeholder:text-[#bbb] dark:placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-[#333] dark:text-foreground">
                Password
              </label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-accent hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={6}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-[#ddd] dark:border-border bg-white dark:bg-card text-sm text-[#111] dark:text-foreground placeholder:text-[#bbb] dark:placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#999] dark:text-muted hover:text-[#666] dark:hover:text-foreground cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Reset email sent */}
          {resetSent && (
            <p className="text-sm text-green-600 dark:text-green-400 text-center">
              Password reset email sent. Check your inbox.
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? "Please wait…"
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="text-sm text-[#666] dark:text-muted text-center mt-6">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setResetSent(false);
                }}
                className="text-accent font-medium hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setResetSent(false);
                }}
                className="text-accent font-medium hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
