"use client";
import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Check, CheckCircle2, Coins, GraduationCap, Layers, Briefcase,
  FlaskConical,
} from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { StylizedMark } from "@/components/branding/StylizedMark";
import {
  DnaHelix, Antibody, LipidNanoparticle, CellSchematic, Bioreactor,
  TFlask, Ribosome,
} from "@/components/branding/BiomanufacturingGlyphs";
import { DraggableGlyph } from "@/components/branding/DraggableGlyph";
import { MscCultureCycle } from "@/components/branding/MscCultureCycle";
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
    <div
      className="min-h-screen relative overflow-hidden px-4 py-8 text-slate-100"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 60% at 50% -10%, #1e3a8a 0%, #0b0f24 55%, #050614 100%)",
      }}
    >
      {/* Aurora wash — gentle cyan/teal glow behind the petal so
          the brand colours register in the spotlight pool. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 600px at 50% 22%, rgba(56,189,248,0.22) 0%, rgba(56,189,248,0) 65%), radial-gradient(circle 500px at 50% 30%, rgba(63,168,106,0.18) 0%, rgba(63,168,106,0) 70%)",
        }}
      />
      {/* Spotlight cone — a tighter ellipse of warm-white over the
          aurora wash so the petal reads as the lit subject of a
          theatre stage. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 30% 22% at 50% 22%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 75%)",
        }}
      />

      {/* ─── BHN MARK — design-study backdrop. Left half is the
           hand-drawn sketch + construction grid, right half is
           the finished gradient mark. Pinned to the BOTTOM-RIGHT
           corner and pulled partially off-screen so it lives in
           the dark periphery, NEVER behind the centred teaser
           headline or the form columns. */}
      <div
        aria-hidden
        className="pointer-events-none absolute opacity-[0.55] mix-blend-screen"
        style={{
          bottom: "-160px",
          right: "-160px",
          filter:
            "drop-shadow(0 0 40px rgba(56,189,248,0.35)) drop-shadow(0 0 16px rgba(63,168,106,0.25))",
        }}
      >
        <StylizedMark size={520} />
      </div>

      {/* ─── BIOMANUFACTURING MOLECULES — periphery-only.
           Every glyph is positioned in the LEFT or RIGHT edge
           zone (within ~10 % of the viewport edge), well clear of
           the form column in the middle. Combined with the swim
           translate (≤ 58 px) + rotation orbit (≤ ~40 px) + the
           poke physics that pushes them AWAY from any cursor that
           drifts close (and the form sits where the cursor lives
           most), they'll never wander into the centre. Drag-to-
           centre is overridden the moment you release because
           spring-back pulls each glyph back to its base position.
           All `hidden lg:block` — only fire when there's actual
           periphery to fly around in. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* ── LEFT EDGE ─────────────────────────────────────────── */}

        {/* Antibody — top-left corner */}
        <DraggableGlyph
          className="absolute left-[3%] top-[14%] text-emerald-300/22 hidden lg:block"
          swimClass="lab-swim-rev"
        >
          <Antibody size={88} strokeWidth={2} />
        </DraggableGlyph>

        {/* Ribosome translating mRNA — left edge upper-mid */}
        <DraggableGlyph
          className="absolute left-[2%] top-[30%] text-cyan-200/22 hidden lg:block"
          swimClass="lab-swim-slow"
          pokeRadius={170}
        >
          <Ribosome size={130} strokeWidth={1.2} />
        </DraggableGlyph>

        {/* DNA double helix — left edge mid */}
        <DraggableGlyph
          className="absolute left-[2%] top-[58%] text-sky-300/25 hidden lg:block"
          swimClass="lab-swim-slow"
        >
          <DnaHelix size={160} strokeWidth={1.3} />
        </DraggableGlyph>

        {/* T-flask — left edge bottom */}
        <DraggableGlyph
          className="absolute left-[4%] bottom-[8%] text-teal-200/22 hidden lg:block"
          swimClass="lab-swim-drift"
        >
          <TFlask size={140} strokeWidth={1.3} />
        </DraggableGlyph>

        {/* ── RIGHT EDGE ────────────────────────────────────────── */}

        {/* MSC passaging cycle — top-right corner, the
            storytelling vignette (large enough for the stage
            label to read) */}
        <DraggableGlyph
          className="absolute right-[2%] top-[10%] text-slate-200/35 hidden lg:block"
          swimClass="lab-swim-slow"
          pokeRadius={140}
        >
          <MscCultureCycle size={200} />
        </DraggableGlyph>

        {/* Lipid nanoparticle — right edge upper-mid */}
        <DraggableGlyph
          className="absolute right-[4%] top-[50%] text-violet-300/22 hidden lg:block"
          swimClass="lab-swim"
        >
          <LipidNanoparticle size={104} strokeWidth={1.3} />
        </DraggableGlyph>

        {/* Cell — right edge mid-lower */}
        <DraggableGlyph
          className="absolute right-[3%] top-[66%] text-rose-300/18 hidden lg:block"
          swimClass="lab-swim-slow"
        >
          <CellSchematic size={120} strokeWidth={1.2} />
        </DraggableGlyph>

        {/* Bioreactor — bottom-right corner, the workhorse vessel */}
        <DraggableGlyph
          className="absolute right-[6%] bottom-[6%] text-cyan-200/22 hidden lg:block"
          swimClass="lab-swim-rev"
        >
          <Bioreactor size={96} strokeWidth={1.3} />
        </DraggableGlyph>
      </div>

      {/* Vignette — gentle darken at the page edges so the
          spotlight pool reads as the focal area. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 110% 90% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Top bar — small mark + theme cycler */}
      <div className="relative max-w-6xl mx-auto flex items-center justify-between mb-10 sm:mb-14">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <LogoMark size={32} className="drop-shadow-[0_3px_12px_rgba(56,189,248,0.45)]" />
          <span className="text-sm font-bold tracking-tight text-white">
            Bio<span className="text-sky-300">Hub</span><span className="text-emerald-300">Net</span>
          </span>
        </Link>
        <ThemeCycler />
      </div>

      {/* ─── TEASER HEADER ─────────────────────────────────────────
           Lab-coat tone, biotech wordplay. Sits in the lit pool of
           the spotlight, with the petal glowing above. Text colours
           hardcoded against the dark stage so they're readable
           regardless of the viewer's theme. */}
      <div className="relative max-w-6xl mx-auto mb-8 sm:mb-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-300/15 ring-1 ring-inset ring-amber-300/40 px-3 py-1 text-[10px] uppercase tracking-[0.22em] font-black text-amber-200 backdrop-blur-sm">
          <FlaskConical size={11} className="animate-pulse" />
          Phase II · Incubating
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05] max-w-3xl mx-auto drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)]">
          Something big is{" "}
          <span
            className="inline-block"
            style={{
              backgroundImage:
                "linear-gradient(120deg, #7dd3fc 0%, #5eead4 50%, #86efac 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            culturing.
          </span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          BioHubNet is amplifying. New pathways, new partner labs, the EQUIP funding
          pillar going live. Sign in to watch the cohort grow — or pull up a pipette
          and join the next round.
        </p>
      </div>

      <div className="relative max-w-5xl mx-auto mt-12 sm:mt-16">
        {/*
         * Editorial split — 2 columns on lg, with a vertical
         * hairline divider between. No card chrome, no rounded
         * box; just lines, gradients, and breathing room. Each
         * column carries its own "01 / 02" runway-style number
         * stamp so the pair reads like a magazine spread.
         */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_1fr] gap-8 lg:gap-0 items-stretch">
          {/* ── 01 · NEW HERE ──────────────────────────────────────── */}
          <section className="lg:pr-12 flex flex-col">
            <div className="flex items-baseline justify-between mb-6">
              <span
                className="font-serif italic text-5xl leading-none"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg, #7dd3fc 0%, #5eead4 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                01
              </span>
              <p className="text-[10px] uppercase tracking-[0.32em] font-semibold text-white/50">
                New here
              </p>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Start training{" "}
              <span className="font-serif italic font-normal text-white/85">with us</span>
            </h2>

            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              Free to start.{" "}
              <span className="inline-flex items-center gap-1 text-white font-semibold">
                <Coins size={11} className="text-amber-300" /> 200 BHN credits
              </span>{" "}
              on the house — most courses cost 50–200, with 4,800 more available
              after admin review.
            </p>

            <ul className="mt-6 space-y-3 border-t border-white/10 pt-5">
              <Bullet icon={GraduationCap}>Industry-led training across biomanufacturing, regulatory, and analytical tracks</Bullet>
              <Bullet icon={Layers}>Pathways stack courses into focused career tracks (MSL, entrepreneurship, more)</Bullet>
              <Bullet icon={Briefcase}>Internship + full-time matching with vetted employer partners</Bullet>
            </ul>

            {/* Bottom-anchored CTA — gradient-filled "primary"
                treatment, distinct from the Sign-in white button.
                `mt-auto` keeps it on the same baseline as Sign-in. */}
            <div className="mt-auto pt-8">
              <Link
                href="/register"
                className="group relative w-full inline-flex items-center justify-center gap-3 text-white font-bold tracking-tight py-3.5 text-base overflow-hidden transition-transform hover:-translate-y-px"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg, #1d4f8b 0%, #2c8aa3 50%, #3fa86a 100%)",
                  boxShadow:
                    "0 10px 28px -8px rgba(56,189,248,0.45), inset 0 1px 0 rgba(255,255,255,0.22)",
                }}
              >
                {/* Soft inner shine sweep on hover */}
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background:
                      "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
                  }}
                />
                <span className="relative">Create your free account</span>
                <ArrowRight size={16} className="relative group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="text-[11px] text-white/40 mt-3 text-center">
                About a minute. No payment info needed.
              </p>
            </div>
          </section>

          {/* Vertical hairline divider — only renders on lg+ where
              the columns sit side-by-side. */}
          <div aria-hidden className="hidden lg:block w-px h-full bg-gradient-to-b from-transparent via-white/15 to-transparent" />

          {/* ── 02 · RETURNING ────────────────────────────────────── */}
          <section className="lg:pl-12 flex flex-col">
            <div className="flex items-baseline justify-between mb-6">
              <span
                className="font-serif italic text-5xl leading-none"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg, #86efac 0%, #fcd34d 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                02
              </span>
              <p className="text-[10px] uppercase tracking-[0.32em] font-semibold text-white/50">
                Returning
              </p>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              {justRegistered ? (
                <>Account created — <span className="font-serif italic font-normal text-white/85">sign in</span></>
              ) : (
                <>Welcome <span className="font-serif italic font-normal text-white/85">back</span></>
              )}
            </h2>

            {justRegistered && (
              <div className="mt-4 border-l-2 border-emerald-400 pl-4 py-1 text-sm text-emerald-200 inline-flex items-start gap-2 w-full">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
                <span>
                  Your account is ready. We pre-filled your email — just enter the password you chose.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-6 flex-1 flex flex-col">
              {error && (
                <div className="border-l-2 border-rose-400 pl-4 py-1 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <LineField label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-transparent border-0 border-b border-white/30 px-0 py-2 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-white transition-colors"
                  placeholder="you@lab.…"
                />
              </LineField>

              <LineField
                label="Password"
                aside={
                  <Link href="/login" className="text-[11px] uppercase tracking-[0.22em] text-white/50 hover:text-white transition-colors">
                    Forgot?
                  </Link>
                }
              >
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-transparent border-0 border-b border-white/30 px-0 py-2 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-white transition-colors"
                  placeholder="••••••••"
                />
              </LineField>

              {mfaRequired && (
                <LineField label="Authenticator code" hint="From your authenticator app (Google Authenticator, 1Password, Authy …).">
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    required
                    autoComplete="one-time-code"
                    autoFocus
                    className="w-40 bg-transparent border-0 border-b border-white/30 px-0 py-2 text-center text-xl font-mono tracking-[0.4em] text-white placeholder:text-white/25 focus:outline-none focus:border-white transition-colors"
                    placeholder="123 456"
                  />
                </LineField>
              )}

              {/* Remember me — minimal toggle, on a line of its own. */}
              <label className="flex items-center gap-3 cursor-pointer select-none group">
                <span className="relative">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="sr-only peer"
                  />
                  <span className="w-4 h-4 border border-white/40 bg-transparent transition-all peer-checked:bg-white peer-checked:border-white flex items-center justify-center">
                    {remember && <Check size={11} className="text-slate-900" strokeWidth={3} />}
                  </span>
                </span>
                <span className="text-xs text-white/60 group-hover:text-white/85 transition-colors">
                  Remember me on this device
                </span>
              </label>

              {/* Submit anchored at the bottom of the flex form so
                  it sits on the same baseline as the Sign-up CTA
                  across the divider — and now wears the same
                  brand-gradient treatment so the pair reads as
                  one design system, not flat-white-vs-gradient. */}
              <div className="mt-auto pt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full inline-flex items-center justify-center gap-3 text-white font-bold tracking-tight py-3.5 text-base overflow-hidden transition-transform hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(120deg, #1d4f8b 0%, #2c8aa3 50%, #3fa86a 100%)",
                    boxShadow:
                      "0 10px 28px -8px rgba(56,189,248,0.45), inset 0 1px 0 rgba(255,255,255,0.22)",
                  }}
                >
                  {/* Inner shine sweep on hover — same as Sign-up */}
                  <span
                    aria-hidden
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background:
                        "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
                    }}
                  />
                  {loading ? (
                    <span className="relative">Signing in…</span>
                  ) : (
                    <>
                      <span className="relative">Sign in</span>
                      <ArrowRight size={16} className="relative group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
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
    <li className="flex items-start gap-3 text-sm text-slate-300 leading-snug">
      <span className="w-5 h-5 inline-flex items-center justify-center shrink-0 mt-0.5 text-sky-300">
        <Icon size={13} strokeWidth={1.5} />
      </span>
      <span>{children}</span>
    </li>
  );
}

/** Editorial "line" field — label above (uppercase tracked, light
 *  on the dark stage), input as a single underline. Replaces the
 *  card-style bordered inputs the form used to render with. */
function LineField({
  label,
  hint,
  aside,
  children,
}: {
  label: string;
  hint?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.32em] font-semibold text-white/60">
          {label}
        </span>
        {aside}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-white/45 mt-1.5">{hint}</span>}
    </label>
  );
}
