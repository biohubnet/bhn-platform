"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles, Check, Mail, KeyRound, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeCycler } from "@/components/ui/ThemePicker";
import { cn } from "@/lib/utils";

const REMEMBER_KEY = "bhn-remember-email";
type Method = "password" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {}
  }, []);

  function clearMessages() {
    setError("");
    setInfo("");
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
      sessionStorage.setItem("bhn-session-only", remember ? "0" : "1");
    } catch {}
    const res = await signIn("credentials", {
      email,
      password,
      remember: remember ? "true" : "false",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) setError("Invalid email or password");
    else router.push("/dashboard");
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(j.error ?? "Couldn't send the code.");
        return;
      }
      setCodeSent(true);
      setInfo(`Code sent to ${email}. It expires in 10 minutes.`);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, email);
      } catch {}
      const res = await signIn("email-code", {
        email,
        code,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid or expired code. Try again or request a new one.");
        return;
      }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  function switchMethod(next: Method) {
    setMethod(next);
    setCodeSent(false);
    setCode("");
    clearMessages();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-card to-brand-100 px-4 py-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeCycler />
      </div>
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <Logo size="lg" />
        </Link>

        <div className="bg-card rounded-2xl shadow-xl shadow-brand-900/5 border border-line p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-fg">Welcome back</h1>
            <p className="text-muted text-sm mt-1">Sign in to continue your training.</p>
          </div>

          {/* Method toggle */}
          <div role="tablist" className="flex bg-elevated rounded-lg p-1 mb-5 text-sm">
            <button
              type="button"
              role="tab"
              aria-selected={method === "password"}
              onClick={() => switchMethod("password")}
              className={cn(
                "flex-1 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5",
                method === "password"
                  ? "bg-card-solid text-fg shadow-sm"
                  : "text-muted hover:text-fg"
              )}
            >
              <KeyRound size={14} /> Password
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={method === "code"}
              onClick={() => switchMethod("code")}
              className={cn(
                "flex-1 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5",
                method === "code"
                  ? "bg-card-solid text-fg shadow-sm"
                  : "text-muted hover:text-fg"
              )}
            >
              <Mail size={14} /> Email code
            </button>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3 mb-4">
              {info}
            </div>
          )}

          {method === "password" ? (
            <form onSubmit={submitPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-card border border-line rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-muted">Password</label>
                  <button
                    type="button"
                    onClick={() => switchMethod("code")}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Forgot? Use email code
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-card border border-line rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <span className="relative">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="sr-only peer"
                  />
                  <span className="w-4 h-4 rounded border border-line bg-card transition-all peer-checked:bg-brand-600 peer-checked:border-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30 flex items-center justify-center">
                    {remember && <Check size={11} className="text-white" strokeWidth={3} />}
                  </span>
                </span>
                <span className="text-xs text-muted group-hover:text-fg transition-colors">
                  Remember me on this device
                </span>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-md shadow-brand-600/25 text-sm"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : !codeSent ? (
            <form onSubmit={sendCode} className="space-y-4">
              <p className="text-xs text-muted -mt-1">
                We&apos;ll email a 6-digit code. It expires in 10 minutes.
              </p>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-card border border-line rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-md shadow-brand-600/25 text-sm flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {loading ? "Sending…" : "Send code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  className="w-full bg-card border border-line rounded-lg px-3 py-3 text-center font-mono tracking-[0.5em] text-xl text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  placeholder="······"
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-md shadow-brand-600/25 text-sm"
              >
                {loading ? "Signing in…" : "Verify & sign in"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                  clearMessages();
                }}
                className="w-full text-xs text-muted hover:text-fg transition-colors"
              >
                Use a different email or resend
              </button>
            </form>
          )}
        </div>

        {/* Big register CTA */}
        <div className="mt-6 bg-card border-2 border-brand-200 rounded-2xl p-6 hover:border-brand-400 hover:shadow-lg hover:shadow-brand-600/10 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-fg">New to BHN Training?</p>
              <p className="text-sm text-muted mt-0.5">
                Create a free account and start with 200 BHN credits. Apply for an additional 4,800 once you&apos;re in.
              </p>
            </div>
          </div>
          <Link
            href="/register"
            className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5 transition-all"
          >
            Create your free account
            <ArrowRight size={18} />
          </Link>
        </div>

        <p className="text-center text-xs text-subtle mt-8">
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
