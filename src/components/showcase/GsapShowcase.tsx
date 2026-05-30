"use client";
/**
 * GsapShowcase — an agency-grade, GSAP-powered product-launch page for the
 * BioHubNet platform. Every section is a REAL platform feature (the
 * ENGAGE / EXPERIENCE / EQUIP pillars, career pathways, the AI resume +
 * fit-rating matrix, employer Talent Reports, AutoPipette), choreographed
 * with the official GSAP skills' React patterns:
 *
 *   • useGSAP() scoped to a ref → auto-cleanup of every tween / ScrollTrigger
 *     / ScrollSmoother on unmount; SSR-safe (nothing runs on the server).
 *   • gsap.matchMedia("(prefers-reduced-motion: no-preference)") owns ALL
 *     motion incl. ScrollSmoother; the reduce branch leaves everything
 *     visible + static.
 *   • contextSafe() for event-handler tweens; ScrollTrigger only on
 *     top-level timelines; markers off; each block guarded so one hiccup
 *     degrades gracefully.
 *
 * Fixed chrome (nav, progress, cursor glow) lives OUTSIDE #smooth-content —
 * ScrollSmoother transforms that node, which would break position:fixed.
 */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Outfit } from "next/font/google";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { TextPlugin } from "gsap/TextPlugin";
import { CustomEase } from "gsap/CustomEase";
import { CustomWiggle } from "gsap/CustomWiggle";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(
  useGSAP, ScrollTrigger, ScrollSmoother, SplitText, DrawSVGPlugin,
  MotionPathPlugin, TextPlugin, CustomEase, CustomWiggle,
);

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "800", "900"], display: "swap" });

const TEAL = "#2dd4bf";
const CYAN = "#22d3ee";

const PILLARS = [
  {
    tag: "Engage", color: CYAN,
    title: "Learn the bench.",
    body: "Eight biomanufacturing career tracks mapped Junior to VP, platform courses tuned to each rung, and an AI tutor that meets you where you are.",
    points: ["Career pathways", "Course catalog", "AI tutor"],
  },
  {
    tag: "Experience", color: TEAL,
    title: "Land the role.",
    body: "Live internships from industry partners, a talent pool employers actually browse, and AI that tailors your resume and rates your fit, role by role.",
    points: ["Internship board", "AI resume + tailoring", "Fit-rating matrix"],
  },
  {
    tag: "Equip", color: "#a78bfa",
    title: "Fund the leap.",
    body: "Turn a project into a venture. VentureConnect backs events and conferences up to $5K; VentureLift backs commercialization up to $25K.",
    points: ["VentureConnect · ≤ $5K", "VentureLift · ≤ $25K", "Guided wizard"],
  },
];

const STATS = [
  { v: 8, suffix: "", label: "Career tracks" },
  { v: 5, suffix: "", label: "Stations, Junior to VP" },
  { v: 9, suffix: "", label: "Talent reports" },
  { v: 25, suffix: "K", prefix: "$", label: "Funding per venture" },
];

const RAIL = [
  ["AI tutor", "Ask anything about a course; grounded in the material."],
  ["Master resume", "One library of bullets; pull into any tailored draft."],
  ["Fit-rating matrix", "Strong / Partial / Gap against every requirement."],
  ["Interview prep", "Likely questions + STAR answers from your resume."],
  ["AutoPipette", "Notices when you're stuck, suggests the next step."],
  ["Talent Reports", "Board-ready KPIs, OKRs with RAG, opt-in DEI."],
];

const FIT_ROWS = [
  { req: "Mammalian cell culture", rating: "strong", pct: 96 },
  { req: "GMP documentation", rating: "strong", pct: 88 },
  { req: "Aseptic technique · BSL-2", rating: "partial", pct: 58 },
  { req: "Bioreactor scale-up", rating: "partial", pct: 49 },
  { req: "Regulatory (ICH Q2)", rating: "gap", pct: 18 },
];
const RATING_COLOR: Record<string, string> = { strong: "#34d399", partial: "#fbbf24", gap: "#fb7185" };

