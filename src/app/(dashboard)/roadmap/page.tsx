import Link from "next/link";
import {
  Compass, CircleDot, Circle, CheckCircle2, Megaphone, ArrowRight, MessageSquare,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * /roadmap — public roadmap surface.
 *
 * Three horizons: Now (in the next ~2 weeks), Next (in the next
 * quarter), Later (parked but committed). What's NOT here:
 *
 *   • Items not yet decided. We don't tease vapor.
 *   • Internal-only refactors. The roadmap is the user's view.
 *   • Exact dates. "Now / Next / Later" survives slippage better.
 *
 * Edits land via PR — see ROADMAP_ITEMS below. The roadmap is
 * intentionally not behind editable-copy because each item should
 * be reviewable in version control (and tied to a commit when it
 * ships). When something here ships, move it to /changelog and
 * drop the row.
 *
 * Sits under (dashboard) so it inherits the standard layout, but
 * is visible to any signed-in role — including trainees. That's
 * the point.
 */

interface RoadmapItem {
  title: string;
  summary: string;
  audience: "Trainees" | "Admins" | "Employers / HR" | "All";
  status: "shipped-recently" | "in-progress" | "planned";
  evidence?: { label: string; href: string };
}

const ROADMAP_ITEMS: { horizon: "Now" | "Next" | "Later"; items: RoadmapItem[] }[] = [
  {
    horizon: "Now",
    items: [
      {
        title: "Symposium tour/workshop registration overhaul",
        summary:
          "Tour registration is now independent of the symposium day; every booking goes through admin approval; per-tour 20-seat capacity + 5-spot waitlist.",
        audience: "Trainees",
        status: "shipped-recently",
        evidence: { label: "See changelog", href: "/changelog" },
      },
      {
        title: "Playwright E2E smoke pack",
        summary:
          "Six critical user flows now tested in CI against every PR's Vercel preview. One fully wired today (symposium registration); five with strategy outlines.",
        audience: "Admins",
        status: "shipped-recently",
        evidence: { label: "See changelog", href: "/changelog" },
      },
      {
        title: "UX charter, design system doc, journey maps, decision log",
        summary:
          "The platform's UX practice is now documented end-to-end — three named user outcomes with measurable signals, every design token written down, five user journeys, ADRs for the most consequential UX decisions.",
        audience: "Admins",
        status: "shipped-recently",
        evidence: { label: "View design system", href: "/admin/design-system" },
      },
    ],
  },
  {
    horizon: "Next",
    items: [
      {
        title: "Fill in the remaining five Playwright specs",
        summary:
          "Login, role-switch, workshop-booking-no-registration, permanent-delete-waitlist-promotion, SCORM-completion. Each has a strategy outline waiting in tests/e2e/.",
        audience: "Admins",
        status: "planned",
      },
      {
        title: "Trainee onboarding funnel instrumentation",
        summary:
          "Add page_view → enroll funnel events so we can measure the charter's outcome-1 target (P75 < 5 min arrival → enrollment).",
        audience: "Trainees",
        status: "planned",
      },
      {
        title: "Quarterly WCAG 2.1 AA contrast sweep",
        summary:
          "Audit each of the 9 themes against WCAG AA contrast ratios; document any failures + remediation plan. First sweep this quarter.",
        audience: "All",
        status: "planned",
      },
    ],
  },
  {
    horizon: "Later",
    items: [
      {
        title: "Usability-test cadence — 3 trainees per quarter",
        summary:
          "Run a moderated test on the symposium registration flow + the dashboard with three trainees per quarter. Use docs/ux/templates/usability-test-script.md. Feeds /admin/insights synthesis.",
        audience: "All",
        status: "planned",
      },
      {
        title: "Public 'What users told us' digest",
        summary:
          "The /admin/insights publish flow already exists; the cadence target is one published synthesis per month. Track on /admin/experience-metrics.",
        audience: "All",
        status: "in-progress",
      },
      {
        title: "Skill-ontology vocabulary review with 2 employers",
        summary:
          "Hypothesis from journey 04 (employer): the skill-ontology dropdown vocabulary doesn't match real hiring-manager vocabulary. Validate with two employers; expand aliases.",
        audience: "Employers / HR",
        status: "planned",
      },
    ],
  },
];

export default async function RoadmapPage() {
  // Recent changelog entries that map to "what shipped" — informational.
  const recent = await prisma.changeLog.findMany({
    where: {
      kind: { in: ["feature", "improvement"] },
      visibleTo: { has: "trainee" },
    },
    orderBy: { publishedAt: "desc" },
    take: 5,
    select: { id: true, title: true, publishedAt: true, kind: true },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          BHN Training Platform
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-fg tracking-tight mt-1 inline-flex items-center gap-3">
          <Compass size={28} className="text-brand-600" />
          Roadmap
        </h1>
        <p className="text-sm text-muted mt-3 max-w-2xl leading-relaxed">
          What we're building now, what's next, and what we've parked
          for later. No exact dates — those slip — but every item
          here is committed enough that the team is willing to be held
          accountable in public.
        </p>
        <p className="text-xs text-muted mt-3">
          For what already shipped, see the{" "}
          <Link href="/changelog" className="text-brand-700 font-semibold hover:underline">
            changelog
          </Link>
          . For the UX charter that frames how we choose what's worth doing,{" "}
          <Link
            href="https://github.com/sesamemua/bhn-training-platform/blob/main/docs/ux/charter.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 font-semibold hover:underline"
          >
            see the charter doc
          </Link>
          .
        </p>
      </header>

      {ROADMAP_ITEMS.map(({ horizon, items }) => (
        <section key={horizon}>
          <header className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-fg tracking-tight">{horizon}</h2>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
              {horizon === "Now" && "~ next 2 weeks"}
              {horizon === "Next" && "~ this quarter"}
              {horizon === "Later" && "parked but committed"}
            </p>
          </header>
          <ul className="space-y-3">
            {items.map((item, idx) => (
              <li
                key={idx}
                className="rounded-2xl border border-line bg-card p-5 surface-shadow"
              >
                <div className="flex items-start gap-3">
                  <StatusGlyph status={item.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-fg leading-tight">
                        {item.title}
                      </h3>
                      <AudienceChip audience={item.audience} />
                    </div>
                    <p className="text-sm text-muted leading-relaxed mt-1.5">
                      {item.summary}
                    </p>
                    {item.evidence && (
                      <Link
                        href={item.evidence.href}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline mt-2"
                      >
                        {item.evidence.label} <ArrowRight size={11} />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Recent shipped — bridge between roadmap + changelog */}
      <section className="rounded-2xl border border-line bg-elevated p-6">
        <h2 className="text-lg font-bold text-fg tracking-tight inline-flex items-center gap-2 mb-3">
          <Megaphone size={16} className="text-brand-600" />
          Recently shipped
        </h2>
        <ul className="space-y-2 text-sm">
          {recent.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3">
              <span className="text-fg font-semibold">{c.title}</span>
              <span className="text-xs text-subtle whitespace-nowrap shrink-0">
                {c.publishedAt.toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </li>
          ))}
        </ul>
        <Link
          href="/changelog"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline mt-4"
        >
          Full changelog <ArrowRight size={12} />
        </Link>
      </section>

      {/* Closing — invite feedback */}
      <section className="rounded-2xl bg-brand-50 ring-1 ring-inset ring-brand-200 p-6">
        <h2 className="text-base font-bold text-fg inline-flex items-center gap-2">
          <MessageSquare size={14} className="text-brand-700" />
          Anything you'd like to see here?
        </h2>
        <p className="text-sm text-muted leading-relaxed mt-2">
          The roadmap isn't fixed. If a feature you'd find useful isn't on
          this list, or you disagree with the ordering, tell us. Theme
          ideas, in particular, go through the dedicated voting flow at{" "}
          <Link
            href="/themes"
            className="text-brand-700 font-semibold hover:underline"
          >
            /themes
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function StatusGlyph({ status }: { status: RoadmapItem["status"] }) {
  if (status === "shipped-recently") {
    return (
      <span className="shrink-0 w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 inline-flex items-center justify-center">
        <CheckCircle2 size={16} />
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="shrink-0 w-9 h-9 rounded-lg bg-brand-50 text-brand-700 inline-flex items-center justify-center">
        <CircleDot size={16} />
      </span>
    );
  }
  return (
    <span className="shrink-0 w-9 h-9 rounded-lg bg-elevated text-subtle inline-flex items-center justify-center">
      <Circle size={16} />
    </span>
  );
}

function AudienceChip({ audience }: { audience: RoadmapItem["audience"] }) {
  const tints: Record<RoadmapItem["audience"], string> = {
    Trainees: "bg-violet-100 text-violet-800 ring-violet-200",
    Admins: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    "Employers / HR": "bg-amber-100 text-amber-800 ring-amber-200",
    All: "bg-brand-100 text-brand-800 ring-brand-200",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${tints[audience]}`}
    >
      {audience}
    </span>
  );
}
