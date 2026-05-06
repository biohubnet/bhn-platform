"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeCycler } from "@/components/ui/ThemePicker";

const REMEMBER_KEY = "bhn-remember-email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill from localStorage if user previously chose Remember Me
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Persist or clear the remembered email
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
      // Mark this tab so we know whether to keep the session beyond the tab.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
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
                <Link href="/login" className="text-xs text-brand-600 hover:underline">
                  Forgot?
                </Link>
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

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <span className="relative">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="sr-only peer"
                />
                <span
                  className="w-4 h-4 rounded border border-line bg-card transition-all peer-checked:bg-brand-600 peer-checked:border-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30 flex items-center justify-center"
                >
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
                Create a free account in under a minute. New learners start with 5,000 BHN credits.
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
