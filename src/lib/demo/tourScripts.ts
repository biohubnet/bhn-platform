/**
 * Tour scripts for the guided demo walkthrough.
 *
 * Layout assumptions (1440 px wide, 900 px tall):
 *   Sidebar:       0 – 16.7 % of viewport width (~240 px)
 *   Content area: 16.7 % – 100 % of viewport width
 *   Hero:          0 – 20 % of viewport height
 *   Cards/content: 20 % – 100 % of viewport height
 *
 * All spotlight and cursor coordinates are viewport-percentage based
 * so they work at different screen sizes without recalculation.
 */

// ─── Public types (re-exported for DemoOverlay + DemoHub) ─────────────────────

export type TourPersona = "rex"  | "vera" | "max";
export type TourPhase   = "engage" | "experience" | "equip";

export interface SpotlightRegion {
  xPct:    number;  // left %
  yPct:    number;  // top %
  wPct:    number;  // width %
  hPct:    number;  // height %
  radius?: number;  // border-radius px (default 12)
}

export interface CursorTarget {
  xPct:   number;
  yPct:   number;
  click?: boolean;  // show click ripple after arriving
}

export interface TourStep {
  page:      string | null;     // route to navigate to (null = stay)
  spotlight: SpotlightRegion;
  cursor:    CursorTarget;
  title:     string;
  body:      string;
  autoMs?:   number;            // auto-advance after N ms (0 = manual)
}

export interface TourScript {
  persona: TourPersona;
  phase:   TourPhase;
  steps:   TourStep[];
}

// ─── Reusable regions ─────────────────────────────────────────────────────────

const R = {
  fullPage:    { xPct: 17, yPct: 0,  wPct: 83, hPct: 100, radius: 0  },
  hero:        { xPct: 17, yPct: 3,  wPct: 82, hPct: 18,  radius: 12 },
  content:     { xPct: 17, yPct: 22, wPct: 82, hPct: 72,  radius: 12 },
  cardGrid:    { xPct: 18, yPct: 25, wPct: 74, hPct: 56,  radius: 12 },
  card1:       { xPct: 18, yPct: 25, wPct: 24, hPct: 28,  radius: 12 },
  card2:       { xPct: 44, yPct: 25, wPct: 24, hPct: 28,  radius: 12 },
  pipeline:    { xPct: 17, yPct: 22, wPct: 82, hPct: 62,  radius: 12 },
  topStrip:    { xPct: 17, yPct: 22, wPct: 82, hPct: 32,  radius: 12 },
  configL:     { xPct: 17, yPct: 22, wPct: 44, hPct: 54,  radius: 12 },
  sidebar:     { xPct: 1,  yPct: 8,  wPct: 15, hPct: 78,  radius: 8  },
} satisfies Record<string, SpotlightRegion>;

// ─── Reusable cursor positions ────────────────────────────────────────────────

const C = {
  center:     { xPct: 57, yPct: 50 },
  heroMid:    { xPct: 57, yPct: 12 },
  card1:      { xPct: 29, yPct: 39 },
  card1Click: { xPct: 33, yPct: 47, click: true },
  card2:      { xPct: 55, yPct: 39 },
  topLeft:    { xPct: 30, yPct: 32 },
  topRight:   { xPct: 80, yPct: 32 },
  mid:        { xPct: 55, yPct: 43 },
  midClick:   { xPct: 45, yPct: 43, click: true },
  pipelineOp: { xPct: 42, yPct: 48, click: true },
  sliderLeft: { xPct: 36, yPct: 44 },
  testerBtn:  { xPct: 74, yPct: 40, click: true },
  inviteBtn:  { xPct: 72, yPct: 38, click: true },
  queueClaim: { xPct: 43, yPct: 38, click: true },
  sidebarNav: { xPct: 8,  yPct: 35, click: true },
} satisfies Record<string, CursorTarget>;

// ─── Tour scripts ─────────────────────────────────────────────────────────────

