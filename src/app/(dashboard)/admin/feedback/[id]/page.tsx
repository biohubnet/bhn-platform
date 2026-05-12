import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, User, Mail, MessageSquare, ThumbsUp, MailPlus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXIT_REASON_LABEL, type ExitReason } from "@/lib/talent-pool/comments";

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const { id } = await params;
  const f = await prisma.poolExitFeedback.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      submission: { select: { id: true, leftPoolAt: true } },
    },
  });
  if (!f) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link href="/admin/feedback" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> All feedback
      </Link>

      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Exit survey response
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight inline-flex items-center gap-2">
          <MessageSquare size={22} className="text-brand-600" />
          {f.user.name ?? "Anonymous"}
        </h1>
        <p className="text-sm text-muted inline-flex items-center gap-2">
          <Mail size={12} />
          <a href={`mailto:${f.user.email}`} className="hover:text-fg">{f.user.email}</a>
        </p>
        <p className="text-xs text-subtle">
          Submitted {new Date(f.createdAt).toLocaleString("en-CA", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </header>

      <section className="rounded-2xl border border-line bg-card p-5 space-y-3 surface-shadow">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle">Reason</h2>
        <p className="text-sm text-fg">{EXIT_REASON_LABEL[f.reason as ExitReason] ?? f.reason}</p>
        {f.foundJob && (
          <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-3 py-2 inline-flex items-start gap-2">
            <ThumbsUp size={12} className="text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-900">
              <strong>Found a job.</strong>{f.jobSource && <> Source: {f.jobSource}</>}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card p-5 space-y-3 surface-shadow">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle">Ratings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <ScaleRow label="Helpfulness"             value={f.helpfulness}        max={10} />
          <ScaleRow label="Partner quality"         value={f.partnerQuality}     max={10} />
          <ScaleRow label="Platform experience"     value={f.platformExperience} max={10} />
          <ScaleRow label="Communication frequency" value={f.communicationFreq}  max={10} />
          <ScaleRow label="NPS"                     value={f.npsScore}           max={10} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5 space-y-4 surface-shadow">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle">Comments</h2>
        <FieldDisplay label="What worked well" value={f.whatWorkedWell} />
        <FieldDisplay label="What could be improved" value={f.whatToImprove} />
        <FieldDisplay label="Additional comments" value={f.additionalComments} />
      </section>

      <section className="rounded-2xl border border-line bg-card p-5 space-y-2 surface-shadow">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle">Follow-up</h2>
        {f.allowFollowUp ? (
          <p className="text-sm text-fg inline-flex items-center gap-2">
            <User size={12} className="text-emerald-600" />
            They opted in to follow-up — feel free to reach out at{" "}
            <a href={`mailto:${f.user.email}`} className="font-semibold underline">{f.user.email}</a>.
          </p>
        ) : (
          <p className="text-sm text-muted italic">
            They did not opt in to follow-up. Respect the choice.
          </p>
        )}
        <Link
          href={`/admin/feedback/invite?email=${encodeURIComponent(f.user.email)}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline mt-1"
        >
          <MailPlus size={11} /> Send another feedback invite
        </Link>
      </section>
    </div>
  );
}

function ScaleRow({ label, value, max }: { label: string; value: number | null; max: number }) {
  return (
    <div className="rounded-xl border border-line bg-bg p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold font-mono tabular-nums text-fg">
        {value ?? "—"}
        {value !== null && <span className="text-xs text-muted ml-1">/ {max}</span>}
      </p>
    </div>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-bold text-subtle uppercase tracking-wider mb-1">{label}</p>
      {value
        ? <p className="text-sm text-fg whitespace-pre-wrap leading-snug">{value}</p>
        : <p className="text-sm text-subtle italic">No response</p>}
    </div>
  );
}
