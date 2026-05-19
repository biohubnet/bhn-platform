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
    <section className="rounded-[var(--radius-lg)] border border-line/70 bg-card-solid">
      <div className="grid gap-10 px-6 py-10 md:grid-cols-[1.5fr_1fr] md:px-10 md:py-14 lg:gap-14">
        <div className="max-w-2xl">
          <div className="mb-3 text-[12px] text-fg-subtle">
            Role-play simulator
          </div>
          <h1
            className="mb-5 text-[38px] font-semibold leading-[1.1] tracking-tight text-fg md:text-[48px]"
            style={{ fontFamily: "var(--font-display-theme, inherit)" }}
          >
            Practice the job before you apply for it.
          </h1>
          <p className="max-w-xl text-[15px] leading-[1.7] text-fg-muted md:text-[16px]">
            Paste a job-posting URL. You&apos;ll get a tailored 12-week quarter
            — a team of colleagues with daily and weekly rhythms, real
            scenarios you&apos;ll face in that role, and a performance review
            from your VP at the end. Every decision moves five stats. Most
            options have a tempting-but-flawed flavour. Try things you&apos;d
            never risk in real life.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/simulator/new"
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-brand-700"
            >
              {hasAttempts ? "Start a new simulation" : "Start your first simulation"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-[12px] text-fg-subtle">
              15–25 seconds for a fresh job.
            </span>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="rounded-md border border-line/60 bg-raised/20 p-5">
            <div className="mb-4 text-[12.5px] font-medium text-fg">
              What you&apos;ll get
            </div>
            <ul className="space-y-4 text-[13.5px] leading-[1.65] text-fg-muted">
              <FeatureRow icon={Theater}>
                <span className="text-fg">Role-played meetings.</span> VP 1:1s,
                critiques, escalations, hiring, the QBR. Each scenario ends
                with 3–4 choices and a real tradeoff.
              </FeatureRow>
              <FeatureRow icon={Compass}>
                <span className="text-fg">Hover to preview deltas.</span> See
                how a choice moves all five stats before committing.
              </FeatureRow>
              <FeatureRow icon={ClipboardList}>
                <span className="text-fg">Quarterly review.</span> Tiered
                score, per-stat narrative, highlights and lowlights, and a
                closing line from your VP.
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
      <Icon className="mt-1 h-3.5 w-3.5 shrink-0 text-fg-subtle" />
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
