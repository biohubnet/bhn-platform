"use client";
/**
 * GsapShowcase — an agency-grade, GSAP-powered product-launch page for the
 * BioHubNet platform, told as a TWO-SIDED marketplace: trained talent on one
 * side, hiring teams (HR / recruiting) on the other. Every section is a REAL
 * platform capability:
 *
 *   Talent   — ENGAGE/EXPERIENCE/EQUIP pillars, career pathways, AI toolkit
 *              (tutor, master resume, tailoring, cover letters, fit matrix,
 *              interview prep, AutoPipette), VentureConnect / VentureLift.
 *   Employer — HR command center (KPI tiles with OKR targets + RAG), the
 *              hiring funnel, the candidate pipeline, the post→hire loop,
 *              the 10 Talent Reports, time-to-fill & cost-per-hire trends,
 *              structured scorecards / quality-of-hire.
 *
 * Choreographed with the official GSAP skills' React patterns:
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
const BLUE = "#38bdf8";
const VIOLET = "#a78bfa";
const RAG: Record<string, string> = { on: "#34d399", at: "#fbbf24", off: "#fb7185" };

// ── Brand pillars ──────────────────────────────────────────────────────────
const PILLARS = [
  { tag: "Engage", color: CYAN, title: "Learn the bench.", body: "Eight biomanufacturing career tracks mapped Junior to VP, platform courses tuned to each rung, and an AI tutor that meets you where you are.", points: ["Career pathways", "Course catalog", "AI tutor"] },
  { tag: "Experience", color: TEAL, title: "Land the role.", body: "Live internships from industry partners, a talent pool employers actually browse, and AI that tailors your resume and rates your fit, role by role.", points: ["Internship board", "AI resume + tailoring", "Fit-rating matrix"] },
  { tag: "Equip", color: VIOLET, title: "Fund the leap.", body: "Turn a project into a venture. VentureConnect backs events and conferences up to $5K; VentureLift backs commercialization up to $25K.", points: ["VentureConnect · ≤ $5K", "VentureLift · ≤ $25K", "Guided wizard"] },
];

// ── Marquee role titles (the pathways are real) ──────────────────────────────
const ROLES = ["Process Development Scientist", "QA / QC Specialist", "Bioprocess Engineer", "MSAT Lead", "Upstream Associate", "Downstream Scientist", "Regulatory Affairs", "Manufacturing Technician", "Cell Therapy Analyst", "Validation Engineer", "Quality Systems Manager", "Director of Manufacturing"];

// ── Two-sided framing ────────────────────────────────────────────────────────
const TALENT_FEATURES = ["Career pathways, Junior to VP", "Courses + AI tutor", "Master resume + AI tailoring", "Fit-rating matrix", "Internship board", "Interview prep", "AutoPipette nudges", "Venture funding to $25K"];
const EMPLOYER_FEATURES = ["Talent-pool search", "Requisitions + scorecards", "AI fit screening", "Interview self-scheduling", "Offer management", "Automated candidate comms", "Team roles + attribution", "10 board-ready reports"];

// ── Talent AI toolkit (bento) ────────────────────────────────────────────────
const AI_TILES = [
  { t: "AI tutor", d: "Course-grounded answers on every lesson — ask anything, cited to the material.", span: "col-span-2 row-span-2", color: CYAN, big: true },
  { t: "Resume tailoring", d: "Reshape your master resume to any role in seconds.", span: "col-span-2", color: TEAL, big: false },
  { t: "Master resume", d: "One library of bullets behind every draft.", span: "", color: BLUE, big: false },
  { t: "Cover letters", d: "Drafted from your evidence, in your voice.", span: "", color: VIOLET, big: false },
  { t: "Fit-rating matrix", d: "Strong / Partial / Gap, requirement by requirement.", span: "col-span-2", color: TEAL, big: false },
  { t: "Interview prep", d: "Likely questions + STAR answers, pulled from your resume.", span: "", color: CYAN, big: false },
  { t: "AutoPipette", d: "Spots when you stall and suggests the next move.", span: "", color: VIOLET, big: false },
];

// ── HR command center — KPI tiles with OKR targets + RAG ─────────────────────
const KPI_TILES = [
  { k: "Time-to-fill", to: 28, prefix: "", unit: "d", decimals: 0, rag: "on", target: "target ≤ 30d", spark: [41, 39, 36, 34, 31, 28] },
  { k: "Offer acceptance", to: 86, prefix: "", unit: "%", decimals: 0, rag: "on", target: "target ≥ 80%", spark: [71, 75, 79, 82, 84, 86] },
  { k: "Cost-per-hire", to: 4.6, prefix: "$", unit: "k", decimals: 1, rag: "on", target: "target ≤ $5k", spark: [6.2, 5.8, 5.4, 5.0, 4.8, 4.6] },
  { k: "Apply → hire", to: 3.4, prefix: "", unit: "%", decimals: 1, rag: "on", target: "target ≥ 3%", spark: [2.1, 2.5, 2.8, 3.0, 3.2, 3.4] },
  { k: "Quality-of-hire", to: 4.3, prefix: "", unit: "/5", decimals: 1, rag: "on", target: "target ≥ 4.0", spark: [3.6, 3.8, 3.9, 4.1, 4.2, 4.3] },
  { k: "Pipeline velocity", to: 12, prefix: "", unit: "d", decimals: 0, rag: "at", target: "target ≤ 10d", spark: [17, 16, 15, 14, 13, 12] },
];

// ── Hiring funnel ─────────────────────────────────────────────────────────────
const FUNNEL = [
  { stage: "Applications", n: 1280, pct: 100 },
  { stage: "Screened", n: 512, pct: 40 },
  { stage: "Interviewed", n: 196, pct: 15 },
  { stage: "Offered", n: 64, pct: 5 },
  { stage: "Hired", n: 44, pct: 3.4 },
];

// ── Candidate pipeline (Kanban) ──────────────────────────────────────────────
const PIPELINE = [
  { stage: "Applied", color: CYAN, total: 312, cards: [["R. Okafor", "PD Scientist", 92], ["M. Lin", "QA Specialist", 78]] as [string, string, number][] },
  { stage: "Screening", color: BLUE, total: 128, cards: [["A. Patel", "Bioprocess Eng", 81], ["T. Nguyen", "Upstream Assoc", 64]] as [string, string, number][] },
  { stage: "Interview", color: TEAL, total: 46, cards: [["J. Reyes", "MSAT", 88], ["S. Cohen", "DSP Scientist", 79]] as [string, string, number][] },
  { stage: "Offer", color: VIOLET, total: 12, cards: [["D. Khan", "DSP Lead", 90]] as [string, string, number][] },
  { stage: "Hired", color: RAG.on, total: 8, cards: [["L. Tremblay", "QC Analyst", 85]] as [string, string, number][] },
];

// ── The post → hire loop (workflow) ──────────────────────────────────────────
const HIRING_LOOP = [
  { step: "Post a requisition", body: "Spin up a role with scorecards, a hiring team, and an SLA in minutes." },
  { step: "Source the talent pool", body: "Search trained, fit-rated candidates by skill, track, and station." },
  { step: "Screen with AI fit", body: "Every applicant scored Strong / Partial / Gap against the requirements." },
  { step: "Interview with rubrics", body: "Structured scorecards, candidate self-scheduling, panel load balanced." },
  { step: "Offer + close", body: "Send, track acceptance, and auto-fire candidate comms on every move." },
  { step: "Report to leadership", body: "Board-ready KPIs and OKR RAG status — Print-to-PDF or export CSV." },
];

// ── The 10 Talent Reports ─────────────────────────────────────────────────────
const REPORTS = [
  { n: "Executive Summary", d: "OKR + RAG tiles, sparklines", feat: true },
  { n: "Funnel & Conversion", d: "Snapshot + true-cohort", feat: false },
  { n: "Time-to-Fill", d: "Median, p25/p75, SLA gaps", feat: false },
  { n: "Offer Analytics", d: "Acceptance %, decline reasons", feat: false },
  { n: "Requisition Aging", d: "Open / stale-req flags", feat: false },
  { n: "Team Productivity", d: "Activity, interviews-to-hire", feat: false },
  { n: "Quality-of-Hire", d: "Hires vs rejected scores", feat: false },
  { n: "Source Effectiveness", d: "Source → hire, cost / source", feat: false },
  { n: "Cost-per-Hire", d: "Spend / hires, by cost type", feat: false },
  { n: "DEI Pipeline", d: "Opt-in · k-anonymity", feat: false },
];

// ── Trend data ────────────────────────────────────────────────────────────────
const TTF_TREND = [41, 39, 38, 36, 35, 33, 32, 31, 30, 29, 28, 28];
const CPH_TREND = [6.2, 6.0, 5.8, 5.6, 5.3, 5.1, 5.0, 4.9, 4.8, 4.7, 4.6, 4.6];
const CPH_MAX = Math.max(...CPH_TREND);
const CPH_MIN = Math.min(...CPH_TREND);
const cphHeight = (v: number) => 38 + ((v - CPH_MIN) / (CPH_MAX - CPH_MIN || 1)) * 62;

// ── Structured scorecard / quality-of-hire ───────────────────────────────────
const SCORE_CRITERIA = [
  { k: "Technical depth", v: 4.6 },
  { k: "GMP rigor", v: 4.8 },
  { k: "Communication", v: 4.1 },
  { k: "Culture add", v: 4.3 },
];

// ── Voices ────────────────────────────────────────────────────────────────────
const VOICES = [
  { q: "I went from a community-college cert to a process-development offer in one cycle.", who: "Trainee · Upstream track", color: CYAN },
  { q: "We cut time-to-fill from 41 to 28 days and finally have numbers the board trusts.", who: "Head of Talent · cell-therapy CDMO", color: TEAL },
  { q: "The fit matrix told me the exact two skills to close before I applied.", who: "Trainee · QA track", color: BLUE },
  { q: "Source effectiveness paid for itself — we killed two channels that never converted.", who: "Recruiting Lead · biologics", color: VIOLET },
];

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { to: 8, prefix: "", suffix: "", label: "Career tracks, Junior to VP" },
  { to: 28, prefix: "", suffix: "d", label: "Median time-to-fill" },
  { to: 10, prefix: "", suffix: "", label: "Board-ready talent reports" },
  { to: 25, prefix: "$", suffix: "K", label: "Funding per venture" },
];

// ── Feature rail (horizontal pin) ────────────────────────────────────────────
const RAIL = [
  { t: "AI tutor", d: "Ask anything about a course; grounded in the material.", side: "Talent" },
  { t: "Fit-rating matrix", d: "Strong / Partial / Gap against every requirement.", side: "Talent" },
  { t: "Master resume", d: "One library of bullets; pull into any tailored draft.", side: "Talent" },
  { t: "Interview prep", d: "Likely questions + STAR answers from your resume.", side: "Talent" },
  { t: "AutoPipette", d: "Notices when you're stuck and suggests the next step.", side: "Talent" },
  { t: "Talent-pool search", d: "Browse trained, fit-rated candidates by skill + track.", side: "Employer" },
  { t: "Scorecards + rubrics", d: "Structured interviews with panel load balanced.", side: "Employer" },
  { t: "Talent Reports", d: "Board-ready KPIs, OKRs with RAG, opt-in DEI.", side: "Employer" },
];

const FIT_ROWS = [
  { req: "Mammalian cell culture", rating: "strong", pct: 96 },
  { req: "GMP documentation", rating: "strong", pct: 88 },
  { req: "Aseptic technique · BSL-2", rating: "partial", pct: 58 },
  { req: "Bioreactor scale-up", rating: "partial", pct: 49 },
  { req: "Regulatory (ICH Q2)", rating: "gap", pct: 18 },
];
const RATING_COLOR: Record<string, string> = { strong: "#34d399", partial: "#fbbf24", gap: "#fb7185" };

// Build a polyline `d` from values, normalized into a w×h box.
function sparkPath(vals: number[], w = 132, h = 40, pad = 4) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (vals.length - 1);
  return vals
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (h - pad * 2) * (1 - (v - min) / span);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
const fitChip = (s: number) => (s >= 85 ? RATING_COLOR.strong : s >= 60 ? RATING_COLOR.partial : RATING_COLOR.gap);

// ── Course catalog ───────────────────────────────────────────────────────────
const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;
const COURSES = [
  { t: "Upstream Processing", mods: 8, level: "Core", pct: 100, color: CYAN },
  { t: "Downstream & Purification", mods: 7, level: "Core", pct: 72, color: TEAL },
  { t: "Cell Culture & Bioreactors", mods: 9, level: "Core", pct: 45, color: BLUE },
  { t: "GMP & Quality Systems", mods: 6, level: "Foundations", pct: 88, color: VIOLET },
  { t: "Aseptic Technique · BSL-2", mods: 5, level: "Lab skills", pct: 30, color: CYAN },
  { t: "Analytical Methods · ICH Q2", mods: 6, level: "Advanced", pct: 12, color: TEAL },
];

// ── Eight tracks ─────────────────────────────────────────────────────────────
const TRACKS = ["Process Development", "Upstream", "Downstream / DSP", "MSAT / Tech Transfer", "QA / Quality Systems", "QC / Analytical", "Regulatory Affairs", "Manufacturing Ops"];

// ── Resume tools workflow ────────────────────────────────────────────────────
const RESUME_FLOW = [
  { t: "Master resume", d: "Bank every bullet once — projects, methods, outcomes.", color: BLUE },
  { t: "Tailor to a role", d: "AI reshapes it to a specific posting in seconds.", color: TEAL },
  { t: "Fit-rating matrix", d: "Strong / Partial / Gap against the requirements.", color: CYAN },
  { t: "Cover letter", d: "Drafted from your real evidence, in your voice.", color: VIOLET },
  { t: "Interview prep", d: "Likely questions + STAR answers from your resume.", color: TEAL },
];

// ── Job board ────────────────────────────────────────────────────────────────
const JOBS = [
  { role: "Process Development Intern", org: "Cell-therapy CDMO", loc: "Toronto · Hybrid", stipend: "$24 / hr", tags: ["Upstream", "GMP"], fit: 91 },
  { role: "QC Analyst (Co-op)", org: "Biologics manufacturer", loc: "Mississauga · On-site", stipend: "$22 / hr", tags: ["Analytical", "ICH Q2"], fit: 78 },
  { role: "MSAT Associate", org: "Vaccine producer", loc: "Montréal · On-site", stipend: "$26 / hr", tags: ["Tech transfer"], fit: 84 },
  { role: "Downstream Intern", org: "Gene-therapy startup", loc: "Remote-first", stipend: "$23 / hr", tags: ["DSP", "Purification"], fit: 66 },
];

// ── Knowledge Exchange ───────────────────────────────────────────────────────
const EXCHANGE: [string, string][] = [
  ["Peer cohorts", "Learn alongside others on the same track."],
  ["Mentor office hours", "Book time with people one rung ahead."],
  ["Ask the bench", "Crowd-sourced answers to real lab problems."],
  ["Shared protocols", "A living library of vetted SOPs and methods."],
];
const KX_NODES: [number, number, number][] = [[180, 160, 18], [70, 70, 11], [290, 80, 12], [60, 230, 12], [305, 235, 11], [180, 48, 10], [180, 285, 12]];
const KX_LINKS = ["M180,160 L70,70", "M180,160 L290,80", "M180,160 L60,230", "M180,160 L305,235", "M180,160 L180,48", "M180,160 L180,285", "M70,70 L180,48", "M290,80 L305,235"];

// ── International exchange (coming) ───────────────────────────────────────────
const INTL = ["Toronto ⇄ Boston", "Vancouver ⇄ Basel", "Montréal ⇄ Singapore", "Toronto ⇄ Cambridge UK"];

// ── Funding ladder ───────────────────────────────────────────────────────────
const FUNDING = [
  { t: "VentureConnect", cap: 5, w: 20, color: CYAN, blurb: "Backs the events, conferences, and community moments that put your work in front of the right people.", items: ["Conference travel + registration", "Host a community event", "Networking + outreach"] },
  { t: "VentureLift", cap: 25, w: 100, color: VIOLET, blurb: "Backs commercialization — prototypes, pilots, and the first real steps toward a product.", items: ["Prototype + materials", "Pilot runs + validation", "Go-to-market groundwork"] },
];
const FUND_STEPS = ["Open the guided wizard", "Scope + budget your ask", "Reviewed by the BHN team", "Funded — build the leap"];

// ── Employer benefits ────────────────────────────────────────────────────────
const EMPLOYER_BENEFITS = [
  { metric: "Pre-trained", title: "Bench-ready candidates", body: "Applicants arrive trained on upstream, downstream, GMP and aseptic technique — not just a resume.", color: CYAN },
  { metric: "−32%", title: "Faster time-to-fill", body: "Fit-scored applicants and a pipeline your whole team works cut weeks off every req.", color: TEAL },
  { metric: "−26%", title: "Lower cost-per-hire", body: "Source from a vetted talent pool instead of paying agency fees, posting by posting.", color: BLUE },
  { metric: "10 reports", title: "Board-ready proof", body: "Time-to-fill, offers, source, cost, quality and opt-in DEI — with OKR targets and RAG status.", color: VIOLET },
  { metric: "1 system", title: "Your whole team, aligned", body: "Role-based access, attribution on every move, and candidate email that fires itself.", color: CYAN },
  { metric: "Scored", title: "Quality you can measure", body: "Structured interview scorecards roll into a quality-of-hire metric you can defend.", color: TEAL },
];

// ── Past funded ventures ─────────────────────────────────────────────────────
const VC_PAST = [
  { name: "Booth at BIO 2025", who: "A. Patel · Upstream", amt: "$4.2K", outcome: "3 pilot partners", note: "Showcased a low-cost perfusion rig to the exhibition floor." },
  { name: "Cell & Gene meetup", who: "QA cohort · Toronto", amt: "$3.5K", outcome: "120 attendees", note: "Hosted a regional community night; two hires followed." },
  { name: "Poster at ISPE", who: "J. Reyes · MSAT", amt: "$1.8K", outcome: "Best-poster award", note: "Earned an invited talk and two new collaborations." },
];
const VL_PAST = [
  { name: "Inline single-use sensor", who: "D. Khan · DSP", amt: "$24K", outcome: "Patent filed", note: "Built and validated a reusable inline process sensor." },
  { name: "Microbioreactor pilot", who: "S. Cohen · Upstream", amt: "$18K", outcome: "Licensing talks", note: "Ran a 12-condition pilot to de-risk scale-up." },
  { name: "Aseptic VR trainer", who: "L. Tremblay · QC", amt: "$22K", outcome: "4 sites piloting", note: "Shipped a VR module for BSL-2 technique drills." },
];

// ── 3D image carousel (pure-CSS ring; geometry per the create-3d-image-slider skill) ──
const SCENES = ["Upstream", "Cell culture", "Bioreactors", "Downstream", "Purification", "Aseptic · BSL-2", "QA / QC", "Analytical", "Regulatory", "Fill & finish"];

// Scoped, brand-styled carousel CSS. The whole ring spins on its parent via a CSS
// keyframe; each card's Y-angle is computed in JSX and pushed out along Z by the
// inherited --radius (responsive). Hover pauses; reduced-motion stops the spin.
const CAROUSEL_CSS = `
/* This standalone launch page owns its typography. The platform theme system
   styles every h1,h2,h3 from CSS vars (font-family / weight / tracking / transform)
   and that base rule is UNLAYERED, so it beats Tailwind's font-black & tracking-tight
   utilities. With a theme like Hi-tech/TRON active, headings became JetBrains Mono
   UPPERCASE at weight 500 with very wide tracking. Re-set those vars on the page root
   so headings render as designed: Outfit, font-black (900), tight tracking, no caps. */
