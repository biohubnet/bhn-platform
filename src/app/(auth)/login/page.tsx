"use client";
import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Sparkles, Check, CheckCircle2, Coins, GraduationCap, Layers, Briefcase,
  FlaskConical,
} from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { ThemeCycler } from "@/components/ui/ThemePicker";

const REMEMBER_KEY = "bhn-remember-email";

// Top-level page wraps the form in Suspense — useSearchParams in
// Next.js 16 forces a Suspense boundary or static prerender errors.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-brand-50 via-card to-brand-100" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const justRegistered = params.get("registered") === "1";
  const prefillEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Two-step disclosure for MFA. After password is filled, we probe
  // /api/auth/mfa/check to see if the account has TOTP enabled — if
  // it does, the form expands a second field for the 6-digit code.
  const [mfaRequired, setMfaRequired] = useState(false);
  const [totp, setTotp] = useState("");

  // Pre-fill: ?email=… from registration / employer-invite fallback
  // takes priority; otherwise fall back to localStorage Remember-Me.
  useEffect(() => {
    if (prefillEmail) return;
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {}
  }, [prefillEmail]);

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

    // First sign-in attempt without TOTP. Probe MFA status BEFORE
    // submitting so the UX expands cleanly when MFA is on.
    if (!mfaRequired) {
      try {
        const probe = await fetch("/api/auth/mfa/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const probeJson = await probe.json().catch(() => ({}));
        if (probeJson?.mfaRequired) {
          setMfaRequired(true);
          setLoading(false);
          return;
        }
      } catch { /* network blip — fall through and try the sign-in */ }
    }

    const res = await signIn("credentials", {
      email,
      password,
      totp: mfaRequired ? totp : "",
      remember: remember ? "true" : "false",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(mfaRequired ? "Code didn't match — check your authenticator." : "Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-brand-50 via-card to-brand-100 px-4 py-8">
      {/* ─── BACKDROP — huge cropped four-petal mark. Scaled big
           enough that the SVG's edges always sit OFF-screen on the
           upper-right so the visible region reads as a continuous
           bleed instead of "a logo over there with a hard edge".
           A radial soft-fade mask on the same layer feathers it
           further into the page background. Bold opacity (28%) per
           user request. ─── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage: "url('/biohubnet-logo.svg')",
          backgroundSize: "min(2400px, 360%) auto",
          backgroundPosition: "calc(100% + 540px) calc(0% - 360px)",
          backgroundRepeat: "no-repeat",
          // Soft radial fade so the petal feathers into the page
          // gradient instead of presenting a circular outline.
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 100% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 95%)",
          maskImage:
            "radial-gradient(ellipse 90% 80% at 100% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 95%)",
        }}
      />
      {/* Soft radial white wash on top to keep the form column
          legible against the bolder backdrop. Anchored to the
          lower-left where the cards sit. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 65%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 55%)",
        }}
      />

      {/* Top bar — small mark + theme cycler */}
      <div className="relative max-w-6xl mx-auto flex items-center justify-between mb-10 sm:mb-14">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <LogoMark size={32} className="drop-shadow-[0_3px_8px_rgba(28,47,122,0.18)]" />
          <span className="text-sm font-bold tracking-tight text-fg">
            Bio<span className="text-brand-600">Hub</span><span className="text-emerald-600">Net</span>
          </span>
        </Link>
        <ThemeCycler />
      </div>

      {/* ─── TEASER HEADER ─────────────────────────────────────────
           Lab-coat tone, biotech wordplay. A small "incubating"
           badge, a bold headline, a sub. Drops in just above the
           sign-in / register dual card so the page reads as a
           campaign first and a form second. */}
      <div className="relative max-w-6xl mx-auto mb-8 sm:mb-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 ring-1 ring-inset ring-amber-200 px-3 py-1 text-[10px] uppercase tracking-[0.22em] font-black text-amber-800">
          <FlaskConical size={11} className="animate-pulse" />
          Phase II · Incubating
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-fg leading-[1.05] max-w-3xl">
          Something big is{" "}
          <span
            className="inline-block"
            style={{
              backgroundImage:
                "linear-gradient(120deg, #1d4f8b 0%, #2c8aa3 50%, #3fa86a 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            culturing.
          </span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-fg-muted max-w-2xl leading-relaxed">
          BioHubNet is amplifying. New pathways, new partner labs, the EQUIP funding
          pillar going live. Sign in to watch the cohort grow — or pull up a pipette
          and join the next round.{" "}
          <span className="font-mono text-xs text-fg-subtle">// p &lt; 0.05, results pending</span>
        </p>
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/*
         * Two-box layout. New user signup on the left, returning
         * user login on the right. On mobile they stack — signup
         * first because it's a healthy default to lead with the
         * higher-friction action when the page is everyone's first
         * stop.
         */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* ─── LEFT: New user signup ──────────────────────────────── */}
          <section className="bg-card rounded-2xl shadow-xl shadow-brand-900/5 border-2 border-brand-200 p-8 hover:border-brand-400 hover:shadow-2xl hover:shadow-brand-600/10 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-brand-700 font-semibold">New here</p>
                <h2 className="text-xl font-bold text-fg leading-tight">Start training with BHN</h2>
              </div>
            </div>

            <p className="text-sm text-muted leading-relaxed">
              Free to start. <span className="inline-flex items-center gap-1 text-fg font-medium"><Coins size={11} className="text-amber-500" /> 200 BHN credits</span> on the house — most courses cost 50–200, with 4,800 more available after admin review.
            </p>

            <ul className="mt-4 space-y-2">
              <Bullet icon={GraduationCap}>Industry-led training across biomanufacturing, regulatory, and analytical tracks</Bullet>
              <Bullet icon={Layers}>Pathways stack courses into focused career tracks (MSL, entrepreneurship, more)</Bullet>
              <Bullet icon={Briefcase}>Internship + full-time matching with vetted employer partners</Bullet>
            </ul>

            <Link
              href="/register"
              className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5 transition-all"
            >
              Create your free account
              <ArrowRight size={16} />
            </Link>
            <p className="text-[11px] text-subtle text-center mt-2.5">
              Takes about a minute. No payment info needed.
            </p>
          </section>

          {/* ─── RIGHT: Returning user login ─────────────────────────── */}
          <section className="bg-card rounded-2xl shadow-xl shadow-brand-900/5 border border-line p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-elevated text-muted flex items-center justify-center shrink-0">
                <ArrowRight size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold">Returning</p>
                <h2 className="text-xl font-bold text-fg leading-tight">
                  {justRegistered ? "Account created — sign in" : "Welcome back"}
                </h2>
              </div>
            </div>

            {justRegistered && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3 inline-flex items-start gap-2 w-full">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>
                  Your account is ready. We pre-filled your email — just enter the password you chose.
                </span>
              </div>
            )}

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
                  className="w-full bg-card-solid border border-line rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
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
                  className="w-full bg-card-solid border border-line rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              {/* MFA — second-factor field. Only revealed after the
                  /api/auth/mfa/check probe says this account has TOTP
                  enabled. Until then the form behaves like before. */}
              {mfaRequired && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Authenticator code
                  </label>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    required
                    autoComplete="one-time-code"
                    autoFocus
                    className="w-32 text-center text-lg font-mono tracking-[0.3em] bg-card-solid border border-line rounded-lg px-3 py-2.5 text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                    placeholder="123 456"
                  />
                  <p className="text-[11px] text-subtle mt-1">
                    From your authenticator app (Google Authenticator, 1Password, Authy …).
                  </p>
                </div>
              )}

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
                className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-md shadow-brand-600/25 text-sm"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </section>
        </div>

        <p className="text-center text-xs text-subtle mt-8">
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}

function Bullet({
  icon: Icon, children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 text-xs text-muted leading-snug">
      <span className="w-5 h-5 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={11} />
      </span>
      <span>{children}</span>
    </li>
  );
}
