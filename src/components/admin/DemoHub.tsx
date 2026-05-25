"use client";
/**
 * DemoHub — interactive 3-persona platform walkthrough.
 *
 * Intended audience: senior management, investors, board members.
 * Deployed at /admin/demo (admin-only).
 *
 * Three dinosaur characters represent the three user roles:
 *   Rex  (Triceratops)  — Trainee  — emerald
 *   Vera (Velociraptor) — Employer — violet
 *   Max  (Brachiosaurus)— Admin    — sky
 *
 * Each character can walk through the three platform pillars:
 *   ENGAGE (learning)  ·  EXPERIENCE (placement)  ·  EQUIP (funding)
 *
 * Vera is locked from ENGAGE and EQUIP — those locked states explain
 * the relationship rather than silently blocking.
 */
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BookOpen, Briefcase, Rocket, ExternalLink, Lock, Play } from "lucide-react";
import { useDemoTour } from "@/lib/demo/tourContext";
import type { TourPersona, TourPhase } from "@/lib/demo/tourScripts";

// ─── Types ────────────────────────────────────────────────────────────────────

type CharKey  = "rex"  | "vera" | "max";
type PhaseKey = "engage" | "experience" | "equip";

interface Screen { emoji: string; label: string; detail: string }
interface Action { step: number; label: string; detail: string }
interface Impact { char: CharKey; text: string }

interface PhaseAvailable {
  available: true;
  screens: Screen[];
  actions: Action[];
  impact: Impact[];
  liveLink: string;
  liveLinkLabel: string;
}
interface PhaseBlocked {
  available: false;
  reason: string;
  note: string;
}
type Phase = PhaseAvailable | PhaseBlocked;

interface Character {
  key: CharKey;
  name: string;
  species: string;
  role: "Trainee" | "Employer" | "Admin";
  tagline: string;
  phases: Record<PhaseKey, Phase>;
}

// ─── 8-bit pixel-art dinos ────────────────────────────────────────────────────
//
// Each sprite is a string array where every character represents one pixel.
// Legend:
//   '.'  transparent
//   '1'  body (currentColor — picked up from text-emerald-500 / -violet / -sky)
//   '2'  body shadow (currentColor at 60% opacity)
//   'H'  horn / claw (light grey)
//   'W'  eye white
//   'P'  pupil (black)
//   'M'  mouth / smile (white at 80%)
//   'S'  snout / glasses accent (white at 70%)
//   'T'  tail (body color — placed in <g class="dino-tail"> so it wags)
//   'G'  glasses lens (white at 50%)
//
// Pixels marked W/P/E live inside <g class="dino-eye"> so they blink.
// The whole sprite lives inside <g class="dino-bob"> — the wrapper bobs
// up and down like a game-menu character idle.

const REX_SPRITE = [
  "....H.H.H...........",  // 3 horn tips
  "...HHHHHHH..........",  // horn bases merging into the head
  "..1111111111........",  // head/frill top
  ".111111111111.......",  // head + start of frill
  ".11WP11111111111....",  // EYE row (W=white, P=pupil)
  ".11WP11111111111....",  // double-height eye
  ".11111111111111111..",  // head meets body
  ".M.1111111111111111.",  // mouth tick
  "...11111111111111TT.",  // body + tail nub
  "...1111111111111TT..",
  "...11111111111TT....",
  "...1111111111.......",
  "...11.11.11.11......",  // four legs (gaps between)
  "...11.11.11.11......",
];

const VERA_SPRITE = [
  "...111..............",  // top of head
  "..1111..............",
  ".11WP1..............",  // eye + pupil
  "SS1111..............",  // snout pokes out left
  ".M11................",  // mouth tick
  "..111...............",  // neck
  "..111...............",
  "...111..............",
  "....111.............",
  ".....11111..........",  // shoulder
  ".....111111111......",  // back
  "....11111111111111TT",  // body + long tail trailing right
  "....1111111111111TT.",
  ".....11..1111111....",  // belly + raptor leg crouch
  ".....11..11.........",  // back foot
  ".....22..22.........",  // foot shadow
];

