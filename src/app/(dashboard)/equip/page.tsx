/**
 * /equip — landing page for the Equip pillar.
 *
 * Two outcomes from this surface:
 *   1. New applicant       → click "Start an application" → wizard
 *   2. Returning applicant → see existing apps + status, jump back
 *                             into a draft, or start another
 *
 * Server component — composes a few summary stats + a CTA. The
 * heavy lifting lives in /equip/apply/new (wizard) and
 * /equip/apply/[id] (the form).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, AlertTriangle, Beaker, Microscope, Rocket, ClipboardList } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DSPageHeader, DSSection, DSStatGrid, DSStat } from "@/components/design-system";
import { STREAM_META, STATUS_META, type EquipStatus, type EquipStream } from "@/lib/equip/types";

export const dynamic = "force-dynamic";

type AppRow = {
  id: string;
  stream: string;
  status: string;
  requestedAmount: number | null;
  approvedAmount: number | null;
  submittedAt: Date | null;
  decidedAt: Date | null;
  fundedAt: Date | null;
  updatedAt: Date;
};

export default async function EquipLandingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const isAdmin = role === "admin" || role === "superadmin";

  // Resilient read — if the EquipApplication table doesn't exist
  // yet (failed migration / fresh deploy not yet provisioned), we
  // render the landing page with an empty list rather than throwing
  // Next's default error UI. Admins see a callout explaining what
  // to do; regular users just see the empty-state CTA.
  let apps: AppRow[] = [];
  let tableMissing = false;
  try {
    apps = await prisma.equipApplication.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true, stream: true, status: true,
        requestedAmount: true, approvedAmount: true,
        submittedAt: true, decidedAt: true, fundedAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    // Prisma raises P2021 (or a generic 42P01) when the relation
    // doesn't exist. Anything else we just treat as transient and
    // fall back to empty too.
    const msg = (err as Error).message ?? "";
    tableMissing = /does not exist|P2021|relation/i.test(msg);
    apps = [];
  }

  const totalApps = apps.length;
  const totalApproved = apps.filter((a) => a.status === "approved" || a.status === "funded").length;
  const totalFunded = apps
    .filter((a) => a.status === "funded" || a.status === "approved")
    .reduce((sum, a) => sum + (a.approvedAmount ?? 0), 0);
  const hasDraft = apps.some((a) => a.status === "draft");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <DSPageHeader
        eyebrow="Equip · BHN funding pillar"
        title="Funding for your innovation"
        icon={Rocket}
        description={
          <>
            The third BHN pillar after <strong>Engage</strong> (training) and{" "}
            <strong>Experience</strong> (placements). <strong>Equip</strong> backs
            trainee-entrepreneurs with strategic funding to move biomanufacturing
            innovations toward market readiness. Pick the stream that fits where
            you are — we&apos;ll pre-fill what we already know about you.
          </>
        }
      />

      {tableMissing && isAdmin && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-700 mt-0.5 shrink-0" />
          <div className="text-[12px] text-amber-900 leading-relaxed">
            <p className="font-bold">EquipApplication table isn&apos;t provisioned yet.</p>
            <p className="mt-1">
              The platform migration <code className="font-mono bg-amber-100 px-1 rounded">20260620000000_equip_application_pipeline</code>{" "}
              hasn&apos;t run against this database — most likely because a prior
              attempt was marked failed in <code className="font-mono bg-amber-100 px-1 rounded">_prisma_migrations</code>.
              On Neon, run:
            </p>
            <pre className="bg-amber-900 text-amber-50 text-[11px] font-mono p-2 rounded mt-2 overflow-x-auto">
{`DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260620000000_equip_application_pipeline';`}
            </pre>
            <p className="mt-2">Then redeploy. Regular users see only the empty-state below; they don&apos;t see this banner.</p>
          </div>
        </section>
      )}

      {totalApps > 0 && (
        <DSStatGrid>
          <DSStat icon={ClipboardList} label="Your apps" value={totalApps} help="across all streams" tone="brand" />
          <DSStat icon={Rocket} label="Approved" value={totalApproved} help="ready or funded" tone="emerald" />
          <DSStat icon={Microscope} label="Funded total" value={`$${totalFunded.toLocaleString()}`} help="approved amount" tone="violet" />
          <DSStat icon={Beaker} label="In progress" value={apps.filter((a) => a.status === "draft").length} help="draft / saved" tone="rose" />
        </DSStatGrid>
      )}

      <DSSection
        eyebrow="Pick a stream"
        title="Two ways to apply"
        icon={Rocket}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StreamCard stream="venture_connect" hasDraft={apps.some((a) => a.stream === "venture_connect" && a.status === "draft")} />
          <StreamCard stream="venture_lift"    hasDraft={apps.some((a) => a.stream === "venture_lift" && a.status === "draft")} />
        </div>
        <p className="text-[11px] text-subtle mt-3 leading-snug">
          Not sure which one? The next screen has a 3-question wizard that
          recommends a fit based on where you are in commercialization.
        </p>
        <Link
          href="/equip/apply/new"
          className="mt-4 inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-sm shadow-brand-600/25 transition-colors"
        >
          {hasDraft ? "Continue or start new" : "Start an application"} <ArrowRight size={14} />
        </Link>
      </DSSection>

      {totalApps > 0 && (
        <DSSection
          eyebrow="Your recent submissions"
          title="My applications"
          icon={ClipboardList}
        >
          <ul className="space-y-2">
            {apps.map((a) => {
              const meta = STATUS_META[a.status as EquipStatus];
              const stream = STREAM_META[a.stream as EquipStream];
              const href = a.status === "draft"
                ? `/equip/apply/${a.id}`
                : `/equip/my-applications`;
              return (
                <li key={a.id}>
                  <Link
                    href={href}
                    className="rounded-xl border border-line bg-card-solid hover:bg-elevated p-3 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                      {a.stream === "venture_lift" ? <Rocket size={14} /> : <Beaker size={14} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-fg block">{stream.name}</span>
                      <span className="text-[11px] text-muted block truncate">
                        {a.submittedAt
                          ? `Submitted ${a.submittedAt.toISOString().slice(0, 10)}`
                          : `Saved ${a.updatedAt.toISOString().slice(0, 10)}`}
                        {a.approvedAmount ? ` · $${a.approvedAmount.toLocaleString()} approved` : ""}
                      </span>
                    </span>
                    <StatusBadge tone={meta.tone} label={meta.label} />
                    <ArrowRight size={13} className="text-muted shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/equip/my-applications"
            className="text-xs font-bold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 mt-3"
          >
            View full history <ArrowRight size={11} />
          </Link>
        </DSSection>
      )}
    </div>
  );
}

function StreamCard({ stream, hasDraft }: { stream: EquipStream; hasDraft: boolean }) {
  const meta = STREAM_META[stream];
  return (
    <Link
      href={`/equip/apply/new?stream=${stream}`}
      className="rounded-2xl border border-line bg-card-solid hover:bg-elevated p-4 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
          {stream === "venture_lift" ? <Rocket size={16} /> : <Beaker size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-fg inline-flex items-center gap-2">
            {meta.name}
            {hasDraft && (
              <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 ring-1 ring-amber-200 px-1.5 py-0.5 rounded">
                Draft saved
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted leading-snug mt-1">{meta.blurb}</p>
          <p className="text-[10px] text-subtle font-mono mt-2">{meta.cadence}</p>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ tone, label }: { tone: string; label: string }) {
  const toneClass =
    tone === "emerald" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" :
    tone === "amber"   ? "bg-amber-50 text-amber-800 ring-amber-200" :
    tone === "rose"    ? "bg-rose-50 text-rose-800 ring-rose-200" :
    tone === "violet"  ? "bg-violet-50 text-violet-800 ring-violet-200" :
    tone === "brand"   ? "bg-brand-50 text-brand-800 ring-brand-200" :
                         "bg-elevated text-muted ring-line";
  return (
    <span className={"inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset " + toneClass}>
      {label}
    </span>
  );
}