export function GsapShowcase() {
  const root = useRef<HTMLDivElement>(null);

  // The app's <body> carries the platform's light theme background. This
  // page is dark, and ScrollSmoother makes the wrapper position:fixed (so a
  // bg on our own divs can be bypassed at the edges). Paint the body dark
  // while this page is mounted; restore on unmount.
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#07101a";
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  useGSAP(
    (_ctx, contextSafe) => {
      const q = <T extends Element = HTMLElement>(s: string) => root.current?.querySelector<T>(s) ?? null;
      const cleanups: Array<() => void> = [];
      const splits: SplitText[] = [];
      const safe = (fn: () => void) => { try { fn(); } catch (e) { console.warn("[launch]", e); } };

      // Progress bar (works with or without smoother).
      safe(() => gsap.to(".gs-progress", { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.body, start: 0, end: "max", scrub: 0.3 } }));

      const counter = (el: HTMLElement | null, to: number, prefix = "", suffix = "") => {
        if (!el) return;
        const o = { v: 0 };
        gsap.to(o, {
          v: to, duration: 1.6, ease: "power2.out", snap: { v: 1 },
          scrollTrigger: { trigger: el, start: "top 85%" },
          onUpdate: () => { el.textContent = `${prefix}${Math.round(o.v)}${suffix}`; },
        });
      };

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Smooth scrolling + data-speed parallax (guarded → native scroll on fail).
        safe(() => { ScrollSmoother.create({ wrapper: "#smooth-wrapper", content: "#smooth-content", smooth: 1.15, effects: true }); });

        // Cursor-follow glow (fine pointers only) via quickTo.
        safe(() => {
          const glow = q("#cursor-glow");
          if (glow && window.matchMedia("(pointer:fine)").matches) {
            gsap.set(glow, { opacity: 1 });
            const xTo = gsap.quickTo(glow, "x", { duration: 0.6, ease: "power3" });
            const yTo = gsap.quickTo(glow, "y", { duration: 0.6, ease: "power3" });
            const move = (e: PointerEvent) => { xTo(e.clientX); yTo(e.clientY); };
            window.addEventListener("pointermove", move);
            cleanups.push(() => window.removeEventListener("pointermove", move));
          }
        });

        // Reusable reveal effect (registerEffect) for headings + cards.
        safe(() => {
          gsap.registerEffect({
            name: "reveal",
            defaults: { y: 42, duration: 0.9, ease: "power3.out", stagger: 0.08 },
            extendTimeline: false,
            effect: (targets: Element[], cfg: { y: number; duration: number; ease: string; stagger: number }) =>
              gsap.from(targets, { y: cfg.y, opacity: 0, duration: cfg.duration, ease: cfg.ease, stagger: cfg.stagger, scrollTrigger: { trigger: targets[0], start: "top 86%" } }),
          });
          gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => (gsap.effects as Record<string, (t: Element[]) => gsap.core.Tween>).reveal([el]));
        });

        // Hero — SplitText WORD reveal. Words only (no overflow-clipped line
        // wrappers, which hid the H1 when Outfit loaded taller than the split-
        // time fallback font). Built after fonts are ready so the split
        // measures correctly, and driven by an in-view ScrollTrigger so it
        // actually plays (a bare from() stayed stuck at opacity:0 here).
        safe(() => {
          const buildHero = () => {
            const st = new SplitText(".hero-h1", { type: "words" });
            splits.push(st);
            gsap.from(st.words, {
              y: 44, opacity: 0, stagger: 0.045, duration: 0.85, ease: "power3.out",
              scrollTrigger: { trigger: ".hero-h1", start: "top 95%", once: true },
            });
            ScrollTrigger.refresh();
          };
          if (document.fonts?.ready) document.fonts.ready.then(buildHero); else buildHero();
        });
        safe(() => gsap.from(".hero-fade", {
          y: 26, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.12,
          scrollTrigger: { trigger: ".hero-section", start: "top 95%", once: true },
        }));

        // Career pathways — DrawSVG line-draw + nodes, scrubbed; a node rides the path.
        safe(() => {
          gsap.timeline({ scrollTrigger: { trigger: ".path-sec", start: "top 65%", end: "bottom 70%", scrub: 1 } })
            .from(".path-line", { drawSVG: "0%", ease: "none" }, 0)
            .from(".path-node", { scale: 0, transformOrigin: "center", stagger: 0.4, ease: "back.out(2)" }, 0.1);
          gsap.to(".path-rider", { motionPath: { path: "#path-spine", align: "#path-spine", alignOrigin: [0.5, 0.5] }, ease: "none", scrollTrigger: { trigger: ".path-sec", start: "top 65%", end: "bottom 70%", scrub: 1 } });
        });

        // Fit matrix — bars grow + score counts, on enter.
        safe(() => {
          gsap.from(".fit-bar", { scaleX: 0, transformOrigin: "left center", stagger: 0.12, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".fit-sec", start: "top 75%" } });
          counter(q(".fit-score"), 64, "", "");
        });

        // Stats counters.
        STATS.forEach((s, i) => safe(() => counter(q(`.stat-${i}`), s.v, s.prefix ?? "", s.suffix ?? "")));

        // Talent Reports — KPI bars grow.
        safe(() => gsap.from(".kpi-bar", { height: 0, transformOrigin: "bottom", stagger: 0.1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".kpi-sec", start: "top 78%" } }));

        // Feature rail — pinned, scrolls horizontally (ease: none).
        safe(() => {
          const track = q(".rail-track");
          if (track) {
            gsap.to(track, {
              xPercent: -100 * ((track.children.length - 1) / track.children.length),
              ease: "none",
              scrollTrigger: { trigger: ".rail-sec", start: "top top", end: "+=2200", scrub: 1, pin: true },
            });
          }
        });

        // CTA — CustomWiggle on the arrow, looping subtly.
        safe(() => {
          CustomWiggle.create("ctaWiggle", { wiggles: 6, type: "easeOut" });
          gsap.to(".cta-arrow", { x: 8, duration: 1.4, ease: "ctaWiggle", repeat: -1, repeatDelay: 1.6 });
        });

        // Re-measure trigger positions once the web font has loaded, so the
        // reveals/pins don't fire against a pre-font layout.
        safe(() => { document.fonts?.ready?.then(() => ScrollTrigger.refresh()); });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        // Everything visible + static.
        safe(() => gsap.set([".hero-fade", ".reveal", ".fit-bar", ".kpi-bar"], { clearProps: "all" }));
        safe(() => gsap.set(".path-line", { drawSVG: "100%" }));
        STATS.forEach((s, i) => safe(() => { const el = q(`.stat-${i}`); if (el) el.textContent = `${s.prefix ?? ""}${s.v}${s.suffix ?? ""}`; }));
        safe(() => { const el = q(".fit-score"); if (el) el.textContent = "64"; });
      });

      return () => { splits.forEach((s) => s.revert()); cleanups.forEach((fn) => fn()); };
    },
    { scope: root },
  );

  return (
    <div ref={root} className={`${outfit.className} bg-[#07101a] text-white overflow-x-hidden`}>
      {/* ── Fixed chrome (outside #smooth-content) ── */}
      <div id="cursor-glow" aria-hidden className="pointer-events-none fixed top-0 left-0 z-[5] w-[42rem] h-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0" style={{ background: `radial-gradient(circle, ${CYAN}22 0%, transparent 60%)` }} />
      <div className="gs-progress fixed top-0 left-0 right-0 h-[3px] origin-left z-50" style={{ transform: "scaleX(0)", background: `linear-gradient(90deg, ${CYAN}, ${TEAL})` }} aria-hidden />
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-6 rounded-full px-5 py-2.5 ring-1 ring-white/10 bg-white/[0.06] backdrop-blur-md">
        <span className="font-black tracking-tight text-[15px]">BioHubNet</span>
        <div className="hidden sm:flex items-center gap-5 text-[12px] text-white/60 font-medium">
          <a href="#pillars" className="hover:text-white transition-colors">Platform</a>
          <a href="#pathways" className="hover:text-white transition-colors">Pathways</a>
          <a href="#equip" className="hover:text-white transition-colors">Funding</a>
        </div>
        <Link href="/dashboard" className="text-[12px] font-bold rounded-full px-3.5 py-1.5 text-[#07101a]" style={{ background: TEAL }}>Enter</Link>
      </nav>

      <div id="smooth-wrapper" className="bg-[#07101a]">
        <div id="smooth-content" className="bg-[#07101a]">
          {/* ── HERO ── */}
          <section className="hero-section relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
            <div aria-hidden className="absolute inset-0 overflow-hidden">
              <div data-speed="0.85" className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[120vw] h-[80vh] rounded-full blur-[120px] opacity-50" style={{ background: `radial-gradient(circle, ${"#0d9488"}55, transparent 60%)` }} />
              <div data-speed="1.1" className="absolute top-1/3 left-[8%] w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: `${CYAN}` }} />
              <div data-speed="0.7" className="absolute bottom-[10%] right-[10%] w-80 h-80 rounded-full blur-3xl opacity-25" style={{ background: "#0369a1" }} />
            </div>
            <p className="hero-fade relative text-[11px] uppercase tracking-[0.4em] font-bold mb-6" style={{ color: TEAL }}>Transformative talent development</p>
            <h1 className="hero-h1 relative font-black leading-[0.98] tracking-tight max-w-6xl" style={{ fontSize: "clamp(2.6rem, 6vw, 5.4rem)" }}>
              The biomanufacturing career platform — train, get placed, get funded.
            </h1>
            <p className="hero-fade relative mt-7 text-base sm:text-xl text-white/65 max-w-2xl leading-relaxed">
              One path from your first course to your first offer — and the funding to build what&apos;s next.
            </p>
            <div className="hero-fade relative mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" className="rounded-full px-6 py-3 text-[15px] font-bold text-[#07101a]" style={{ background: TEAL }}>Enter the platform</Link>
              <a href="#pathways" className="rounded-full px-6 py-3 text-[15px] font-bold ring-1 ring-white/20 hover:bg-white/10 transition-colors">See career pathways</a>
            </div>
          </section>

          {/* ── PILLARS ── */}
          <section id="pillars" className="relative px-6 py-32 md:py-48 max-w-6xl mx-auto">
            <h2 className="reveal font-black tracking-tight max-w-4xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Three pillars, one trajectory.</h2>
            <p className="reveal mt-4 text-white/55 max-w-xl text-lg">Most platforms do one. BioHubNet carries you across all three.</p>
            <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-5">
              {PILLARS.map((p) => (
                <div key={p.tag} className="reveal group rounded-3xl p-7 ring-1 ring-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors" data-speed="1.04">
                  <p className="text-[11px] uppercase tracking-[0.3em] font-bold mb-5" style={{ color: p.color }}>{p.tag}</p>
                  <h3 className="text-2xl font-black mb-3">{p.title}</h3>
                  <p className="text-white/55 text-[14px] leading-relaxed mb-5">{p.body}</p>
                  <ul className="space-y-1.5">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-[13px] text-white/75">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />{pt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* ── CAREER PATHWAYS (DrawSVG) ── */}
          <section id="pathways" className="path-sec relative px-6 py-32 md:py-44 border-y border-white/10 overflow-hidden">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 items-center">
              <div>
                <h2 className="reveal font-black tracking-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Every route from junior to VP.</h2>
                <p className="reveal mt-5 text-white/60 text-lg leading-relaxed max-w-md">Pick a track and see the five stations ahead — plus the branch points where careers fork into adjacent streams, each ranked by likelihood with the skills to bridge the jump.</p>
              </div>
              <svg viewBox="0 0 420 240" className="w-full h-auto">
                <path id="path-spine" className="path-line" d="M20,200 C90,200 90,120 160,120 C230,120 230,60 300,60 L400,60" fill="none" stroke={TEAL} strokeWidth="3" strokeLinecap="round" />
                <path className="path-line" d="M160,120 C210,120 210,180 280,180 L360,180" fill="none" stroke={`${CYAN}99`} strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
                {[[20, 200], [160, 120], [300, 60], [400, 60], [280, 180], [360, 180]].map(([cx, cy], i) => (
                  <circle key={i} className="path-node" cx={cx} cy={cy} r={i < 4 ? 8 : 6} fill={i < 4 ? TEAL : "#07101a"} stroke={i < 4 ? "#07101a" : CYAN} strokeWidth="2.5" />
                ))}
                <rect className="path-rider" x="-5" y="-5" width="10" height="10" rx="2" fill="#fff" />
                {["Junior", "Associate", "Senior", "Lead / VP"].map((t, i) => (
                  <text key={t} x={[20, 160, 300, 400][i]} y={[222, 142, 42, 42][i]} fill="#ffffffaa" fontSize="11" textAnchor={i === 3 ? "end" : "middle"} fontFamily="inherit">{t}</text>
                ))}
              </svg>
            </div>
          </section>

          {/* ── FIT MATRIX ── */}
          <section className="fit-sec relative px-6 py-32 md:py-44 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12 items-center">
              <div>
                <h2 className="reveal font-black tracking-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Know your fit before you apply.</h2>
                <p className="reveal mt-5 text-white/60 text-lg leading-relaxed max-w-md">The fit-rating matrix reads your resume against a role&apos;s requirements one by one — Strong, Partial, or Gap — with the evidence it found and the fastest way to close each gap.</p>
                <div className="reveal mt-7 flex items-end gap-3">
                  <span className="fit-score font-black tabular-nums leading-none" style={{ fontSize: "clamp(3rem,7vw,5rem)", color: TEAL }}>0</span>
                  <span className="text-white/40 text-sm mb-2 uppercase tracking-[0.2em] font-bold">/ 100 overall fit</span>
                </div>
              </div>
              <div className="rounded-3xl p-6 ring-1 ring-white/10 bg-white/[0.03] space-y-4">
                {FIT_ROWS.map((r) => (
                  <div key={r.req}>
                    <div className="flex items-center justify-between text-[13px] mb-1.5">
                      <span className="text-white/80">{r.req}</span>
                      <span className="uppercase text-[10px] font-black tracking-wider" style={{ color: RATING_COLOR[r.rating] }}>{r.rating}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="fit-bar h-full rounded-full" style={{ width: `${r.pct}%`, background: RATING_COLOR[r.rating] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── STATS ── */}
          <section className="relative px-6 py-24 border-y border-white/10">
            <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {STATS.map((s, i) => (
                <div key={s.label}>
                  <p className={`stat-${i} font-black tabular-nums leading-none`} style={{ fontSize: "clamp(2.4rem,5vw,4rem)", color: i % 2 ? CYAN : TEAL }}>{s.prefix ?? ""}0{s.suffix ?? ""}</p>
                  <p className="mt-3 text-white/50 text-[13px]">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── TALENT REPORTS ── */}
          <section className="kpi-sec relative px-6 py-32 md:py-44 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
              <div className="flex items-end gap-3 h-56">
                {[40, 62, 55, 78, 70, 92].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end">
                    <div className="kpi-bar rounded-t-md" style={{ height: `${h}%`, background: `linear-gradient(to top, ${TEAL}, ${CYAN})` }} />
                  </div>
                ))}
              </div>
              <div>
                <h2 className="reveal font-black tracking-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Board-ready, for employers.</h2>
                <p className="reveal mt-5 text-white/60 text-lg leading-relaxed max-w-md">Nine talent reports — funnel, time-to-fill, offers, cost-per-hire, source effectiveness and an opt-in DEI view — with OKR targets, RAG status, period filters, and one-click PDF or CSV export.</p>
              </div>
            </div>
          </section>

          {/* ── FEATURE RAIL (horizontal pin) ── */}
          <section className="rail-sec relative h-screen overflow-hidden">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center px-6 z-10">
              <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)" }}>Everything in the toolkit.</h2>
            </div>
            <div className="rail-track flex h-full items-center gap-6 px-[6vw]" style={{ width: "max-content" }}>
              {RAIL.map(([t, d], i) => (
                <div key={t} className="w-[78vw] sm:w-[42vw] lg:w-[30vw] rounded-3xl p-8 ring-1 ring-white/10 bg-white/[0.04]">
                  <span className="text-[12px] font-black" style={{ color: i % 2 ? CYAN : TEAL }}>{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-3xl font-black mt-3">{t}</h3>
                  <p className="text-white/55 mt-3 leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA / FOOTER ── */}
          <section id="equip" className="relative px-6 py-40 md:py-56 text-center overflow-hidden">
            <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 50%, ${"#0d9488"}33, transparent 70%)` }} />
            <h2 className="reveal relative font-black tracking-tight max-w-4xl mx-auto" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}>Start your pathway today.</h2>
            <p className="reveal relative mt-5 text-white/60 text-lg max-w-xl mx-auto">Train for the bench, get in front of employers, and fund the leap — all in one place.</p>
            <div className="reveal relative mt-10">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg font-black text-[#07101a]" style={{ background: TEAL }}>
                Enter BioHubNet <span className="cta-arrow inline-block">&rarr;</span>
              </Link>
            </div>
          </section>

          <footer className="relative px-6 pb-16 text-center text-white/35 text-[11px] leading-relaxed">
            <p>Motion engineered with GSAP — ScrollSmoother · SplitText · ScrollTrigger (pin / scrub / batch) · DrawSVG · MotionPath · CustomWiggle · quickTo · registerEffect · matchMedia.</p>
            <p className="mt-2">Respects prefers-reduced-motion · cleans up via useGSAP.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