const MAX_SPRITE = [
  "..............HH....",  // top of head
  ".............1111...",
  ".............WPG1...",  // eye + pupil + glasses lens
  ".............1111...",
  "............1111....",
  "...........1111.....",  // long neck curving down-left
  "..........1111......",
  ".........1111.......",
  "........11111.......",
  ".....11111111111....",  // body starts
  "....11111111111111..",
  "...1111111111111111T",  // big round body + tail
  "...111111111111111TT",
  "...11.11..11.11.....",  // four stubby legs
  "...11.11..11.11.....",
  "...22.22..22.22.....",  // foot shadow
];

const SPRITES: Record<CharKey, string[]> = {
  rex:  REX_SPRITE,
  vera: VERA_SPRITE,
  max:  MAX_SPRITE,
};

// One-time stylesheet (rendered once at the top of DemoHub).
// All three idle animations live here so the SVGs themselves stay pure.
const PIXEL_DINO_STYLE = `
@keyframes dino-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-1.5px); }
}
@keyframes dino-tail-wag {
  0%, 100% { transform: rotate(-6deg); }
  50%      { transform: rotate(6deg); }
}
@keyframes dino-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  94%, 98%      { transform: scaleY(0.05); }
}
@keyframes dino-step {
  0%, 100% { transform: translateY(0); }
  25%      { transform: translateY(0.4px); }
  75%      { transform: translateY(-0.4px); }
}
.dino-sprite {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.dino-sprite .dino-bob {
  animation: dino-bob 1.6s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}
.dino-sprite .dino-tail {
  animation: dino-tail-wag 0.95s ease-in-out infinite;
  transform-origin: 0% 60%;
  transform-box: fill-box;
}
.dino-sprite .dino-eye {
  animation: dino-blink 4.2s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}
.dino-sprite .dino-legs {
  animation: dino-step 1.6s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}
/* Slight phase offsets so the three dinos breathe out of sync */
.dino-rex  .dino-bob { animation-delay: 0s;     }
.dino-vera .dino-bob { animation-delay: -0.4s;  }
.dino-max  .dino-bob { animation-delay: -0.85s; }
.dino-rex  .dino-eye { animation-delay: -1.2s;  }
.dino-vera .dino-eye { animation-delay: -2.6s;  }
.dino-max  .dino-eye { animation-delay: 0s;     }
.dino-rex  .dino-tail{ animation-delay: -0.1s;  }
.dino-vera .dino-tail{ animation-delay: -0.5s;  }
.dino-max  .dino-tail{ animation-delay: -0.7s;  }
/* On hover the showcase speeds up — like a fighter selected on the roster */
.dino-card:hover .dino-sprite .dino-bob  { animation-duration: 0.7s; }
.dino-card:hover .dino-sprite .dino-tail { animation-duration: 0.45s; }
@media (prefers-reduced-motion: reduce) {
  .dino-sprite .dino-bob,
  .dino-sprite .dino-tail,
  .dino-sprite .dino-eye,
  .dino-sprite .dino-legs { animation: none; }
}
`;

// Maps a sprite character to (color, group). Group decides whether the
// pixel lands in the body, the tail wag group, the eye blink group, or
// the legs step group.
type DinoGroup = "body" | "tail" | "eye" | "legs";
function pixelMeta(
  c: string,
): { color: string; opacity?: number; group: DinoGroup } | null {
  switch (c) {
    case "1": return { color: "currentColor",                  group: "body" };
    case "2": return { color: "currentColor", opacity: 0.55,   group: "body" };
    case "H": return { color: "#f3f4f6",                       group: "body" };
    case "G": return { color: "#ffffff",      opacity: 0.55,   group: "body" };
    case "S": return { color: "currentColor", opacity: 0.75,   group: "body" };
    case "M": return { color: "#ffffff",      opacity: 0.80,   group: "body" };
    case "W": return { color: "#ffffff",                       group: "eye"  };
    case "P": return { color: "#1a1a1a",                       group: "eye"  };
    case "T": return { color: "currentColor",                  group: "tail" };
    case "L": return { color: "currentColor",                  group: "legs" };
    default:  return null;
  }
}

