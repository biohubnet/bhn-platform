/**
 * /equip/my-applications — applicant-facing status tracker.
 *
 * Lists every application the user has ever started or submitted.
 * Drafts link back to the editor; everything else opens a read-
 * only view.
 *
 * Pure server component — fast paint, no client state.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardList, Beaker, Rocket } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DSPageHeader, DSSection } from "@/components/design-system";
import { STREAM_META, STATUS_META, type EquipStatus, type EquipStream } from "@/lib/equip/types";
import { institutionLabel } from "@/lib/equip/institutions";

export const dynamic = "force-dynamic";

export default async function MyEquipApplicationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const apps = await prisma.equipApplication.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, stream: true, status: true,
      requestedAmount: true, approvedAmount: true,
      institution: true, institutionOther: true,
      submittedAt: true, decidedAt: true, fundedAt: true,
      createdAt: true, updatedAt: true,
      reviewer: { select: { name: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link href="/equip" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Equip
      </Link>

      <DSPageHeader
        eyebrow="Equip · status tracker"
        title="My applications"
        icon={ClipboardList}
        description="Every draft and submission, with current status. Click in for the full submission body and reviewer messages."
      />

      {apps.length === 0 ? (
        <DSSection title="Nothing here yet" eyebrow="Get started">
          <p className="text-sm text-muted mb-3">You haven&apos;t started an application. The wizard is one click away.</p>
          <Link
            href="/equip/apply/new"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            Start an application <ArrowRight size={13} />
          </Link>
        </DSSection>
      ) : (
        <DSSection eyebrow="Most-recent first" title="All applications" icon={ClipboardList}>
          <ul className="space-y-2">
            {apps.map((a) => {
              const meta = STATUS_META[a.status as EquipStatus];
              const stream = STREAM_META[a.stream as EquipStream];
              const href = a.status === "draft"
                ? `/equip/apply/${a.id}`
                : `/equip/apply/${a.id}`;
              return (
                <li key={a.id}>
                  <Link
                    href={href}
                    className="rounded-xl border border-line bg-card hover:bg-elevated p-3 flex items-start gap-3 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                      {a.stream === "venture_lift" ? <Rocket size={14} /> : <Beaker size={14} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-fg block">{stream.name}</span>
                      <span className="text-[11px] text-muted block">
                        {institutionLabel(a.institution, a.institutionOther)}
                      </span>
                      <span className="text-[10px] text-subtle font-mono block mt-0.5">
                        {a.submittedAt
                          ? `Submitted ${a.submittedAt.toISOString().slice(0, 10)}`
                          : `Last edited ${a.updatedAt.toISOString().slice(0, 10)}`}
                        {a.approvedAmount ? ` · $${a.approvedAmount.toLocaleString()} approved` : ""}
                        {a.fundedAt ? ` · funded ${a.fundedAt.toISOString().slice(0, 10)}` : ""}
                        {a.reviewer?.name ? ` · reviewed by ${a.reviewer.name}` : ""}
                      </span>
                    </span>
                    <StatusBadge tone={meta.tone} label={meta.label} />
                    <ArrowRight size={13} className="text-muted shrink-0 mt-2" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </DSSection>
      )}
    </div>
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
