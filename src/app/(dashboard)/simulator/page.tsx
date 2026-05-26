/**
 * Role-play simulator — landing page.
 *
 * Editorial hero + three-step value prop + recent attempts (active and
 * completed). Empty state offers a clear single CTA.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Hourglass,
  Play,
  Theater,
  XCircle,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { CatalogPlayButton } from "@/components/simulator/CatalogPlayButton";

export const dynamic = "force-dynamic";

export default async function SimulatorLandingPage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  const userId = (session.user as { id?: string }).id!;

  const [attempts, requests, catalog] = await Promise.all([
    prisma.simulationAttempt.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        simulation: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            location: true,
          },
        },
      },
    }),
    prisma.simulationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        sourceUrl: true,
        jdBody: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        updatedAt: true,
        simulation: {
          select: { id: true, jobTitle: true, companyName: true },
        },
      },
    }).catch(() => []),
    // ── Catalog: every published Simulation, browseable by every
    // signed-in user. Decoupled from who originally requested it —
    // once a Simulation row exists, it's platform content, and any
    // user can launch their own Attempt against it. The catalog is
    // what makes "all already-created sims visible to everyone" true.
    prisma.simulation.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        location: true,
        jdSnippet: true,
        createdAt: true,
      },
    }).catch(() => []),
  ]);

  const active = attempts.filter((a) => !a.finished);
  const finished = attempts.filter((a) => a.finished);
  // Only show non-ready statuses here — ready requests are already
  // surfaced via the auto-created Attempt in "In progress" above.
  const openRequests = requests.filter((r) => r.status !== "ready");

  // For each catalog item, work out the calling user's relationship
  // to it so the CTA reads correctly: "Resume" if they have an
  // unfinished attempt, "Replay" if they have a finished one,
  // otherwise "Start".
  const activeAttemptBySimId = new Map<string, string>();
  const finishedAttemptBySimId = new Map<string, string>();
  for (const a of attempts) {
    const simId = a.simulation.id;
    if (!a.finished && !activeAttemptBySimId.has(simId)) {
      activeAttemptBySimId.set(simId, a.id);
    } else if (a.finished && !finishedAttemptBySimId.has(simId)) {
      finishedAttemptBySimId.set(simId, a.id);
    }
  }

  return (
    <div className="space-y-10 pb-12">
      <Hero hasAttempts={attempts.length > 0} />

      {/* CATALOG — every published Simulation, browseable by every
          signed-in user. Sits above active attempts so newcomers
          (zero attempts of their own) see something to play
          immediately; returning users see what's been added since
          their last visit and can replay anything they've already
          finished. */}
      {catalog.length > 0 && (
        <section>
          <SectionHeading
            label="Available simulations"
            count={catalog.length}
            hint="Built by the team — start or replay anyone"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((sim) => (
              <CatalogCard
                key={sim.id}
                sim={sim}
                activeAttemptId={activeAttemptBySimId.get(sim.id) ?? null}
                finishedAttemptId={finishedAttemptBySimId.get(sim.id) ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {openRequests.length > 0 && (
        <section>
          <SectionHeading
            label="Requested"
            count={openRequests.length}
            hint="Awaiting admin review or generation"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {openRequests.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <SectionHeading
            label="In progress"
            count={active.length}
            hint="Pick up where you left off"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((a) => (
              <AttemptCard key={a.id} attempt={a} kind="active" />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <SectionHeading
            label="Completed"
            count={finished.length}
            hint="Replay with different choices"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {finished.map((a) => (
              <AttemptCard key={a.id} attempt={a} kind="finished" />
            ))}
          </div>
        </section>
      )}

      {/* HowItWorks fires only when there's truly nothing to show —
          no attempts AND no catalog AND no requests. With the catalog
          fetch in place, this is now the "fresh DB" case, not the
          "new user" case. */}
      {attempts.length === 0 && catalog.length === 0 && openRequests.length === 0 && <HowItWorks />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Catalog card — one per published Simulation
// ────────────────────────────────────────────────────────────────────

type CatalogSim = {
  id: string;
  jobTitle: string;
  companyName: string | null;
  location: string | null;
  jdSnippet: string;
  createdAt: Date;
};

function CatalogCard({
  sim,
  activeAttemptId,
  finishedAttemptId,
}: {
  sim: CatalogSim;
  activeAttemptId: string | null;
  finishedAttemptId: string | null;
}) {
  // CTA precedence: resume > replay > start. Resume jumps the user
  // straight to their unfinished week; Replay launches a brand-new
  // attempt; Start (no prior attempt) also launches a new attempt.
  return (
    <Card className="relative flex h-full flex-col p-5">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <Theater className="h-3.5 w-3.5 text-fg-subtle" />
        <span className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg-subtle">
          RPG · 12 weeks
        </span>
      </div>
      <h3
        className="mb-1 text-[16px] font-medium leading-[1.25] tracking-tight text-fg line-clamp-2"
        style={{ fontFamily: "var(--font-display-theme, inherit)" }}
      >
        {sim.jobTitle}
      </h3>
      {(sim.companyName || sim.location) && (
        <p className="text-[12.5px] text-fg-muted">
          {sim.companyName}
          {sim.companyName && sim.location && " · "}
          {sim.location}
        </p>
      )}
      {sim.jdSnippet && (
        <p className="mt-3 text-[11.5px] leading-relaxed text-fg-muted line-clamp-3">
          {sim.jdSnippet}
        </p>
      )}

      <div className="mt-auto pt-4 flex items-center justify-between gap-3">
        {activeAttemptId ? (
          // Already in progress → Resume link, no new Attempt needed
          <Link
            href={`/simulator/${activeAttemptId}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-700"
          >
            <Play className="h-3.5 w-3.5" /> Resume
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : (
          <CatalogPlayButton
            simulationId={sim.id}
            label={finishedAttemptId ? "Replay" : "Start"}
          />
        )}
        {finishedAttemptId && !activeAttemptId && (
          <Link
            href={`/simulator/${finishedAttemptId}`}
            className="text-[11.5px] text-fg-subtle hover:text-fg"
          >
            Review last run →
          </Link>
        )}
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────────

function Hero({ hasAttempts }: { hasAttempts: boolean }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-line/70 bg-card-solid overflow-hidden">
      <div className="grid gap-10 px-6 py-10 md:grid-cols-[1.4fr_1fr] md:px-10 md:py-14 lg:gap-14">
        <div className="max-w-2xl">
          <div className="mb-3 text-[12px] text-fg-subtle">
            RPG · role-play game
          </div>
          <h1
            className="mb-5 text-[38px] font-semibold leading-[1.05] tracking-tight text-fg md:text-[48px]"
            style={{ fontFamily: "var(--font-display-theme, inherit)" }}
          >
            Meet the colleagues you don&apos;t have yet.
          </h1>
          <p className="max-w-xl text-[15px] leading-[1.7] text-fg-muted md:text-[16px]">
            Paste a job description. We&apos;ll build the twelve weeks that
            follow — the team you&apos;d work with, the meetings that
            actually bite, the politics nobody put in the JD, and the
            9pm message from the person who hired you. Every decision
            moves five stats. Try the thing you&apos;d never risk at
            work.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/simulator/new"
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-brand-700"
            >
              {hasAttempts ? "Request a new simulation" : "Request your first simulation"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-[12px] text-fg-subtle">
              Built by hand, usually within 24 hours.
            </span>
          </div>
        </div>

        <div className="hidden md:flex md:items-center md:justify-center">
          <FaceoffGraphic />
        </div>
      </div>
    </section>
  );
}

/**
 * Three-character faceoff illustration — the heart of the hero on
 * /simulator. Captures the dark-comic premise of the sim: you, the
 * teammate who's seen this before, and the person you report to.
 * Each character has a public speech bubble + a smaller parenthetical
 * "what they're actually thinking" line in italics underneath.
 *
 * Pure inline SVG — no image assets, deterministic across themes,
 * and uses currentColor for the body fills so the brand/violet/amber
 * palette stays theme-aware. Decorative — aria-hidden + screen
 * readers get the textual hero copy above.
 */
function FaceoffGraphic() {
  return (
    <div
      className="grid w-full max-w-[460px] grid-cols-3 gap-3"
      aria-hidden
    >
      <FaceoffPanel
        accent="brand"
        publicLine="I&rsquo;ve got this."
        privateLine="(...what week is the QBR)"
      >
        <CharYou />
      </FaceoffPanel>

      <FaceoffPanel
        accent="violet"
        publicLine="Welcome aboard!"
        privateLine="(...not another one)"
      >
        <CharTeammate />
      </FaceoffPanel>

      <FaceoffPanel
        accent="amber"
        publicLine="Take your time settling in."
        privateLine="(Sunday-night reads continue)"
      >
        <CharBoss />
      </FaceoffPanel>
    </div>
  );
}

function FaceoffPanel({
  accent,
  publicLine,
  privateLine,
  children,
}: {
  accent: "brand" | "violet" | "amber";
  publicLine: string;
  privateLine: string;
  children: React.ReactNode;
}) {
  const accentMap = {
    brand:
      "bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-900/30 dark:text-brand-100",
    violet:
      "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-100",
    amber:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-100",
  };
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-raised/30 ring-1 ring-inset ring-line">
        {children}
      </div>
      <div
        className={`relative w-full rounded-xl px-2.5 py-2 text-[11px] font-semibold leading-snug ring-1 ring-inset ${accentMap[accent]}`}
        dangerouslySetInnerHTML={{ __html: `&ldquo;${publicLine}&rdquo;` }}
      />
      <p className="mt-1.5 text-[10px] italic leading-snug text-fg-subtle">
        {privateLine}
      </p>
    </div>
  );
}

/** YOU — the candidate. Wide eyes, faint sweat bead. */
function CharYou() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 text-brand-500">
      {/* shoulders */}
      <path
        d="M 8 60 Q 8 44 32 44 Q 56 44 56 60 Z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* neck */}
      <rect x="28" y="38" width="8" height="8" fill="currentColor" opacity="0.7" />
      {/* head */}
      <circle cx="32" cy="26" r="15" fill="#fbe6cf" stroke="currentColor" strokeWidth="1.5" />
      {/* hair tuft */}
      <path d="M 19 18 Q 32 9 45 18 L 45 23 Q 32 18 19 23 Z" fill="#5e3a1a" />
      {/* eyes — wide */}
      <circle cx="27" cy="27" r="2" fill="#1a1a1a" />
      <circle cx="37" cy="27" r="2" fill="#1a1a1a" />
      <circle cx="27.5" cy="26.5" r="0.7" fill="white" />
      <circle cx="37.5" cy="26.5" r="0.7" fill="white" />
      {/* nervous smile */}
      <path d="M 27 33 Q 32 35 37 33" stroke="#1a1a1a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* sweat bead */}
      <path d="M 44 22 Q 46 18 48 22 Q 47 25 44 22 Z" fill="#7dd3fc" stroke="#0ea5e9" strokeWidth="0.6" />
    </svg>
  );
}

/** TEAMMATE — seen this movie before. Smirk + coffee. */
function CharTeammate() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 text-violet-500">
      {/* shoulders */}
      <path d="M 8 60 Q 8 44 32 44 Q 56 44 56 60 Z" fill="currentColor" opacity="0.85" />
      <rect x="28" y="38" width="8" height="8" fill="currentColor" opacity="0.7" />
      {/* head */}
      <circle cx="32" cy="26" r="15" fill="#f0d2b6" stroke="currentColor" strokeWidth="1.5" />
      {/* short side-part hair */}
      <path d="M 17 22 Q 19 13 32 12 Q 45 12 47 22 Q 46 18 38 17 Q 30 17 25 20 Q 21 22 17 22 Z" fill="#1f1f1f" />
      {/* eyes — half-lidded */}
      <path d="M 25 27 L 29 27" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 35 27 L 39 27" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
      {/* smirk — asymmetric */}
      <path d="M 27 33 Q 30 35 36 33 L 38 34" stroke="#1a1a1a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* coffee mug to side */}
      <rect x="46" y="34" width="9" height="9" rx="1.5" fill="#a78bfa" stroke="#5b21b6" strokeWidth="0.8" />
      <path d="M 55 36 Q 58 37 58 39 Q 58 41 55 41" stroke="#5b21b6" strokeWidth="0.8" fill="none" />
      {/* steam */}
      <path d="M 48 32 Q 49 30 50 32" stroke="#cbd5e1" strokeWidth="0.8" fill="none" />
      <path d="M 51 32 Q 52 30 53 32" stroke="#cbd5e1" strokeWidth="0.8" fill="none" />
    </svg>
  );
}

/** BOSS — the person you report to. Glasses, arched brow, clipboard. */
function CharBoss() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 text-amber-600">
      {/* shoulders */}
      <path d="M 8 60 Q 8 44 32 44 Q 56 44 56 60 Z" fill="currentColor" opacity="0.85" />
      <rect x="28" y="38" width="8" height="8" fill="currentColor" opacity="0.7" />
      {/* head */}
      <circle cx="32" cy="26" r="15" fill="#e8c5a0" stroke="currentColor" strokeWidth="1.5" />
      {/* slicked hair */}
      <path d="M 18 19 Q 22 11 32 11 Q 42 11 46 19 Q 36 16 28 16 Q 23 17 18 19 Z" fill="#2c1810" />
      {/* glasses */}
      <circle cx="26" cy="27" r="3.5" fill="none" stroke="#1a1a1a" strokeWidth="1.2" />
      <circle cx="38" cy="27" r="3.5" fill="none" stroke="#1a1a1a" strokeWidth="1.2" />
      <line x1="29.5" y1="27" x2="34.5" y2="27" stroke="#1a1a1a" strokeWidth="1.2" />
      {/* eyes through glasses */}
      <circle cx="26" cy="27" r="0.9" fill="#1a1a1a" />
      <circle cx="38" cy="27" r="0.9" fill="#1a1a1a" />
      {/* arched brow — left side raised */}
      <path d="M 22 21 Q 26 19 30 22" stroke="#1a1a1a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M 35 22 Q 38 21 42 22" stroke="#1a1a1a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {/* flat mouth */}
      <path d="M 28 34 L 36 34" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round" />
      {/* clipboard */}
      <rect x="46" y="32" width="9" height="13" rx="1" fill="#fef3c7" stroke="#92400e" strokeWidth="0.8" />
      <rect x="49" y="30.5" width="3" height="2.5" rx="0.5" fill="#92400e" />
      <line x1="48" y1="36" x2="53" y2="36" stroke="#92400e" strokeWidth="0.6" />
      <line x1="48" y1="39" x2="53" y2="39" stroke="#92400e" strokeWidth="0.6" />
      <line x1="48" y1="42" x2="52" y2="42" stroke="#92400e" strokeWidth="0.6" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────
// Empty state
// ────────────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: "01",
      label: "Paste the JD",
      body: "Drop the posting text into the box. No links — they expire, your sim doesn't. We read what you wrote, no cleanup needed.",
    },
    {
      n: "02",
      label: "We build your world",
      body: "Real-shaped people. Specific scenarios. A 12-week arc with the politics, the tradeoffs, and the colleague who keeps citing competitor data. Usually published to your dashboard within 24 hours.",
    },
    {
      n: "03",
      label: "Live the quarter",
      body: "Twelve weeks. Hover any choice to see how it moves your stats before you commit. State auto-saves so you can close the tab. End with a written performance review and a tier — Exceeds, Meets, or “HR has been looped in.”",
    },
  ];

  return (
    <section>
      <SectionHeading
        label="How it works"
        hint="Three steps from URL to performance review"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <Card key={s.n} className="p-6">
            <div className="mb-3 text-[12px] tabular-nums text-fg-subtle">
              {s.n}
            </div>
            <div
              className="mb-2 text-[17px] font-medium tracking-tight text-fg"
              style={{ fontFamily: "var(--font-display-theme, inherit)" }}
            >
              {s.label}
            </div>
            <p className="text-[13.5px] leading-[1.65] text-fg-muted">
              {s.body}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Attempt card
// ────────────────────────────────────────────────────────────────────

const TIER_TONE: Record<string, string> = {
  "Exceeds Expectations": "border-emerald-200/70 bg-card-solid text-emerald-800/90",
  "Strong Meets": "border-emerald-200/70 bg-card-solid text-emerald-800/90",
  "Meets Expectations": "border-line-strong bg-card-solid text-fg",
  "Below Expectations": "border-rose-200/70 bg-card-solid text-rose-800/90",
  "Concerns Raised": "border-rose-300/80 bg-card-solid text-rose-800/90",
};

type AttemptWithSim = {
  id: string;
  week: number;
  finalScore: number | null;
  finalTier: string | null;
  updatedAt: Date;
  simulation: {
    jobTitle: string;
    companyName: string | null;
    location: string | null;
  };
};

function AttemptCard({
  attempt,
  kind,
}: {
  attempt: AttemptWithSim;
  kind: "active" | "finished";
}) {
  const tone =
    kind === "finished" && attempt.finalTier
      ? TIER_TONE[attempt.finalTier] ??
        "border-line-strong bg-card-solid text-fg"
      : "border-line bg-card-solid text-fg-muted";
  return (
    <Link
      href={`/simulator/${attempt.id}`}
      className="group block focus-visible:outline-none"
    >
      <Card className="relative h-full p-5 transition-colors group-hover:border-line-strong">
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <Briefcase className="h-3.5 w-3.5 text-fg-subtle" />
          {kind === "finished" && attempt.finalTier && (
            <span
              className={[
                "rounded-full border px-2.5 py-0.5 text-[11px]",
                tone,
              ].join(" ")}
            >
              {attempt.finalTier}
            </span>
          )}
          {kind === "active" && (
            <span className="rounded-full border border-line bg-card-solid px-2.5 py-0.5 text-[11px] text-fg-muted">
              Week {attempt.week} / 12
            </span>
          )}
        </div>
        <h3
          className="mb-1 text-[17px] font-medium leading-[1.25] tracking-tight text-fg"
          style={{ fontFamily: "var(--font-display-theme, inherit)" }}
        >
          {attempt.simulation.jobTitle}
        </h3>
        {attempt.simulation.companyName && (
          <p className="mb-4 text-[12.5px] text-fg-muted">
            {attempt.simulation.companyName}
            {attempt.simulation.location && ` · ${attempt.simulation.location}`}
          </p>
        )}

        {kind === "active" ? (
          <WeekProgress current={attempt.week} />
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-fg-subtle">Final score</span>
            <span
              className="text-2xl tabular-nums text-fg"
              style={{
                fontFamily: "var(--font-display-theme, inherit)",
                fontWeight: 500,
              }}
            >
              {attempt.finalScore ?? "—"}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-[11.5px] text-fg-subtle">
          <span>{new Date(attempt.updatedAt).toLocaleDateString()}</span>
          <span className="inline-flex items-center gap-1 text-fg-muted transition group-hover:text-fg">
            {kind === "active" ? "Resume" : "Review"}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Card>
    </Link>
  );
}

function WeekProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 12 }, (_, i) => {
        const week = i + 1;
        const state = week < current ? "done" : week === current ? "now" : "future";
        return (
          <div
            key={week}
            className={[
              "h-1 flex-1 rounded-full",
              state === "done" && "bg-brand-400",
              state === "now" && "bg-brand-600",
              state === "future" && "bg-line",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section heading
// ────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────
// Request card (pending / generating / rejected / failed)
// ────────────────────────────────────────────────────────────────────

const REQUEST_STATUS_META: Record<
  string,
  { label: string; cls: string; Icon: typeof Hourglass; hint: string }
> = {
  pending: {
    label: "Pending",
    cls: "bg-amber-50 text-amber-800 ring-amber-200",
    Icon: Hourglass,
    hint: "An admin will review and publish your simulation, usually within 24 hours.",
  },
  generating: {
    label: "Generating",
    cls: "bg-sky-50 text-sky-800 ring-sky-200",
    Icon: Clock,
    hint: "Admin is running the generation right now.",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-rose-50 text-rose-800 ring-rose-200",
    Icon: XCircle,
    hint: "See the admin's note below.",
  },
  failed: {
    label: "Failed",
    cls: "bg-rose-50 text-rose-800 ring-rose-200",
    Icon: XCircle,
    hint: "Generation didn't complete — an admin will retry or write you a note.",
  },
  ready: {
    label: "Ready",
    cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    Icon: CheckCircle2,
    hint: "Open the simulation from \"In progress\" above.",
  },
};

type RequestSummary = {
  id: string;
  sourceUrl: string | null;
  jdBody: string;
  status: string;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  simulation: { id: string; jobTitle: string; companyName: string | null } | null;
};

function RequestCard({ request }: { request: RequestSummary }) {
  const meta = REQUEST_STATUS_META[request.status] ?? REQUEST_STATUS_META.pending;
  const title = request.simulation?.jobTitle
    ?? snippetTitle(request.jdBody);
  return (
    <Card className="relative h-full p-5">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <Briefcase className="h-3.5 w-3.5 text-fg-subtle" />
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
            meta.cls,
          ].join(" ")}
        >
          <meta.Icon className="h-3 w-3" /> {meta.label}
        </span>
      </div>
      <h3
        className="mb-1 text-[15px] font-medium leading-[1.3] tracking-tight text-fg line-clamp-2"
        style={{ fontFamily: "var(--font-display-theme, inherit)" }}
      >
        {title}
      </h3>
      {request.simulation?.companyName && (
        <p className="mb-3 text-[12px] text-fg-muted">
          {request.simulation.companyName}
        </p>
      )}
      <p className="text-[11.5px] leading-relaxed text-fg-muted">{meta.hint}</p>
      {request.adminNotes && (
        <p className="mt-2 text-[11px] leading-relaxed text-fg-muted italic">
          “{request.adminNotes}”
        </p>
      )}
      <div className="mt-4 text-[11px] text-fg-subtle">
        Submitted {new Date(request.createdAt).toLocaleDateString()}
      </div>
    </Card>
  );
}

/** Pull a usable title out of the first non-empty line of the JD body
 *  when no Simulation has been linked yet. Keeps the card readable
 *  even when an admin hasn't touched the request. */
function snippetTitle(jd: string): string {
  const firstLine = jd.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
  if (!firstLine) return "Submitted posting";
  return firstLine.length > 80 ? `${firstLine.slice(0, 78)}…` : firstLine;
}

function SectionHeading({
  label,
  count,
  hint,
}: {
  label: string;
  count?: number;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-[14px] font-medium text-fg">{label}</h2>
        {typeof count === "number" && (
          <span className="text-[12px] text-fg-subtle">{count}</span>
        )}
      </div>
      {hint && <span className="text-[12px] text-fg-subtle">{hint}</span>}
    </div>
  );
}