function PixelDino({ sprite, className }: { sprite: string[]; className?: string }) {
  const width  = Math.max(...sprite.map((r) => r.length));
  const height = sprite.length;

  const cells: Record<DinoGroup, React.ReactNode[]> = {
    body: [], tail: [], eye: [], legs: [],
  };
  for (let y = 0; y < height; y++) {
    const row = sprite[y];
    for (let x = 0; x < row.length; x++) {
      const meta = pixelMeta(row[x]);
      if (!meta) continue;
      cells[meta.group].push(
        <rect
          key={`${x}-${y}-${meta.group}`}
          x={x} y={y} width={1} height={1}
          fill={meta.color}
          {...(meta.opacity != null ? { opacity: meta.opacity } : {})}
        />,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      className={cn("dino-sprite overflow-visible", className)}
      aria-hidden
    >
      <g className="dino-bob">
        {cells.body}
        <g className="dino-legs">{cells.legs}</g>
        <g className="dino-tail">{cells.tail}</g>
        <g className="dino-eye">{cells.eye}</g>
      </g>
    </svg>
  );
}

const DINO_SVG: Record<CharKey, (p: { className?: string }) => React.JSX.Element> = {
  rex:  (p) => <PixelDino sprite={SPRITES.rex}  className={cn("dino-rex",  p.className)} />,
  vera: (p) => <PixelDino sprite={SPRITES.vera} className={cn("dino-vera", p.className)} />,
  max:  (p) => <PixelDino sprite={SPRITES.max}  className={cn("dino-max",  p.className)} />,
};

// ─── Style maps ───────────────────────────────────────────────────────────────

const CHAR_STYLE: Record<CharKey, {
  svgText: string; bg: string; text: string; ring: string; badge: string; dot: string;
}> = {
  rex:  { svgText: "text-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-400", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  vera: { svgText: "text-violet-500",  bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-violet-400",  badge: "bg-violet-100 text-violet-700",  dot: "bg-violet-400"  },
  max:  { svgText: "text-sky-500",     bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-400",     badge: "bg-sky-100 text-sky-700",        dot: "bg-sky-400"     },
};

const CHAR_INITIAL: Record<CharKey, string> = { rex: "R", vera: "V", max: "M" };

const PHASES = [
  { key: "engage"     as PhaseKey, label: "ENGAGE",     subtitle: "Learning & certification", Icon: BookOpen,  bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-400", dot: "bg-emerald-400", ctaRing: "ring-emerald-300" },
  { key: "experience" as PhaseKey, label: "EXPERIENCE",  subtitle: "Placements & hiring",      Icon: Briefcase, bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-400",   dot: "bg-amber-400",   ctaRing: "ring-amber-300"   },
  { key: "equip"      as PhaseKey, label: "EQUIP",       subtitle: "Funding & ventures",       Icon: Rocket,    bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-400",    dot: "bg-rose-400",    ctaRing: "ring-rose-300"    },
];

// ─── Character data ───────────────────────────────────────────────────────────

const CHARACTERS: Character[] = [
  // ── REX — Triceratops — Trainee ──────────────────────────────────────────
  {
    key: "rex",
    name: "Rex",
    species: "Triceratops",
    role: "Trainee",
    tagline: "Biotech grad, eager to land his first placement and fund his first venture",
    phases: {
      engage: {
        available: true,
        screens: [
          { emoji: "📚", label: "Course Library",   detail: "40+ curated biotech & lab-skills modules. Filter by pathway, skill gap, or certification track. An AI match score per course shows how each one fills Rex's verified skill gaps." },
          { emoji: "🎯", label: "My Pathway",        detail: "A personalised learning pathway built from Rex's intake assessment. Milestones check off as he progresses — real-time streak badges and progress rings keep momentum." },
          { emoji: "🏆", label: "Certificate Wall",  detail: "Every completed module issues a timestamped, verifiable credential. Certificates stack into Rex's public skill profile — visible to employers like Vera in the talent pool the moment they're issued." },
          { emoji: "💬", label: "Cohort Feed",       detail: "Rex joins a live cohort of 12 peers. Shared chat, peer-review tasks, and anonymous feedback rounds. Max monitors cohort health from the admin dashboard." },
        ],
        actions: [
          { step: 1, label: "Enrol in 'Bioreactor Fundamentals'",       detail: "One click from the course card. Rex joins the June cohort and immediately unlocks Module 1." },
          { step: 2, label: "Complete a module + pass the quiz",         detail: "Video lecture → rich notes → multiple-choice quiz. 70 % pass threshold. Streak badges reward consecutive days." },
          { step: 3, label: "Submit a peer review",                      detail: "After finishing his lab report, Rex reviews two peers anonymously. Structured rubric keeps feedback useful rather than personal." },
          { step: 4, label: "Earn certificate & update skill profile",   detail: "Certificate auto-attaches to Rex's profile the moment it issues — Vera sees it in the talent pool within seconds." },
        ],
        impact: [
          { char: "vera", text: "Rex's completed skill profile surfaces in Vera's talent pool the moment he earns a relevant certificate." },
          { char: "max",  text: "Rex's activity feeds Max's cohort analytics: completion rate, quiz scores, streak data — live cohort health view." },
        ],
        liveLink: "/dashboard",
        liveLinkLabel: "Open Rex's dashboard",
      },
      experience: {
        available: true,
        screens: [
          { emoji: "🔍", label: "Job Board",         detail: "Live postings matched to Rex's verified skills. An AI match score (0–100) appears per posting — Rex sees exactly why he's a strong or weak fit for each role." },
          { emoji: "📝", label: "Application Form",  detail: "One structured form: resume picker, 60-second video upload, elevator pitch (300 chars), and 3 skill tags. Takes under 10 minutes to complete." },
          { emoji: "📊", label: "My Pipeline",       detail: "Kanban-style tracker shows Rex's live application stage: Applied → Shortlisted → Interview → Offer. A notification fires on every column move." },
          { emoji: "📅", label: "Interview Slots",   detail: "When shortlisted, Rex sees Vera's available slots and books directly — no email ping-pong. Calendar invites land in both inboxes instantly." },
        ],
        actions: [
          { step: 1, label: "Find Vera's posting",           detail: "AI match score: 87 / 100. Rex can see why: 4 of 5 required skills verified, 1 preferred skill match, strong pitch keyword overlap." },
          { step: 2, label: "Submit application",            detail: "Rex attaches his 'Lab Bioreactor' resume, uploads a 58-second video, and writes: 'I built and operated a 5 L fed-batch bioreactor for 18 months…'" },
          { step: 3, label: "Book interview slot",           detail: "Vera's team opens Tuesday 10 am. Rex books in one click — his pipeline column moves to 'Interview Scheduled'." },
          { step: 4, label: "Accept the offer",              detail: "Rex clicks 'Accept offer' — a two-step confirm prevents accidents. The placement is logged; his pathway marks EXPERIENCE complete." },
        ],
        impact: [
          { char: "vera", text: "Every Rex action (apply, slot book, accept) fires a Vera inbox notification. Her pipeline Kanban updates in real time." },
          { char: "max",  text: "Placement events feed Max's funnel analytics: application volume, shortlist rate, offer acceptance, average time-to-hire." },
        ],
        liveLink: "/jobs",
        liveLinkLabel: "Open public job board",
      },
      equip: {
        available: true,
        screens: [
          { emoji: "🚀", label: "EQUIP Home",         detail: "Rex discovers two funding streams: VentureConnect (≤ $5 K, monthly window) and VentureLift (≤ $25 K, quarterly). Each shows the next open window date and closing countdown." },
          { emoji: "📋", label: "Application Form",   detail: "Structured fields: venture description, team members, 90-day milestone plan, budget breakdown, and pitch deck upload (PDF / PPTX). Auto-saves every 30 seconds." },
          { emoji: "⏳", label: "Status Tracker",     detail: "Live status card: Submitted → Under Review → Approved / Rejected. Max's decision note is visible here — no black box. Rex can reply with milestone updates." },
          { emoji: "💰", label: "Funded Ventures",    detail: "A cohort wall of funded ventures. Rex reads past winners' plans for inspiration and tracks the total capital deployed across all cohorts this year." },
        ],
        actions: [
          { step: 1, label: "Check open windows",                         detail: "VentureConnect window is open until May 31. Rex sees '3 days left' — the urgency drives immediate action." },
          { step: 2, label: "Start application",                          detail: "Rex describes his bioreactor-monitoring SaaS idea, adds two co-founders, uploads a 6-slide deck. Draft saved automatically." },
          { step: 3, label: "Submit before deadline",                     detail: "One-click submit. Rex gets an email confirmation and the form locks. Late submissions are automatically blocked by the system." },
          { step: 4, label: "Read Max's decision note",                   detail: "Approved — $4,500 awarded. Max's note: 'Strong team, clear roadmap. Recommend a user-research milestone by July.' Rex replies with a thank-you and a milestone update." },
        ],
        impact: [
          { char: "vera", text: "EQUIP graduates are flagged in the talent pool. Vera notices Rex's funded venture — a founder to watch as a future hiring partner." },
          { char: "max",  text: "Max's approval fires a notification to Rex and increments the funded-YTD counter in the EQUIP overview dashboard." },
        ],
        liveLink: "/equip",
        liveLinkLabel: "Open EQUIP hub",
      },
    },
  },

  // ── VERA — Velociraptor — Employer ────────────────────────────────────────
  {
    key: "vera",
    name: "Vera",
    species: "Velociraptor",
    role: "Employer",
    tagline: "Hiring manager at BioPharma Labs, hunting for lab-ready talent",
    phases: {
      engage: {
        available: false,
        reason: "Vera works in the employer portal — the trainee LMS is Rex's domain.",
        note: "Vera has one window into ENGAGE: the talent pool shows her Rex's completed courses and earned certificates. The training she never sees directly is what shapes every candidate she evaluates.",
      },
      experience: {
        available: true,
        screens: [
          { emoji: "📋", label: "My Postings",         detail: "Vera's active job listings in a clean board. Each card shows application count, AI match score distribution, and current pipeline health at a glance." },
          { emoji: "👥", label: "Application Pipeline", detail: "Kanban columns: Applied → Phone Screen → Technical → Offer → Hired. Drag a card to advance a stage — every move fires a candidate notification." },
          { emoji: "📊", label: "Candidate Scorecard", detail: "Rubric-based scoring: Technical (40 %), Communication (20 %), Culture (20 %), Potential (20 %). Multiple interviewers score independently; averages appear once everyone has submitted." },
          { emoji: "📨", label: "Offer Generator",     detail: "Vera selects a compensation template, sets start date and expiry, reviews the letter, and sends in one click. Rex sees it in his pipeline within seconds." },
        ],
        actions: [
          { step: 1, label: "Post 'Lab Automation Specialist'", detail: "Vera fills the role form: description, required skills (from the ontology), preferred skills, compensation band. Posting goes live immediately." },
          { step: 2, label: "Review Rex's application",         detail: "Match score 87 / 100. Vera reads Rex's pitch, watches his 58-second video, moves him from 'Applied' to 'Phone Screen'." },
          { step: 3, label: "Score the interview",              detail: "Vera's team submits scorecards post-screen. Rex scores 76 / 100. She advances him to 'Technical Interview', then to 'Offer'." },
          { step: 4, label: "Send offer & watch acceptance",    detail: "Vera generates a letter from the 'Senior Associate' template: $72 K, May 26 start, 7-day window. Sends. Watches Rex's status flip to 'Accepted'." },
        ],
        impact: [
          { char: "rex", text: "Every pipeline move triggers a Rex notification. The interview calendar invite lands in his scheduler the moment Vera sends it." },
          { char: "max", text: "Vera's activity feeds Max's employer analytics: pipeline velocity, stage conversion rates, time-to-hire by company." },
        ],
        liveLink: "/employer/postings",
        liveLinkLabel: "Open employer portal",
      },
      equip: {
        available: false,
        reason: "EQUIP is a trainee-facing funding programme — it backs Rex's ventures, not Vera's hiring.",
        note: "Vera's relationship with EQUIP is downstream: funded graduates like Rex often become her future hires, and may even return as hiring partners. EQUIP alumni are flagged in the talent pool so Vera can track promising founders.",
      },
    },
  },

  // ── MAX — Brachiosaurus — Admin ───────────────────────────────────────────
  {
    key: "max",
    name: "Max",
    species: "Brachiosaurus",
    role: "Admin",
    tagline: "Platform director, overseeing the whole ecosystem from 30,000 feet",
    phases: {
      engage: {
        available: true,
        screens: [
          { emoji: "📚", label: "Course Manager",       detail: "Max publishes all courses: module order, quiz weights, cohort size, enrolment window, publish/draft toggle. Single source of truth for the catalogue." },
          { emoji: "👥", label: "Cohort Dashboard",     detail: "Live view of every active cohort: enrolled count, completion rate, average quiz score, last-active timestamp, and stalled-learner alerts — all in one panel." },
          { emoji: "🎯", label: "Pathway Editor",       detail: "Visual drag-and-drop builder for learning pathways. Set prerequisite gates, assign credential weights, and control which cohorts see which tracks." },
          { emoji: "📊", label: "Engagement Analytics", detail: "Heatmaps of daily active learners, module drop-off points, time-in-platform by cohort, and quiz score distributions. Export as CSV at any time." },
        ],
        actions: [
          { step: 1, label: "Launch a new cohort",        detail: "Max creates 'Bioreactor Masters — June 2026'. Sets enrolment window (May 28–Jun 3), assigns two instructors, configures the certificate template." },
          { step: 2, label: "Monitor cohort health",      detail: "8/12 learners are on track. Two are stalled at Module 3. Max fires a personal nudge — it lands in their notification inbox within seconds." },
          { step: 3, label: "Re-issue a certificate",     detail: "One learner completed the quiz but the cert failed to generate. Max selects the learner and re-issues in two clicks. The cert arrives under a second later." },
          { step: 4, label: "Adjust a quiz threshold",    detail: "60 % of learners found Module 3 too easy. Max raises the pass threshold to 75 %. Learners who scraped by get a re-attempt notification retroactively." },
        ],
        impact: [
          { char: "rex",  text: "Max's cohort nudges land in Rex's notification inbox. New cohorts Max launches appear in Rex's course discovery feed." },
          { char: "vera", text: "Better-trained cohorts produce stronger candidate pools — Vera's match scores trend upward when Max runs the platform well." },
        ],
        liveLink: "/admin/courses",
        liveLinkLabel: "Open course manager",
      },
      experience: {
        available: true,
        screens: [
          { emoji: "⚖️", label: "Matching Engine",    detail: "Configure the AI scorer: cosine cutoff, subscore weights (skills 40 %, experience 30 %, culture 20 %, location 10 %), and band thresholds. Scores recalculate live on save." },
          { emoji: "🔀", label: "Split View",          detail: "Rex's trainee dashboard on the left, Vera's employer portal on the right — simultaneously. See how a config change lands on both roles without swapping seats." },
          { emoji: "📬", label: "Employer Invites",    detail: "Generate magic invite links for new employers. Track open rate, revoke anytime. Vera's BioPharma Labs account started life as one of these links." },
          { emoji: "📊", label: "Placement Funnel",    detail: "Applications → Shortlisted → Interviewed → Offered → Placed, with conversion rates by cohort and employer. The June cohort sits at 34 % offer rate — strongest this year." },
        ],
        actions: [
          { step: 1, label: "Tune matching weights",            detail: "Max increases the 'skills' weight from 35 % to 40 % after noticing skills-gap mismatches in Q1. All active match scores recalculate in real time." },
          { step: 2, label: "Preview Rex ↔ Vera fit",           detail: "In the live tester: Rex as candidate, Vera's posting as target. Score: 87. Max nudges one weight — score jumps to 91. He saves the new config." },
          { step: 3, label: "Invite a new employer",            detail: "Max generates a magic link for a new biotech startup. They onboard via the link — a full employer account is live in under 5 minutes." },
          { step: 4, label: "Review pipeline health",           detail: "June cohort funnel: 34 % offer rate, 91 % acceptance, 18-day average time-to-hire. Max notes the figures for the quarterly board update." },
        ],
        impact: [
          { char: "rex",  text: "Tuned weights surface Vera's posting higher in Rex's job board — AI score climbs from 87 to 91 after Max's config change." },
          { char: "vera", text: "Higher-quality matches land in Vera's pipeline — less noise, more relevant applicants arriving each week." },
        ],
        liveLink: "/admin/matching-config",
        liveLinkLabel: "Open matching engine",
      },
      equip: {
        available: true,
        screens: [
          { emoji: "📊", label: "EQUIP Overview",   detail: "Programme dashboard: apps in flight, approved this quarter, $ funded year-to-date, stalled-app alerts, open windows, and a live activity feed." },
          { emoji: "📥", label: "Review Queue",      detail: "Claim applications to prevent double-reviews. Approve or reject with a note, set the funded amount (capped per stream), mark as funded. Full audit trail." },
          { emoji: "📅", label: "Deadline Manager",  detail: "Open/close VentureConnect (monthly) and VentureLift (quarterly) windows. Extend a deadline with a reason. Late submissions are automatically blocked." },
          { emoji: "👥", label: "Committee Roster",  detail: "EQUIP Review Committee members get queue access without holding an admin role. Max manages membership — add or remove in seconds." },
        ],
        actions: [
          { step: 1, label: "Open the June VentureConnect window", detail: "Max sets dates (Jun 1–30), funding cap ($50 K total), and flips the window live. Rex sees the open window on his EQUIP home immediately." },
          { step: 2, label: "Claim Rex's application",              detail: "Max takes ownership in the review queue, preventing a colleague from simultaneously reviewing the same submission." },
          { step: 3, label: "Review + approve",                     detail: "Max reads Rex's plan, scores the milestones, sets the funded amount to $4,500 (under $5 K cap), and writes a decision note for Rex to read." },
          { step: 4, label: "Track the funded cohort",              detail: "Funded-YTD increments by $4,500. Rex's venture appears in the 'Active funded ventures' panel — Max can track milestone progress from here." },
        ],
        impact: [
          { char: "rex",  text: "Rex receives an email: 'Your VentureConnect application has been approved — $4,500 awarded.' His status card updates with Max's full note." },
          { char: "vera", text: "Rex's funded venture is flagged in the talent pool. Vera notes him as a founder to watch — perhaps a future hiring partner." },
        ],
        liveLink: "/admin/equip/overview",
        liveLinkLabel: "Open EQUIP overview",
      },
    },
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function DemoHub() {
  const [activeChar,  setActiveChar]  = useState<CharKey>("rex");
  const [activePhase, setActivePhase] = useState<PhaseKey>("engage");
  const { startTour } = useDemoTour();

  const character    = CHARACTERS.find((c) => c.key === activeChar)!;
  const phaseContent = character.phases[activePhase];
  const phaseCfg     = PHASES.find((p) => p.key === activePhase)!;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
      {/* Pixel-dino animations (idle bob, tail wag, blink) — injected once
          for the whole hub so every sprite picks them up. */}
      <style dangerouslySetInnerHTML={{ __html: PIXEL_DINO_STYLE }} />

      {/* ── Journey overview ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {PHASES.map((phase, i) => (
          <div key={phase.key} className="flex items-center gap-3">
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold", phase.bg, phase.text)}>
              <phase.Icon size={12} />
              {phase.label}
              <span className="opacity-60 font-normal">— {phase.subtitle}</span>
            </div>
            {i < PHASES.length - 1 && (
              <span className="text-subtle text-sm">→</span>
            )}
          </div>
        ))}
      </div>

      {/* ── Character selector ───────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-subtle mb-3">
          Choose a persona
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CHARACTERS.map((char) => {
            const DinoSVG = DINO_SVG[char.key];
            const cs      = CHAR_STYLE[char.key];
            const isActive = activeChar === char.key;
            return (
              <button
                key={char.key}
                onClick={() => setActiveChar(char.key)}
                className={cn(
                  "dino-card relative text-left p-5 rounded-2xl border-2 transition-all duration-200 w-full group",
                  isActive
                    ? cn("border-transparent ring-2", cs.ring, cs.bg)
                    : "border-line bg-card hover:border-line-strong hover:shadow-sm",
                )}
              >
                {/* Showcase stage — like a fighter-select roster. The dino
                    bobs idle; tail wags; eyes blink every few seconds. The
                    floor is a soft elliptical shadow that hints at depth. */}
                <div
                  className={cn(
                    "relative flex justify-center items-end mb-3 h-36 rounded-xl overflow-hidden ring-1 ring-inset",
                    isActive ? cn(cs.bg, "ring-transparent") : "bg-elevated/40 ring-line/60",
                  )}
                >
                  {/* Floor shadow — sits under the sprite */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute bottom-3 left-1/2 -translate-x-1/2 h-2 w-20 rounded-full blur-[2px] opacity-40",
                      cs.dot,
                    )}
                  />
                  <DinoSVG
                    className={cn(
                      "relative w-32 h-32 transition-transform duration-200",
                      cs.svgText,
                      isActive ? "scale-110" : "group-hover:scale-105",
                    )}
                  />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base text-fg">{char.name}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cs.badge)}>
                    {char.role}
                  </span>
                </div>
                <p className="text-xs text-subtle italic mb-1">{char.species}</p>
                <p className="text-xs text-muted leading-relaxed">{char.tagline}</p>
                {/* Phase availability dots */}
                <div className="flex gap-1.5 mt-3">
                  {PHASES.map((phase) => (
                    <div
                      key={phase.key}
                      title={`${phase.label}: ${char.phases[phase.key].available ? "available" : "not applicable"}`}
                      className={cn(
                        "w-2 h-2 rounded-full transition-opacity",
                        char.phases[phase.key].available ? phase.dot : "bg-line opacity-60"
                      )}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Phase selector ───────────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-subtle mb-3">
          Platform pillar
        </p>
        <div className="flex gap-2 flex-wrap">
          {PHASES.map((phase) => {
            const isActive = activePhase === phase.key;
            return (
              <button
                key={phase.key}
                onClick={() => setActivePhase(phase.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                  isActive
                    ? cn(phase.bg, phase.text, "ring-2", phase.ring)
                    : "bg-card text-muted ring-1 ring-inset ring-line hover:bg-elevated"
                )}
              >
                <phase.Icon size={14} />
                {phase.label}
                <span className={cn("text-xs font-normal", isActive ? "opacity-70" : "opacity-50")}>
                  {phase.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Content panel ────────────────────────────────────────── */}
      <section>
        {phaseContent.available ? (
          <AvailablePanel
            content={phaseContent}
            character={character}
            phaseCfg={phaseCfg}
            onStartTour={() => startTour(activeChar as TourPersona, activePhase as TourPhase)}
          />
        ) : (
          <BlockedPanel content={phaseContent} />
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BlockedPanel({ content }: { content: PhaseBlocked }) {
  return (
    <div className="rounded-2xl p-8 border border-dashed border-line bg-card flex flex-col items-center text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center">
        <Lock size={20} className="text-muted" />
      </div>
      <div className="max-w-sm">
        <p className="font-semibold text-fg mb-2">{content.reason}</p>
        <p className="text-sm text-muted leading-relaxed">{content.note}</p>
      </div>
    </div>
  );
}

function AvailablePanel({
  content,
  character,
  phaseCfg,
  onStartTour,
}: {
  content: PhaseAvailable;
  character: Character;
  phaseCfg: (typeof PHASES)[number];
  onStartTour: () => void;
}) {
  const cs = CHAR_STYLE[character.key];

  return (
    <div className="space-y-6">

      {/* Screens */}
      <div>
        <h3 className={cn("text-sm font-semibold mb-3 flex items-center gap-1.5", cs.text)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", cs.dot)} />
          What {character.name} sees in {phaseCfg.label}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {content.screens.map((screen) => (
            <div key={screen.label} className="rounded-xl p-4 bg-elevated border border-line">
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5">{screen.emoji}</span>
                <div>
                  <p className="font-semibold text-sm text-fg">{screen.label}</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{screen.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>
        <h3 className={cn("text-sm font-semibold mb-3 flex items-center gap-1.5", cs.text)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", cs.dot)} />
          What {character.name} does
        </h3>
        <div className="space-y-2">
          {content.actions.map((action) => (
            <div key={action.step} className="flex items-start gap-3 rounded-xl p-4 bg-elevated border border-line">
              <span className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                cs.badge
              )}>
                {action.step}
              </span>
              <div>
                <p className="font-semibold text-sm text-fg">{action.label}</p>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{action.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-role impact */}
      <div>
        <h3 className={cn("text-sm font-semibold mb-3 flex items-center gap-1.5", phaseCfg.text)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", phaseCfg.dot)} />
          How this ripples to others
        </h3>
        <div className="space-y-2">
          {content.impact.map((imp) => {
            const impChar = CHARACTERS.find((c) => c.key === imp.char)!;
            const impCs   = CHAR_STYLE[imp.char];
            return (
              <div key={imp.char} className="flex items-start gap-3 rounded-xl p-3 bg-elevated border border-line">
                <span className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  impCs.badge
                )}>
                  {CHAR_INITIAL[imp.char]}
                </span>
                <div>
                  <span className={cn("text-xs font-semibold", impCs.text)}>
                    {impChar.name} ({impChar.role})
                  </span>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{imp.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTAs — guided tour launcher + direct live link */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-line">
        {/* Primary: guided tour */}
        <button
          onClick={onStartTour}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all",
            "shadow-sm hover:shadow-md active:scale-95",
            cs.badge,
            "hover:opacity-90",
          )}
        >
          <Play size={13} className="fill-current" />
          Watch Guided Tour
        </button>

        {/* Secondary: jump to live page */}
        <Link
          href={content.liveLink}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            "ring-1 ring-inset hover:shadow-sm text-muted hover:text-fg",
            phaseCfg.ctaRing,
          )}
        >
          {content.liveLinkLabel}
          <ExternalLink size={12} />
        </Link>
      </div>

    </div>
  );
}