.bhn-showcase {
  --font-display-theme: inherit;
  --heading-weight: 900;
  --heading-tracking: -0.02em;
  --heading-transform: none;
}
.bhn3d-banner { position: absolute; inset: 0; }
.bhn3d-slider {
  --radius: 560px;
  position: absolute; top: 50%; left: 50%;
  width: 220px; height: 300px; margin: -150px 0 0 -110px;
  transform-style: preserve-3d;
  animation: bhn3dSpin 32s linear infinite;
}
@keyframes bhn3dSpin {
  from { transform: perspective(1200px) rotateX(-11deg) rotateY(0deg); }
  to   { transform: perspective(1200px) rotateX(-11deg) rotateY(360deg); }
}
.bhn3d-item { position: absolute; inset: 0; }
.bhn3d-card {
  position: absolute; inset: 0; overflow: hidden; border-radius: 14px;
  background-size: cover; background-position: center; background-color: #0b1623;
  box-shadow: 0 24px 60px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.14);
  filter: saturate(.92);
}
.bhn3d-card::after {
  content: ""; position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(7,16,26,.05) 38%, rgba(7,16,26,.85) 100%),
    linear-gradient(150deg, rgba(34,211,238,.18), rgba(13,148,136,.12) 55%, transparent);
}
.bhn3d-label {
  position: absolute; left: 16px; bottom: 14px; z-index: 2;
  font-size: 14px; font-weight: 800; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,.65);
}
.bhn3d-num {
  position: absolute; top: 12px; right: 14px; z-index: 2;
  font-size: 11px; font-weight: 800; letter-spacing: .14em; color: rgba(255,255,255,.72);
}
.bhn3d-banner:hover .bhn3d-slider { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .bhn3d-slider { animation: none; transform: perspective(1200px) rotateX(-11deg); }
}
@media (max-width: 1023px) {
  .bhn3d-slider { --radius: 400px; width: 180px; height: 240px; margin: -120px 0 0 -90px; }
}
@media (max-width: 639px) {
  .bhn3d-slider { --radius: 280px; width: 150px; height: 200px; margin: -100px 0 0 -75px; }
}
`;

export function GsapShowcase() {
  const root = useRef<HTMLDivElement>(null);

  // The app's <body> carries the platform's light theme background. This page
  // is dark, and ScrollSmoother makes the wrapper position:fixed (so a bg on
  // our own divs can be bypassed at the edges). Paint the body dark while this
  // page is mounted; restore on unmount.
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#07101a";
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  useGSAP(
    () => {
      const q = <T extends Element = HTMLElement>(s: string) => root.current?.querySelector<T>(s) ?? null;
      const cleanups: Array<() => void> = [];
      const splits: SplitText[] = [];
      const safe = (fn: () => void) => { try { fn(); } catch (e) { console.warn("[launch]", e); } };

      // Progress bar (works with or without smoother).
      safe(() => gsap.to(".gs-progress", { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.body, start: 0, end: "max", scrub: 0.3 } }));

      const counter = (el: HTMLElement | null, to: number, opts: { prefix?: string; suffix?: string; decimals?: number } = {}) => {
        if (!el) return;
        const { prefix = "", suffix = "", decimals = 0 } = opts;
        const o = { v: 0 };
        gsap.to(o, {
          v: to, duration: 1.6, ease: "power2.out",
          ...(decimals ? {} : { snap: { v: 1 } }),
          scrollTrigger: { trigger: el, start: "top 88%" },
          onUpdate: () => { el.textContent = `${prefix}${o.v.toFixed(decimals)}${suffix}`; },
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
        // time fallback font). Built after fonts are ready so the split measures
        // correctly, and driven by an in-view ScrollTrigger so it always plays.
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

        // Marquee — seamless infinite loop (content is duplicated, so -50% wraps).
        safe(() => gsap.to(".marquee-track", { xPercent: -50, duration: 30, ease: "none", repeat: -1 }));

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
          counter(q(".fit-score"), 64);
        });

        // Course progress rings — each arc animates to its pct on enter.
        safe(() => {
          gsap.utils.toArray<SVGCircleElement>(".course-ring").forEach((ring) => {
            const pct = Number(ring.dataset.pct ?? 0);
            const c = Number(ring.dataset.c ?? RING_C);
            gsap.fromTo(ring, { strokeDashoffset: c }, { strokeDashoffset: c * (1 - pct / 100), duration: 1.3, ease: "power2.out", scrollTrigger: { trigger: ring, start: "top 90%" } });
          });
        });

        // Resume-tools workflow — the connecting line draws in.
        safe(() => gsap.from(".resume-line", { drawSVG: "0%", duration: 1.1, ease: "power2.out", scrollTrigger: { trigger: ".resume-sec", start: "top 75%" } }));

        // Job board — cards cascade via batch.
        safe(() => ScrollTrigger.batch(".job-card", { start: "top 92%", onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, ease: "power3.out", overwrite: true }) }));

        // Knowledge Exchange — links draw + nodes pop.
        safe(() => {
          gsap.from(".kx-link", { drawSVG: "0%", duration: 0.9, ease: "power2.out", scrollTrigger: { trigger: ".kx-sec", start: "top 80%" } });
          gsap.from(".kx-node", { scale: 0, transformOrigin: "center", stagger: 0.1, ease: "back.out(2)", scrollTrigger: { trigger: ".kx-sec", start: "top 80%" } });
        });

        // International exchange — arc draws + a dot travels it on a loop.
        safe(() => {
          gsap.from(".intl-arc", { drawSVG: "0%", duration: 1.4, ease: "power2.out", scrollTrigger: { trigger: ".intl-sec", start: "top 80%" } });
          gsap.to(".intl-rider", { motionPath: { path: "#intl-arc", align: "#intl-arc", alignOrigin: [0.5, 0.5] }, duration: 4.5, ease: "power1.inOut", repeat: -1, yoyo: true });
        });

        // Funding — comparison bars grow.
        safe(() => gsap.from(".fund-bar", { scaleX: 0, transformOrigin: "left center", stagger: 0.15, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".fund-sec", start: "top 82%" } }));

        // Past ventures — cards cascade via batch.
        safe(() => ScrollTrigger.batch(".venture-card", { start: "top 92%", onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, stagger: 0.07, duration: 0.55, ease: "power3.out", overwrite: true }) }));

        // HR command center — KPI counters + sparkline draw, staggered on enter.
        KPI_TILES.forEach((t, i) => safe(() => counter(q(`.kpi-val-${i}`), t.to, { prefix: t.prefix, suffix: t.unit, decimals: t.decimals })));
        safe(() => gsap.from(".kpi-spark", { drawSVG: "0%", duration: 1.1, ease: "power2.out", stagger: 0.1, scrollTrigger: { trigger: ".kpi-sec", start: "top 78%" } }));

        // Funnel — bars sweep from center + counts.
        safe(() => gsap.from(".funnel-bar", { scaleX: 0, transformOrigin: "center", stagger: 0.12, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".funnel-sec", start: "top 78%" } }));
        FUNNEL.forEach((f, i) => safe(() => counter(q(`.funnel-n-${i}`), f.n)));

        // Pipeline — candidate cards cascade in via batch.
        safe(() => ScrollTrigger.batch(".pipe-card", {
          start: "top 90%",
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, ease: "power3.out", overwrite: true }),
        }));

        // Hiring loop — vertical spine draws + dots pop as the section scrolls.
        safe(() => {
          gsap.from(".loop-spine", { drawSVG: "0%", ease: "none", scrollTrigger: { trigger: ".loop-sec", start: "top 70%", end: "bottom 75%", scrub: 1 } });
          gsap.from(".loop-dot", { scale: 0, transformOrigin: "center", stagger: 0.5, ease: "back.out(2)", scrollTrigger: { trigger: ".loop-sec", start: "top 70%", end: "bottom 80%", scrub: 1 } });
        });

        // Reports — bento tiles cascade via batch.
        safe(() => ScrollTrigger.batch(".report-tile", {
          start: "top 92%",
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, scale: 1, stagger: 0.06, duration: 0.55, ease: "power3.out", overwrite: true }),
        }));

        // Trends — time-to-fill line draws (scrubbed); cost bars grow on enter.
        safe(() => gsap.from(".trend-line", { drawSVG: "0%", ease: "none", scrollTrigger: { trigger: ".trend-sec", start: "top 78%", end: "bottom 80%", scrub: 1 } }));
        safe(() => gsap.from(".cost-bar", { scaleY: 0, transformOrigin: "bottom", stagger: 0.05, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".trend-sec", start: "top 72%" } }));

        // Scorecard — criterion bars grow on enter.
        safe(() => gsap.from(".score-bar", { scaleX: 0, transformOrigin: "left center", stagger: 0.12, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".score-sec", start: "top 80%" } }));

        // Stats counters.
        STATS.forEach((s, i) => safe(() => counter(q(`.stat-${i}`), s.to, { prefix: s.prefix, suffix: s.suffix })));

        // Feature rail — pinned, scrolls horizontally (ease: none).
        safe(() => {
          const track = q(".rail-track");
          if (track) {
            gsap.to(track, {
              xPercent: -100 * ((track.children.length - 1) / track.children.length),
              ease: "none",
              scrollTrigger: { trigger: ".rail-sec", start: "top top", end: "+=3000", scrub: 1, pin: true },
            });
          }
        });

        // CTA — CustomWiggle on the arrow, looping subtly.
        safe(() => {
          CustomWiggle.create("ctaWiggle", { wiggles: 6, type: "easeOut" });
          gsap.to(".cta-arrow", { x: 8, duration: 1.4, ease: "ctaWiggle", repeat: -1, repeatDelay: 1.6 });
        });

        // Re-measure trigger positions once the web font has loaded.
        safe(() => { document.fonts?.ready?.then(() => ScrollTrigger.refresh()); });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        // Everything visible + static.
        safe(() => gsap.set([".hero-fade", ".reveal", ".fit-bar", ".funnel-bar", ".cost-bar", ".score-bar", ".fund-bar"], { clearProps: "all" }));
        safe(() => gsap.set([".pipe-card", ".report-tile", ".job-card", ".venture-card"], { opacity: 1, y: 0, scale: 1 }));
        safe(() => gsap.set([".path-line", ".kpi-spark", ".trend-line", ".loop-spine", ".resume-line", ".kx-link", ".intl-arc"], { drawSVG: "100%" }));
        safe(() => gsap.set([".loop-dot", ".kx-node"], { scale: 1 }));
        STATS.forEach((s, i) => safe(() => { const el = q(`.stat-${i}`); if (el) el.textContent = `${s.prefix}${s.to}${s.suffix}`; }));
        KPI_TILES.forEach((t, i) => safe(() => { const el = q(`.kpi-val-${i}`); if (el) el.textContent = `${t.prefix}${t.to.toFixed(t.decimals)}${t.unit}`; }));
        FUNNEL.forEach((f, i) => safe(() => { const el = q(`.funnel-n-${i}`); if (el) el.textContent = `${f.n}`; }));
        safe(() => { const el = q(".fit-score"); if (el) el.textContent = "64"; });
      });

      return () => { splits.forEach((s) => s.revert()); cleanups.forEach((fn) => fn()); };
    },
    { scope: root },
  );

  return (
    <div ref={root} className={`${outfit.className} bhn-showcase bg-[#07101a] text-white overflow-x-hidden`}>
      <style dangerouslySetInnerHTML={{ __html: CAROUSEL_CSS }} />
      {/* ── Fixed chrome (outside #smooth-content) ── */}
      <div id="cursor-glow" aria-hidden className="pointer-events-none fixed top-0 left-0 z-[5] w-[42rem] h-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0" style={{ background: `radial-gradient(circle, ${CYAN}22 0%, transparent 60%)` }} />
      <div className="gs-progress fixed top-0 left-0 right-0 h-[3px] origin-left z-50" style={{ transform: "scaleX(0)", background: `linear-gradient(90deg, ${CYAN}, ${TEAL})` }} aria-hidden />
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-5 rounded-full px-5 py-2.5 ring-1 ring-white/10 bg-white/[0.06] backdrop-blur-md">
        <span className="font-black tracking-tight text-[15px]">BioHubNet</span>
        <div className="hidden md:flex items-center gap-3.5 text-[12px] text-white/60 font-medium">
          <a href="#courses" className="hover:text-white transition-colors">Courses</a>
          <a href="#pathways" className="hover:text-white transition-colors">Pathways</a>
          <a href="#resume" className="hover:text-white transition-colors">Resume</a>
          <a href="#jobs" className="hover:text-white transition-colors">Jobs</a>
          <a href="#employers" className="hover:text-white transition-colors">Employers</a>
          <a href="#equip" className="hover:text-white transition-colors">Funding</a>
        </div>
        <Link href="/dashboard" className="text-[12px] font-bold rounded-full px-3.5 py-1.5 text-[#07101a]" style={{ background: TEAL }}>Enter</Link>
      </nav>

      <div id="smooth-wrapper" className="bg-[#07101a]">
        <div id="smooth-content" className="bg-[#07101a]">
          {/* ── HERO ── */}
          <section className="hero-section relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
            <div aria-hidden className="absolute inset-0 overflow-hidden">
              <div data-speed="0.85" className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[120vw] h-[80vh] rounded-full blur-[120px] opacity-50" style={{ background: `radial-gradient(circle, #0d948855, transparent 60%)` }} />
              <div data-speed="1.1" className="absolute top-1/3 left-[8%] w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: CYAN }} />
              <div data-speed="0.7" className="absolute bottom-[10%] right-[10%] w-80 h-80 rounded-full blur-3xl opacity-25" style={{ background: "#0369a1" }} />
            </div>
            <p className="hero-fade relative text-[11px] uppercase tracking-[0.4em] font-bold mb-6" style={{ color: TEAL }}>Transformative talent development</p>
            <h1 className="hero-h1 relative font-black leading-[0.98] tracking-tight max-w-6xl" style={{ fontSize: "clamp(2.6rem, 6vw, 5.4rem)" }}>
              The biomanufacturing career platform — train, get placed, get funded.
            </h1>
            <p className="hero-fade relative mt-7 text-base sm:text-xl text-white/65 max-w-2xl leading-relaxed">
              One platform, two sides: trained talent finds the role, and hiring teams find the talent — measured end to end.
            </p>
            <div className="hero-fade relative mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" className="rounded-full px-6 py-3 text-[15px] font-bold text-[#07101a]" style={{ background: TEAL }}>Enter the platform</Link>
              <a href="#hiring" className="rounded-full px-6 py-3 text-[15px] font-bold ring-1 ring-white/20 hover:bg-white/10 transition-colors">See the hiring suite</a>
            </div>
          </section>

          {/* ── MARQUEE ── */}
          <div className="marquee-wrap relative overflow-hidden py-5 border-y border-white/10 bg-white/[0.02]">
            <div className="marquee-track flex w-max items-center will-change-transform">
              {[...ROLES, ...ROLES].map((r, i) => (
                <span key={i} className="flex items-center gap-7 px-7 text-[13px] font-bold uppercase tracking-[0.18em] text-white/45 whitespace-nowrap">
                  <span style={{ color: i % 2 ? CYAN : TEAL }}>◇</span>{r}
                </span>
              ))}
            </div>
          </div>

          {/* ── PILLARS ── */}
          <section id="pillars" className="relative px-6 py-32 md:py-44 max-w-6xl mx-auto">
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

          {/* ── TWO-SIDED SPLIT ── */}
          <section className="relative px-6 py-28 md:py-40 border-y border-white/10">
            <div className="max-w-6xl mx-auto">
              <h2 className="reveal font-black tracking-tight text-center mx-auto max-w-4xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Two products. One graph of talent.</h2>
              <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="reveal group relative overflow-hidden rounded-3xl p-9 ring-1 ring-white/10" style={{ background: `linear-gradient(155deg, ${CYAN}1a, transparent 55%)` }}>
                  <p className="text-[11px] uppercase tracking-[0.32em] font-bold" style={{ color: CYAN }}>For talent</p>
                  <h3 className="mt-3 text-3xl font-black">Train, then get seen.</h3>
                  <p className="mt-3 text-white/60 leading-relaxed max-w-md">From your first course to a tailored application — with AI in the loop the whole way.</p>
                  <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                    {TALENT_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[13px] text-white/80"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CYAN }} />{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="reveal group relative overflow-hidden rounded-3xl p-9 ring-1 ring-white/10" style={{ background: `linear-gradient(155deg, ${VIOLET}1a, transparent 55%)` }}>
                  <p className="text-[11px] uppercase tracking-[0.32em] font-bold" style={{ color: VIOLET }}>For employers · HR</p>
                  <h3 className="mt-3 text-3xl font-black">Hire faster, prove it.</h3>
                  <p className="mt-3 text-white/60 leading-relaxed max-w-md">A full applicant-tracking pipeline plus the reporting leadership actually asks for.</p>
                  <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                    {EMPLOYER_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[13px] text-white/80"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: VIOLET }} />{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ── 3D IMAGE CAROUSEL ── */}
          <section className="relative overflow-hidden" style={{ height: "88vh", minHeight: "600px" }}>
            <div className="absolute top-[7%] left-1/2 -translate-x-1/2 z-10 w-full px-6 text-center">
              <p className="reveal text-[11px] uppercase tracking-[0.32em] font-bold" style={{ color: CYAN }}>The world you&apos;ll work in</p>
              <h2 className="reveal mt-3 font-black tracking-tight mx-auto max-w-3xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Step inside biomanufacturing.</h2>
              <p className="reveal mt-3 text-white/50 max-w-xl mx-auto text-[15px]">Ten disciplines, one rotating look at the bench you&apos;re training for — hover to pause.</p>
            </div>
            <div className="bhn3d-banner">
              <div className="bhn3d-slider">
                {SCENES.map((s, i) => (
                  <div key={s} className="bhn3d-item" style={{ transform: `rotateY(${((i * 360) / SCENES.length).toFixed(3)}deg) translateZ(var(--radius))` }}>
                    <div className="bhn3d-card" style={{ backgroundImage: `url(https://picsum.photos/seed/bhnscene${i + 1}/440/600)` }}>
                      <span className="bhn3d-num">{String(i + 1).padStart(2, "0")}</span>
                      <span className="bhn3d-label">{s}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── COURSE CATALOG ── */}
          <section id="courses" className="relative px-6 py-32 md:py-44 max-w-6xl mx-auto">
            <p className="reveal text-[11px] uppercase tracking-[0.32em] font-bold" style={{ color: CYAN }}>Engage · Learn the bench</p>
            <h2 className="reveal mt-3 font-black tracking-tight max-w-4xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>A course catalog built for the cleanroom.</h2>
            <p className="reveal mt-4 text-white/55 max-w-2xl text-lg">Platform courses tuned to each rung of every track — modular, hands-on, and graded against the exact skills employers screen for.</p>
            <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {COURSES.map((c) => (
                <div key={c.t} className="reveal group rounded-2xl p-6 ring-1 ring-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors flex items-center gap-5">
                  <svg viewBox="0 0 64 64" className="w-16 h-16 shrink-0 -rotate-90">
                    <circle cx="32" cy="32" r={RING_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                    <circle className="course-ring" data-pct={c.pct} data-c={RING_C.toFixed(2)} cx="32" cy="32" r={RING_R} fill="none" stroke={c.color} strokeWidth="5" strokeLinecap="round" strokeDasharray={RING_C.toFixed(2)} strokeDashoffset={(RING_C * (1 - c.pct / 100)).toFixed(2)} />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: c.color }}>{c.level}</p>
                    <h3 className="font-black text-lg leading-tight mt-1">{c.t}</h3>
                    <p className="text-[12px] text-white/45 mt-1">{c.mods} modules · {c.pct}% complete</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CAREER PATHWAYS (DrawSVG) ── */}
          <section id="pathways" className="path-sec relative px-6 py-32 md:py-44 overflow-hidden">
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

          {/* ── EIGHT TRACKS ── */}
          <section className="relative px-6 pb-24 -mt-12 md:-mt-16 max-w-6xl mx-auto">
            <p className="reveal text-[12px] uppercase tracking-[0.24em] font-bold text-white/40">Eight tracks, mapped end to end</p>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {TRACKS.map((t, i) => (
                <div key={t} className="reveal rounded-xl px-4 py-3.5 ring-1 ring-white/10 bg-white/[0.03] flex items-center gap-3">
                  <span className="text-[11px] font-black tabular-nums" style={{ color: i % 2 ? CYAN : TEAL }}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[13px] font-semibold text-white/80">{t}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── RESUME TOOLS ── */}
          <section id="resume" className="resume-sec relative px-6 py-32 md:py-44 border-y border-white/10">
            <div className="max-w-6xl mx-auto">
              <p className="reveal text-[11px] uppercase tracking-[0.32em] font-bold" style={{ color: TEAL }}>Resume tools you&apos;ve never had</p>
              <h2 className="reveal mt-3 font-black tracking-tight max-w-4xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>One resume engine, five moves.</h2>
              <p className="reveal mt-4 text-white/55 max-w-2xl text-lg">Bank your evidence once, then let AI reshape it for any role — and tell you exactly where you stand before you hit apply.</p>
              <div className="relative mt-16">
                <svg className="absolute left-0 right-0 top-[18px] w-full h-1 hidden lg:block" viewBox="0 0 1000 4" preserveAspectRatio="none">
                  <path className="resume-line" d="M40,2 L960,2" fill="none" stroke={`${TEAL}66`} strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
                </svg>
                <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {RESUME_FLOW.map((s, i) => (
                    <div key={s.t} className="reveal">
                      <div className="w-9 h-9 rounded-full grid place-items-center font-black text-[13px] text-[#07101a] mb-4 ring-4 ring-[#07101a]" style={{ background: s.color }}>{i + 1}</div>
                      <h3 className="font-black text-lg">{s.t}</h3>
                      <p className="text-white/55 text-[13px] leading-relaxed mt-1.5">{s.d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="reveal mt-12 rounded-2xl p-6 ring-1 bg-white/[0.03] flex flex-col sm:flex-row sm:items-center gap-4" style={{ borderColor: `${VIOLET}55` }}>
                <span className="text-[10px] uppercase tracking-[0.24em] font-black px-2.5 py-1 rounded-full self-start" style={{ color: "#07101a", background: VIOLET }}>New</span>
                <p className="text-white/75 text-[15px] leading-relaxed"><span className="font-black text-white">AutoPipette</span> watches as you work — when you stall on a draft or an application, it quietly suggests the smartest next step.</p>
              </div>
            </div>
          </section>

          {/* ── FIT MATRIX ── */}
          <section className="fit-sec relative px-6 py-32 md:py-44 max-w-6xl mx-auto border-t border-white/10">
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

          {/* ── AI TOOLKIT (BENTO) ── */}
          <section className="relative px-6 py-28 md:py-40 max-w-6xl mx-auto">
            <h2 className="reveal font-black tracking-tight max-w-4xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>An AI co-pilot for the whole job hunt.</h2>
            <p className="reveal mt-4 text-white/55 max-w-xl text-lg">Seven tools, one thread — grounded in your courses, your resume, and the role in front of you.</p>
            <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 auto-rows-[150px] gap-3 grid-flow-dense">
              {AI_TILES.map((tile) => (
                <div key={tile.t} className={`reveal group relative overflow-hidden rounded-2xl p-5 ring-1 ring-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors ${tile.span}`}>
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-40 transition-opacity group-hover:opacity-70" style={{ background: tile.color }} />
                  <p className="relative text-[10px] uppercase tracking-[0.28em] font-bold" style={{ color: tile.color }}>AI</p>
                  <h3 className={`relative font-black mt-1.5 ${tile.big ? "text-2xl" : "text-lg"}`}>{tile.t}</h3>
                  <p className={`relative text-white/55 leading-relaxed mt-2 ${tile.big ? "text-[14px]" : "text-[12px]"}`}>{tile.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── JOB BOARD ── */}
          <section id="jobs" className="relative px-6 py-32 md:py-44 max-w-6xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="reveal text-[11px] uppercase tracking-[0.32em] font-bold" style={{ color: BLUE }}>Experience · Land the role</p>
                <h2 className="reveal mt-3 font-black tracking-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Live postings, matched to you.</h2>
              </div>
              <p className="reveal text-white/55 max-w-sm text-[15px] leading-relaxed">Real internships and co-ops from industry partners — each one pre-scored against your fit, so you know where to spend your effort.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
              {JOBS.map((j) => (
                <div key={j.role} className="job-card opacity-0 translate-y-3 group rounded-2xl p-6 ring-1 ring-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black text-xl">{j.role}</h3>
                      <p className="text-white/50 text-[13px] mt-1">{j.org} · {j.loc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block text-[10px] font-black tabular-nums px-2 py-1 rounded" style={{ color: "#07101a", background: fitChip(j.fit) }}>{j.fit}% fit</span>
                      <p className="text-[12px] text-white/60 mt-2 font-bold">{j.stipend}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {j.tags.map((t) => <span key={t} className="text-[11px] rounded-full px-2.5 py-0.5 ring-1 ring-white/10 text-white/60">{t}</span>)}
                    <span className="text-[11px] rounded-full px-2.5 py-0.5 text-white/35">Internship</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── KNOWLEDGE EXCHANGE ── */}
          <section className="kx-sec relative px-6 py-32 md:py-44 border-y border-white/10 overflow-hidden">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
              <div>
                <p className="reveal text-[11px] uppercase tracking-[0.32em] font-bold" style={{ color: CYAN }}>Knowledge Exchange</p>
                <h2 className="reveal mt-3 font-black tracking-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>You&apos;re never figuring it out alone.</h2>
                <p className="reveal mt-4 text-white/55 max-w-md text-lg">A living network of peers, mentors, and shared know-how — the part of the bench you can&apos;t get from a textbook.</p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {EXCHANGE.map(([t, d]) => (
                    <div key={t} className="reveal rounded-2xl p-5 ring-1 ring-white/10 bg-white/[0.03]">
                      <h3 className="font-black text-[15px]">{t}</h3>
                      <p className="text-white/55 text-[12px] leading-relaxed mt-1.5">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <svg viewBox="0 0 360 320" className="w-full h-auto max-w-md mx-auto">
                {KX_LINKS.map((d, i) => <path key={i} className="kx-link" d={d} fill="none" stroke={`${CYAN}55`} strokeWidth="1.5" />)}
                {KX_NODES.map((n, i) => (
                  <circle key={i} className="kx-node" cx={n[0]} cy={n[1]} r={n[2]} fill="#0b1623" stroke={i === 0 ? TEAL : CYAN} strokeWidth="2" />
                ))}
              </svg>
            </div>
          </section>

          {/* ── INTERNATIONAL EXCHANGE (COMING) ── */}
          <section className="intl-sec relative px-6 py-32 md:py-44 max-w-6xl mx-auto overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
              <div>
                <span className="reveal inline-block text-[10px] uppercase tracking-[0.24em] font-black px-2.5 py-1 rounded-full mb-4" style={{ color: "#07101a", background: VIOLET }}>Coming soon</span>
                <h2 className="reveal font-black tracking-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>International exchange, on the horizon.</h2>
                <p className="reveal mt-4 text-white/55 max-w-md text-lg">Placements and learning exchanges with biomanufacturing hubs abroad — spend a term on a different bench, then bring it home.</p>
                <div className="reveal mt-7 flex flex-wrap gap-2">
                  {INTL.map((r) => <span key={r} className="text-[12px] rounded-full px-3 py-1.5 ring-1 ring-white/10 bg-white/[0.03] text-white/70">{r}</span>)}
                </div>
              </div>
              <svg viewBox="0 0 420 240" className="w-full h-auto">
                <path id="intl-arc" className="intl-arc" d="M40,190 C140,30 280,30 380,150" fill="none" stroke={`${VIOLET}aa`} strokeWidth="2.5" strokeDasharray="6 8" strokeLinecap="round" />
                <circle cx="40" cy="190" r="7" fill={CYAN} />
                <circle cx="380" cy="150" r="7" fill={VIOLET} />
                <g className="intl-rider"><circle r="5" fill="#fff" /></g>
                <text x="40" y="215" fill="#ffffffaa" fontSize="11" textAnchor="middle" fontFamily="inherit">Home hub</text>
                <text x="380" y="133" fill="#ffffffaa" fontSize="11" textAnchor="middle" fontFamily="inherit">Abroad</text>
              </svg>
            </div>
          </section>

          {/* ── EMPLOYER DIVIDER + BENEFITS ── */}
          <section id="employers" className="relative px-6 py-32 md:py-44 overflow-hidden" style={{ background: `linear-gradient(180deg, ${VIOLET}14, transparent 42%)` }}>
            <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${VIOLET}88, transparent)` }} />
            <div aria-hidden data-speed="0.9" className="absolute -top-10 right-[-8%] w-[36vw] h-[36vw] rounded-full blur-[130px] opacity-20" style={{ background: VIOLET }} />
            <div className="max-w-6xl mx-auto relative">
              <div className="reveal inline-flex items-center gap-2 rounded-full px-4 py-1.5 ring-1 text-[12px] font-black uppercase tracking-[0.24em]" style={{ color: VIOLET, borderColor: `${VIOLET}55` }}>
                <span className="w-2 h-2 rounded-full" style={{ background: VIOLET }} />For employers &amp; hiring teams
              </div>
              <h2 className="reveal mt-5 font-black tracking-tight max-w-4xl" style={{ fontSize: "clamp(2rem, 4.5vw, 3.6rem)" }}>Stop sourcing cold. Start hiring trained.</h2>
              <p className="reveal mt-4 text-white/60 max-w-2xl text-lg">BioHubNet is where biomanufacturing talent learns the bench — so the people in your pipeline already know your methods. Here&apos;s what that changes for your team.</p>
              <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {EMPLOYER_BENEFITS.map((b) => (
                  <div key={b.title} className="reveal group rounded-2xl p-7 ring-1 ring-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                    <p className="font-black tabular-nums leading-none" style={{ fontSize: "clamp(1.7rem,3vw,2.3rem)", color: b.color }}>{b.metric}</p>
                    <h3 className="text-lg font-black mt-3">{b.title}</h3>
                    <p className="text-white/55 text-[13px] leading-relaxed mt-2">{b.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── HR COMMAND CENTER (KPI / RAG) ── */}
          <section id="hiring" className="kpi-sec relative px-6 py-32 md:py-44 border-y border-white/10 overflow-hidden">
            <div aria-hidden data-speed="0.9" className="absolute top-0 right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-20" style={{ background: VIOLET }} />
            <div className="max-w-6xl mx-auto relative">
              <p className="reveal text-[11px] uppercase tracking-[0.32em] font-bold" style={{ color: VIOLET }}>For employers · HR</p>
              <h2 className="reveal mt-3 font-black tracking-tight max-w-4xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>The numbers leadership asks for, live.</h2>
              <p className="reveal mt-4 text-white/55 max-w-2xl text-lg">Every KPI carries an OKR target and a RAG status — on track, at risk, or off track — computed over the period you pick.</p>
              <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {KPI_TILES.map((t, i) => (
                  <div key={t.k} className="reveal group rounded-2xl p-6 ring-1 ring-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-white/55">{t.k}</p>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: RAG[t.rag] }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: RAG[t.rag] }} />{t.rag === "on" ? "On track" : t.rag === "at" ? "At risk" : "Off track"}
                      </span>
                    </div>
                    <p className={`kpi-val-${i} font-black tabular-nums leading-none mt-3`} style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>{t.prefix}0{t.unit}</p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <span className="text-[11px] text-white/40">{t.target}</span>
                      <svg viewBox="0 0 132 40" className="w-[120px] h-[34px] overflow-visible">
                        <path className="kpi-spark" d={sparkPath(t.spark)} fill="none" stroke={RAG[t.rag]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── HIRING FUNNEL ── */}
          <section className="funnel-sec relative px-6 py-32 md:py-44 max-w-5xl mx-auto">
            <h2 className="reveal font-black tracking-tight text-center mx-auto max-w-3xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>From applicant to hire, stage by stage.</h2>
            <p className="reveal mt-4 text-white/55 max-w-xl mx-auto text-center text-lg">Snapshot and true-cohort conversion side by side, with the biggest drop-off flagged automatically.</p>
            <div className="mt-14 space-y-4">
              {FUNNEL.map((f, i) => {
                const conv = i > 0 ? Math.round((f.n / FUNNEL[i - 1].n) * 100) : null;
                return (
                  <div key={f.stage}>
                    <div className="flex items-center justify-between text-[13px] mb-1.5 px-1">
                      <span className="font-semibold text-white/80">{f.stage}</span>
                      <span className="flex items-center gap-3">
                        {conv !== null && <span className="text-[11px] text-white/40">{conv}% advance</span>}
                        <span className={`funnel-n-${i} tabular-nums font-black`} style={{ color: i === FUNNEL.length - 1 ? RAG.on : CYAN }}>0</span>
                      </span>
                    </div>
                    <div className="mx-auto funnel-bar h-11 rounded-lg flex items-center px-4 text-[12px] font-bold text-[#07101a]" style={{ width: `${Math.max(f.pct, 8)}%`, background: `linear-gradient(90deg, ${CYAN}, ${TEAL})` }}>
                      {f.pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── CANDIDATE PIPELINE ── */}
          <section className="relative px-6 py-28 md:py-40 border-y border-white/10 bg-white/[0.015]">
            <div className="max-w-6xl mx-auto">
              <h2 className="reveal font-black tracking-tight max-w-3xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>A pipeline your whole team works.</h2>
              <p className="reveal mt-4 text-white/55 max-w-xl text-lg">Drag candidates across stages, with role-based access, attribution on every move, and email that fires itself.</p>
              <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-3">
                {PIPELINE.map((col) => (
                  <div key={col.stage} className="rounded-2xl p-3 ring-1 ring-white/10 bg-white/[0.03]">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="flex items-center gap-1.5 text-[12px] font-bold"><span className="w-2 h-2 rounded-full" style={{ background: col.color }} />{col.stage}</span>
                      <span className="text-[11px] text-white/35 tabular-nums">{col.total}</span>
                    </div>
                    <div className="space-y-2">
                      {col.cards.map(([name, role, score]) => (
                        <div key={name} className="pipe-card rounded-xl p-3 ring-1 ring-white/10 bg-[#0b1623] opacity-0 translate-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-bold text-white/90">{name}</span>
                            <span className="text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded" style={{ color: "#07101a", background: fitChip(score) }}>{score}</span>
                          </div>
                          <p className="text-[11px] text-white/45 mt-0.5">{role}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── HIRING LOOP (workflow) ── */}
          <section className="loop-sec relative px-6 py-32 md:py-44 max-w-5xl mx-auto">
            <h2 className="reveal font-black tracking-tight max-w-3xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Post a role to report to the board.</h2>
            <p className="reveal mt-4 text-white/55 max-w-xl text-lg">Six steps, one system of record — every action logged, every metric reconciled.</p>
            <div className="mt-14 grid grid-cols-[28px_1fr] gap-x-5">
              <svg viewBox="0 0 28 600" preserveAspectRatio="none" className="w-7 h-full">
                <path className="loop-spine" d="M14,14 L14,586" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" />
                {HIRING_LOOP.map((_, i) => (
                  <circle key={i} className="loop-dot" cx="14" cy={14 + i * ((586 - 14) / (HIRING_LOOP.length - 1))} r="6" fill="#07101a" stroke={i % 2 ? CYAN : TEAL} strokeWidth="2.5" />
                ))}
              </svg>
              <ol className="space-y-9">
                {HIRING_LOOP.map((s, i) => (
                  <li key={s.step} className="reveal">
                    <div className="flex items-baseline gap-3">
                      <span className="text-[12px] font-black tabular-nums" style={{ color: i % 2 ? CYAN : TEAL }}>{String(i + 1).padStart(2, "0")}</span>
                      <h3 className="text-xl font-black">{s.step}</h3>
                    </div>
                    <p className="text-white/55 mt-1.5 leading-relaxed pl-7 max-w-lg">{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ── REPORTS SUITE (BENTO) ── */}
          <section id="reports" className="relative px-6 py-32 md:py-44 border-y border-white/10">
            <div className="max-w-6xl mx-auto">
              <h2 className="reveal font-black tracking-tight max-w-4xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Ten reports. One source of truth.</h2>
              <p className="reveal mt-4 text-white/55 max-w-2xl text-lg">A pure metrics library feeds every report, the print one-pager, and the CSV — so the numbers always reconcile. Period filters, OKR targets, RAG everywhere.</p>
              <div className="mt-14 grid grid-cols-2 lg:grid-cols-5 gap-3">
                {REPORTS.map((r) => (
                  <div key={r.n} className={`report-tile opacity-0 translate-y-3 scale-95 rounded-2xl p-4 ring-1 transition-colors ${r.feat ? "ring-white/20" : "ring-white/10 hover:ring-white/25"}`} style={{ background: r.feat ? `linear-gradient(155deg, ${TEAL}26, transparent 60%)` : "rgba(255,255,255,0.03)" }}>
                    {r.feat && <p className="text-[9px] uppercase tracking-[0.24em] font-bold mb-1.5" style={{ color: TEAL }}>Headline</p>}
                    <h3 className="text-[14px] font-black leading-tight">{r.n}</h3>
                    <p className="text-[11px] text-white/50 mt-1.5 leading-snug">{r.d}</p>
                  </div>
                ))}
              </div>
              <div className="reveal mt-6 flex flex-wrap gap-2 text-[11px] text-white/50">
                {["Period filters (MTD / QTD / YTD)", "OKR targets + RAG", "Print → PDF", "CSV export", "DEI: opt-in · k-anonymity"].map((c) => (
                  <span key={c} className="rounded-full px-3 py-1 ring-1 ring-white/10 bg-white/[0.03]">{c}</span>
                ))}
              </div>
            </div>
          </section>

          {/* ── TRENDS ── */}
          <section className="trend-sec relative px-6 py-32 md:py-44 max-w-6xl mx-auto">
            <h2 className="reveal font-black tracking-tight text-center mx-auto max-w-3xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Both lines going the right way.</h2>
            <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-3xl p-7 ring-1 ring-white/10 bg-white/[0.03]">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-white/55">Time-to-fill</p>
                    <p className="text-3xl font-black tabular-nums mt-1" style={{ color: TEAL }}>41 → 28<span className="text-base text-white/40 font-bold"> days</span></p>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: RAG.on }}>−32%</span>
                </div>
                <svg viewBox="0 0 320 120" className="w-full h-auto mt-4 overflow-visible">
                  <path className="trend-line" d={sparkPath(TTF_TREND, 320, 120, 10)} fill="none" stroke={TEAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="rounded-3xl p-7 ring-1 ring-white/10 bg-white/[0.03]">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-white/55">Cost-per-hire</p>
                    <p className="text-3xl font-black tabular-nums mt-1" style={{ color: CYAN }}>$6.2k → $4.6k</p>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: RAG.on }}>−26%</span>
                </div>
                <div className="mt-4 flex items-end gap-1.5 h-[120px]">
                  {CPH_TREND.map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end h-full">
                      <div className="cost-bar rounded-t" style={{ height: `${cphHeight(v)}%`, background: `linear-gradient(to top, ${CYAN}, ${TEAL})` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── SCORECARD / QUALITY-OF-HIRE ── */}
          <section className="score-sec relative px-6 py-28 md:py-40 max-w-6xl mx-auto border-t border-white/10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 items-center">
              <div>
                <h2 className="reveal font-black tracking-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Structured scorecards, every interview.</h2>
                <p className="reveal mt-5 text-white/60 text-lg leading-relaxed max-w-md">A shared rubric per role, scored by each panelist, rolled into a quality-of-hire metric that lets you compare hires against the ones you passed on.</p>
              </div>
              <div className="rounded-3xl p-7 ring-1 ring-white/10 bg-white/[0.03]">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[13px] font-bold text-white/80">PD Scientist · Panel rubric</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded" style={{ color: "#07101a", background: RAG.on }}>Strong hire</span>
                </div>
                <div className="space-y-4">
                  {SCORE_CRITERIA.map((c) => (
                    <div key={c.k}>
                      <div className="flex items-center justify-between text-[13px] mb-1.5">
                        <span className="text-white/75">{c.k}</span>
                        <span className="tabular-nums font-bold text-white/90">{c.v.toFixed(1)}<span className="text-white/35"> / 5</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="score-bar h-full rounded-full" style={{ width: `${(c.v / 5) * 100}%`, background: `linear-gradient(90deg, ${TEAL}, ${CYAN})` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── STATS ── */}
          <section className="relative px-6 py-24 border-y border-white/10">
            <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {STATS.map((s, i) => (
                <div key={s.label}>
                  <p className={`stat-${i} font-black tabular-nums leading-none`} style={{ fontSize: "clamp(2.4rem,5vw,4rem)", color: i % 2 ? CYAN : TEAL }}>{s.prefix}0{s.suffix}</p>
                  <p className="mt-3 text-white/50 text-[13px]">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── FEATURE RAIL (horizontal pin) ── */}
          <section className="rail-sec relative h-screen overflow-hidden">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center px-6 z-10">
              <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)" }}>Everything in the toolkit.</h2>
            </div>
            <div className="rail-track flex h-full items-center gap-6 px-[6vw]" style={{ width: "max-content" }}>
              {RAIL.map((r) => (
                <div key={r.t} className="w-[78vw] sm:w-[42vw] lg:w-[28vw] rounded-3xl p-8 ring-1 ring-white/10 bg-white/[0.04]">
                  <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: r.side === "Talent" ? CYAN : VIOLET }}>{r.side}</span>
                  <h3 className="text-3xl font-black mt-3">{r.t}</h3>
                  <p className="text-white/55 mt-3 leading-relaxed">{r.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── VOICES ── */}
          <section className="relative px-6 py-32 md:py-44 max-w-6xl mx-auto">
            <h2 className="reveal font-black tracking-tight max-w-3xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Both sides, in their words.</h2>
            <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5">
              {VOICES.map((v) => (
                <figure key={v.who} className="reveal group rounded-3xl p-8 ring-1 ring-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                  <div className="text-5xl font-black leading-none mb-3" style={{ color: v.color }}>&ldquo;</div>
                  <blockquote className="text-lg leading-relaxed text-white/85">{v.q}</blockquote>
                  <figcaption className="mt-5 text-[12px] uppercase tracking-[0.18em] font-bold text-white/45">{v.who}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* ── FUNDING (EQUIP) ── */}
          <section id="equip" className="fund-sec relative px-6 py-32 md:py-44 border-y border-white/10 overflow-hidden">
            <div aria-hidden data-speed="0.9" className="absolute bottom-0 left-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-20" style={{ background: VIOLET }} />
            <div className="max-w-6xl mx-auto relative">
              <p className="reveal text-[11px] uppercase tracking-[0.32em] font-bold" style={{ color: VIOLET }}>Equip · Fund the leap</p>
              <h2 className="reveal mt-3 font-black tracking-tight max-w-3xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Funding that turns a project into a venture.</h2>
              <p className="reveal mt-4 text-white/55 max-w-2xl text-lg">Two tiers of non-dilutive backing, a guided wizard to apply, and a real review — so the best ideas don&apos;t stall for lack of $5K.</p>
              <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {FUNDING.map((f) => (
                  <div key={f.t} className="reveal rounded-3xl p-8 ring-1 ring-white/10 bg-white/[0.03]">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-2xl font-black">{f.t}</h3>
                      <span className="font-black tabular-nums text-2xl" style={{ color: f.color }}>≤ ${f.cap}K</span>
                    </div>
                    <div className="mt-4 h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="fund-bar h-full rounded-full" style={{ width: `${f.w}%`, background: `linear-gradient(90deg, ${f.color}, ${CYAN})` }} />
                    </div>
                    <p className="mt-5 text-white/60 leading-relaxed">{f.blurb}</p>
                    <ul className="mt-5 space-y-2">
                      {f.items.map((it) => <li key={it} className="flex items-center gap-2 text-[13px] text-white/75"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.color }} />{it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {FUND_STEPS.map((s, i) => (
                  <div key={s} className="reveal rounded-2xl p-5 ring-1 ring-white/10 bg-white/[0.03]">
                    <span className="text-[11px] font-black tabular-nums" style={{ color: i % 2 ? CYAN : VIOLET }}>{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-[13px] font-semibold text-white/80 mt-2">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PAST VENTURES ── */}
          <section className="relative px-6 py-32 md:py-44 max-w-6xl mx-auto">
            <h2 className="reveal font-black tracking-tight max-w-3xl" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>Funded, built, and shipped.</h2>
            <p className="reveal mt-4 text-white/55 max-w-2xl text-lg">Where past VentureConnect and VentureLift backing actually went — from a conference booth to a filed patent.</p>

            <div className="mt-14">
              <div className="reveal flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-5">
                <h3 className="text-xl font-black" style={{ color: CYAN }}>VentureConnect</h3>
                <span className="text-[12px] text-white/45 uppercase tracking-[0.18em] font-bold">≤ $5K · events + community</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {VC_PAST.map((v) => (
                  <div key={v.name} className="venture-card opacity-0 translate-y-3 rounded-2xl p-6 ring-1 ring-white/10 bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-black text-[16px] leading-tight">{v.name}</h4>
                      <span className="shrink-0 text-[11px] font-black tabular-nums px-2 py-0.5 rounded" style={{ color: "#07101a", background: CYAN }}>{v.amt}</span>
                    </div>
                    <p className="text-white/45 text-[12px] mt-1">{v.who}</p>
                    <p className="text-white/60 text-[13px] leading-relaxed mt-3">{v.note}</p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: CYAN }}><span aria-hidden>✓</span>{v.outcome}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12">
              <div className="reveal flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-5">
                <h3 className="text-xl font-black" style={{ color: VIOLET }}>VentureLift</h3>
                <span className="text-[12px] text-white/45 uppercase tracking-[0.18em] font-bold">≤ $25K · commercialization</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {VL_PAST.map((v) => (
                  <div key={v.name} className="venture-card opacity-0 translate-y-3 rounded-2xl p-6 ring-1 ring-white/10 bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-black text-[16px] leading-tight">{v.name}</h4>
                      <span className="shrink-0 text-[11px] font-black tabular-nums px-2 py-0.5 rounded" style={{ color: "#07101a", background: VIOLET }}>{v.amt}</span>
                    </div>
                    <p className="text-white/45 text-[12px] mt-1">{v.who}</p>
                    <p className="text-white/60 text-[13px] leading-relaxed mt-3">{v.note}</p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: VIOLET }}><span aria-hidden>✓</span>{v.outcome}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="relative px-6 py-40 md:py-56 text-center overflow-hidden">
            <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 50%, #0d948833, transparent 70%)` }} />
            <h2 className="reveal relative font-black tracking-tight max-w-4xl mx-auto" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}>Train talent. Hire talent. Prove it.</h2>
            <p className="reveal relative mt-5 text-white/60 text-lg max-w-xl mx-auto">One platform for the people building biomanufacturing — and the teams that hire them.</p>
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