export const TOUR_SCRIPTS: TourScript[] = [

  // ══════════════════════════════════════════════════════════════════
  //  REX (Triceratops · Trainee)
  // ══════════════════════════════════════════════════════════════════

  {
    persona: "rex",
    phase: "engage",
    steps: [
      {
        page: "/dashboard",
        spotlight: R.fullPage,
        cursor: C.heroMid,
        title: "Rex's Training Dashboard",
        body: "The moment Rex logs in, he lands here. Active courses, recent certificates, upcoming cohort events, streak badges, and AI-suggested next steps are all visible at a glance — no hunting required.",
      },
      {
        page: "/courses",
        spotlight: R.cardGrid,
        cursor: C.card1,
        title: "Course Library — 40+ Modules",
        body: "Rex browses the full catalogue. Each card shows a personalised AI match score, the skill tags it covers, and the issuing certificate. Filter by pathway, skill gap, or certification level.",
      },
      {
        page: null,
        spotlight: R.card1,
        cursor: C.card1Click,
        title: "One-Click Enrolment",
        body: "Rex clicks the 'Bioreactor Fundamentals' card to preview the module breakdown, then clicks Enrol. He's added to the June cohort and Module 1 unlocks instantly — no admin approval step.",
      },
      {
        page: "/pathways",
        spotlight: R.content,
        cursor: C.mid,
        title: "Learning Pathway Tracker",
        body: "A visual milestone track built from Rex's intake assessment. Completed milestones glow green. The system auto-recommends the course that fills the next skill gap, keeping Rex moving in the right direction.",
      },
      {
        page: "/certificates",
        spotlight: R.content,
        cursor: C.topLeft,
        title: "Certificate Wall — Verified Credentials",
        body: "Every completed module issues a timestamped, verifiable credential. These auto-attach to Rex's talent-pool profile — Vera can see the newest certificate within seconds of it being issued.",
      },
    ],
  },

  {
    persona: "rex",
    phase: "experience",
    steps: [
      {
        page: "/jobs",
        spotlight: R.content,
        cursor: C.topLeft,
        title: "Public Job Board",
        body: "Rex browses live postings matched to his verified skills. An AI match score (0–100) appears on each card — click 'Why this score?' to see exactly which skills and credentials drove the match.",
      },
      {
        page: null,
        spotlight: R.card1,
        cursor: C.card1,
        title: "87 / 100 Match — Vera's Posting",
        body: "'Lab Automation Specialist' at BioPharma Labs. Rex sees 4 of 5 required skills verified, one preferred skill match, and the note: 'Your Bioreactor Fundamentals cert is a strong signal for this role.'",
      },
      {
        page: "/profile/application",
        spotlight: R.content,
        cursor: C.midClick,
        title: "Application Builder",
        body: "One structured form: resume picker (pulled from Rex's master library), 60-second video upload, 300-char elevator pitch, and 3 skill tags. Rex's AI-tailored draft is pre-populated — the whole thing takes under 10 minutes.",
      },
      {
        page: "/profile/applications",
        spotlight: R.pipeline,
        cursor: C.pipelineOp,
        title: "Live Application Pipeline",
        body: "Rex's Kanban tracks every application. Vera just moved him from 'Applied' to 'Phone Screen' — the notification fires in real time, an interview slot appears, and Rex books Tuesday 10am in one click.",
      },
    ],
  },

  {
    persona: "rex",
    phase: "equip",
    steps: [
      {
        page: "/equip",
        spotlight: R.content,
        cursor: C.topLeft,
        title: "EQUIP Funding Hub",
        body: "Rex discovers two venture streams: VentureConnect (≤ $5K, monthly window) and VentureLift (≤ $25K, quarterly). Each card shows the open window, days remaining, and total committed this cycle.",
      },
      {
        page: null,
        spotlight: R.card1,
        cursor: C.card1Click,
        title: "VentureConnect — 3 Days Left",
        body: "Rex clicks 'Apply'. The form opens: venture description, team members, 90-day milestone plan, budget breakdown, and pitch deck upload. Auto-saves every 30 seconds so no progress is lost.",
      },
      {
        page: "/equip/my-applications",
        spotlight: R.topStrip,
        cursor: C.mid,
        title: "Live Status Tracker",
        body: "Rex's application shows 'Under Review'. When Max approves, the card flips to 'Approved — $4,500 awarded' with the full decision note. No black boxes — Rex sees exactly why the decision was made.",
      },
      {
        page: null,
        spotlight: R.content,
        cursor: C.center,
        title: "Funded Cohort Gallery",
        body: "Rex reads past winners' plans for inspiration and tracks the total capital deployed this year. EQUIP graduates are flagged in the talent pool as founder-track alumni — a signal Vera will see when she next browses candidates.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  //  VERA (Velociraptor · Employer)
  // ══════════════════════════════════════════════════════════════════

  {
    persona: "vera",
    phase: "experience",
    steps: [
      {
        page: "/employer/postings",
        spotlight: R.cardGrid,
        cursor: C.card1,
        title: "My Postings Board",
        body: "Vera manages open roles from a clean board. Each card shows application count, AI match score distribution, and pipeline stage summary. Her 'Lab Automation Specialist' has 12 applicants this week.",
      },
      {
        page: null,
        spotlight: R.card1,
        cursor: C.pipelineOp,
        title: "Application Pipeline — One Card Drag",
        body: "Vera drags Rex's card from 'Applied' to 'Phone Screen'. The move fires Rex a notification instantly, opens an interview scheduling widget, and logs the stage change in the full audit trail.",
      },
      {
        page: "/talent-pool",
        spotlight: R.content,
        cursor: C.mid,
        title: "Talent Pool — Proactive Discovery",
        body: "Vera can also browse the full BHN pool, sorted by AI match score to her active postings. Rex's profile shows completed courses, verified skills, and his latest certificates — all earned in ENGAGE.",
      },
      {
        page: "/employer/postings",
        spotlight: R.topStrip,
        cursor: C.topRight,
        title: "Hiring Analytics",
        body: "Vera's pipeline funnel: 12 applicants → 5 shortlisted → 2 offers → 1 accepted. Time-to-hire: 19 days. Offer acceptance rate: 100%. All exportable as CSV for her quarterly talent report.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  //  MAX (Brachiosaurus · Admin)
  // ══════════════════════════════════════════════════════════════════

  {
    persona: "max",
    phase: "engage",
    steps: [
      {
        page: "/admin",
        spotlight: R.fullPage,
        cursor: C.heroMid,
        title: "Admin Overview",
        body: "Max lands here to read platform health at a glance: active learners today, certificates issued this week, courses in progress, and cohort health scores — all without drilling into individual reports.",
      },
      {
        page: "/admin/courses",
        spotlight: R.content,
        cursor: C.midClick,
        title: "Course Manager",
        body: "Max publishes, configures, and retires courses from this single view. Clicking a course opens the full editor: module order, quiz weights, enrolment windows, cohort size, and certificate templates.",
      },
      {
        page: "/admin/enrollments",
        spotlight: R.content,
        cursor: C.mid,
        title: "Live Cohort Dashboard",
        body: "Real-time view of every active cohort: enrolled count, completion rate, average quiz score, and last-active timestamp. Stalled-learner alerts fire when someone hasn't engaged in 5+ days — Max fires a personal nudge from here.",
      },
      {
        page: "/admin/certificates",
        spotlight: R.content,
        cursor: C.topLeft,
        title: "Certificate Issuance & Revocation",
        body: "Max views all issued credentials, revokes a cert by SHA hash, or manually re-issues when auto-generation fails. Every certificate action is logged with a timestamp and admin ID — full audit trail.",
      },
    ],
  },

  {
    persona: "max",
    phase: "experience",
    steps: [
      {
        page: "/admin/matching-config",
        spotlight: R.configL,
        cursor: C.sliderLeft,
        title: "AI Matching Engine",
        body: "Max tunes the AI scorer: skills weight, experience weight, culture alignment, cosine cutoff, and band thresholds. Every saved change recalculates all active match scores live. A preview panel shows impact before committing.",
      },
      {
        page: null,
        spotlight: R.topStrip,
        cursor: C.testerBtn,
        title: "Live Match Tester",
        body: "Max selects Rex as candidate and Vera's posting as target — score 87. He nudges the skills weight from 35% to 40% and watches the score jump to 91. He saves the config; all scores update instantly platform-wide.",
      },
      {
        page: "/admin/employer-invites",
        spotlight: R.content,
        cursor: C.inviteBtn,
        title: "Employer Invites",
        body: "Max generates a magic invite link for a new biotech startup. They onboard in under 5 minutes — no manual account creation needed. Vera's BioPharma Labs account started with one of these links 6 months ago.",
      },
    ],
  },

  {
    persona: "max",
    phase: "equip",
    steps: [
      {
        page: "/admin/equip/overview",
        spotlight: R.content,
        cursor: C.topLeft,
        title: "EQUIP Programme Dashboard",
        body: "Applications in flight, approved this quarter, $ funded year-to-date, stalled-app alerts, open funding windows, and a live activity feed. Max checks this dashboard before every board meeting.",
      },
      {
        page: "/admin/equip",
        spotlight: R.content,
        cursor: C.queueClaim,
        title: "Review Queue — Claim & Decide",
        body: "Max clicks 'Claim' on Rex's application to prevent duplicate reviews. He reads the plan, scores the milestones, sets the funded amount to $4,500 (under the $5K VentureConnect cap), and writes a decision note Rex will see in full.",
      },
      {
        page: "/admin/equip/deadlines",
        spotlight: R.content,
        cursor: C.mid,
        title: "Deadline Manager — Open Windows",
        body: "Max opens the June VentureConnect window with a $50K total cap. One click makes it live — Rex sees the open window on his EQUIP home immediately. Late submissions past the deadline are automatically blocked.",
      },
      {
        page: "/admin/equip/overview",
        spotlight: R.content,
        cursor: C.center,
        title: "Funded Cohort Tracking",
        body: "Rex's venture now appears in the 'Active funded ventures' panel. The funded-YTD counter increments by $4,500. Max tracks milestone progress here and can flag stalled grantees for follow-up.",
      },
    ],
  },
];
