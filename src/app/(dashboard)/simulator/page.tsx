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
  ClipboardList,
  Compass,
  Sparkles,
  Theater,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function SimulatorLandingPage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  const userId = (session.user as { id?: string }).id!;

  const attempts = await prisma.simulationAttempt.findMany({
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
  });

  const active = attempts.filter((a) => !a.finished);
  const finished = attempts.filter((a) => a.finished);

  return (
    <div className="space-y-10 pb-12">
      <Hero hasAttempts={attempts.length > 0} />

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

      {attempts.length === 0 && <HowItWorks />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────────

function Hero({ hasAttempts }: { hasAttempts: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-gradient-to-br from-brand-50 via-card-solid to-card-solid">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-brand-200/30 blur-3xl" />

      <div className="relative grid gap-8 px-6 py-10 md:grid-cols-[1.4fr_1fr] md:px-10 md:py-14 lg:gap-12">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[10.5px] font-mono uppercase tracking-[0.2em] text-brand-700">
            <Sparkles className="h-3 w-3" /> New
          </div>
          <h1
            className="mb-4 text-[40px] font-semibold leading-[1.05] tracking-tight text-fg md:text-[52px]"
            style={{ fontFamily: "var(--font-display-theme, inherit)" }}
          >
            Practice the job
            <br />
            <span className="text-brand-700">before you apply for it.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-fg-muted md:text-base">
            Paste a job-posting URL. We generate a tailored 12-week quarter —
            a team of colleagues with daily, weekly, monthly rhythms, real
            scenarios you'll face in that role, and a performance review from
            your VP at the end. Every decision moves five stats. Most options
            have a tempting-but-flawed flavour. Try things you'd never risk
            in real life.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/simulator/new"
              className="group inline-flex items-center gap-2 rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Sparkles className="h-4 w-4" />
              {hasAttempts ? "Start a new simulation" : "Start your first simulation"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="text-[11.5px] text-fg-subtle">
              Typical generation: 15–25 seconds for a fresh job
            </span>
          </div>
        </div>

        {/* Right-side feature grid */}
        <div className="hidden md:block">
          <div
            className="rounded-md border border-line bg-card-solid/70 p-5 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_30px_rgba(15,23,42,0.06)]"
            style={{ fontFamily: "var(--font-sans-theme, inherit)" }}
          >
            <div className="mb-3 text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
              What you'll experience
            </div>
            <ul className="space-y-3.5 text-[12.5px] leading-relaxed text-fg">
              <FeatureRow icon={Theater}>
                <strong>Role-played meetings.</strong> VP 1:1s, design
                critiques, escalations, hiring loops, the QBR. Each scenario
                ends with 3–4 choices and a real tradeoff.
              </FeatureRow>
              <FeatureRow icon={Compass}>
                <strong>Hover to preview deltas.</strong> See exactly how a
                choice moves Team Morale, VP Trust, Velocity, Cross-Functional
                Trust, and Your Capacity before committing.
              </FeatureRow>
              <FeatureRow icon={ClipboardList}>
                <strong>Quarterly review at the end.</strong> A tiered score,
                per-stat narrative, highlights and lowlights, and a closing
                line from your VP based on how the quarter actually went.
              </FeatureRow>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-700">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1">{children}</span>
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────
// Empty state
// ────────────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: "01",
      label: "Paste a URL",
      body: "Any public job posting — LinkedIn, Indeed, a company careers page. Or paste the JD text directly when the URL is auth-walled.",
    },
    {
      n: "02",
      label: "AI casts your world",
      body: "Generates a team of 5–7 reports, 2–4 cross-functional partners, and ~10 scenarios specific to the role. Cached across trainees — the same posting only generates once.",
    },
    {
      n: "03",
      label: "Live the quarter",
      body: "Twelve weeks. Decisions move five stats. State checkpoints after each choice so you can close the tab and resume. End with a performance review from your VP.",
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
          <Card key={s.n} hover className="p-6">
            <div className="mb-3 font-mono text-[11px] tracking-[0.2em] text-brand-600">
              {s.n}
            </div>
            <div
              className="mb-2 text-lg font-semibold tracking-tight text-fg"
              style={{ fontFamily: "var(--font-display-theme, inherit)" }}
            >
              {s.label}
            </div>
            <p className="text-[13px] leading-relaxed text-fg-muted">
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
  "Exceeds Expectations": "border-emerald-300 bg-emerald-50 text-emerald-800",
  "Strong Meets": "border-emerald-300 bg-emerald-50 text-emerald-800",
  "Meets Expectations": "border-amber-300 bg-amber-50 text-amber-900",
  "Below Expectations": "border-rose-300 bg-rose-50 text-rose-900",
  "Concerns Raised": "border-rose-400 bg-rose-100 text-rose-900",
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
        "border-line bg-raised/40 text-fg-muted"
      : "border-brand-200 bg-brand-50/60 text-brand-700";
  return (
    <Link
      href={`/simulator/${attempt.id}`}
      className="group block focus-visible:outline-none"
    >
      <Card
        hover
        className="relative h-full p-5 transition-shadow group-hover:shadow-lg"
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <Briefcase className="h-3.5 w-3.5 text-fg-subtle" />
          {kind === "finished" && attempt.finalTier && (
            <span
              className={[
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                tone,
              ].join(" ")}
            >
              {attempt.finalTier}
            </span>
          )}
          {kind === "active" && (
            <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-brand-700">
              Week {attempt.week}/12
            </span>
          )}
        </div>
        <h3
          className="mb-1 text-[17px] font-semibold leading-tight tracking-tight text-fg"
          style={{ fontFamily: "var(--font-display-theme, inherit)" }}
        >
          {attempt.simulation.jobTitle}
        </h3>
        {attempt.simulation.companyName && (
          <p className="mb-4 text-[12px] text-fg-muted">
            {attempt.simulation.companyName}
            {attempt.simulation.location && ` · ${attempt.simulation.location}`}
          </p>
        )}

        {/* Progress / score row */}
        {kind === "active" ? (
          <WeekProgress current={attempt.week} />
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-widest text-fg-subtle">
              Final score
            </span>
            <span
              className="font-mono text-2xl font-bold tabular-nums text-brand-700"
              style={{ fontFamily: "var(--font-display-theme, inherit)" }}
            >
              {attempt.finalScore ?? "—"}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-[11px] text-fg-subtle">
          <span>{new Date(attempt.updatedAt).toLocaleDateString()}</span>
          <span className="inline-flex items-center gap-1 font-medium text-brand-600 transition group-hover:text-brand-700">
            {kind === "active" ? "Resume" : "Review"}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
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
              "h-1.5 flex-1 rounded-full",
              state === "done" && "bg-brand-600",
              state === "now" && "bg-brand-500 ring-2 ring-brand-300/40",
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
      <div className="flex items-baseline gap-3">
        <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-fg-muted">
          {label}
        </h2>
        {typeof count === "number" && (
          <span className="font-mono text-[10.5px] text-fg-subtle">
            · {count}
          </span>
        )}
      </div>
      {hint && (
        <span className="text-[11px] text-fg-subtle">{hint}</span>
      )}
    </div>
  );
}
