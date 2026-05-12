import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MessageSquare, Star, TrendingUp, ThumbsUp, ArrowRight, MailPlus,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXIT_REASON_LABEL, type ExitReason } from "@/lib/talent-pool/comments";
import { FeedbackInviteForm } from "@/components/admin/FeedbackInviteForm";

/**
 * /admin/feedback — aggregated view of every PoolExitFeedback row
 * plus the FeedbackInvitation queue.
 *
 * Three panes
 *   1. Summary tiles: total responses, NPS score, average rating
 *      across the four scale dimensions, % "found job"
 *   2. Breakdown by exit reason
 *   3. Recent responses — clickable to the per-row detail page
 *      where every text answer is visible.
 *   4. Invitations queue + a quick-mint form.
 */
export default async function AdminFeedbackPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const [feedbacks, invitations] = await Promise.all([
    prisma.poolExitFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.feedbackInvitation.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        user: { select: { name: true, email: true } },
        invitedBy: { select: { name: true } },
      },
    }),
  ]);

  // Summary stats. Compute in-page since volumes are low.
  const total = feedbacks.length;
  const avg = (vals: (number | null)[]): number | null => {
    const xs = vals.filter((v): v is number => v != null);
    if (xs.length === 0) return null;
    return Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10;
  };
  const helpful   = avg(feedbacks.map((f) => f.helpfulness));
  const partner   = avg(feedbacks.map((f) => f.partnerQuality));
  const platform  = avg(feedbacks.map((f) => f.platformExperience));
  const commsFreq = avg(feedbacks.map((f) => f.communicationFreq));
  const foundJobPct = total === 0
    ? null
    : Math.round((feedbacks.filter((f) => f.foundJob).length / total) * 100);

  // Net Promoter Score = %promoters − %detractors. Promoters 9-10,
  // detractors 0-6, passives 7-8 are not counted. Standard def.
  const npsResp = feedbacks.filter((f): f is typeof f & { npsScore: number } => f.npsScore != null);
  const nps = npsResp.length === 0 ? null : Math.round(
    (npsResp.filter((f) => f.npsScore >= 9).length / npsResp.length) * 100
    -
    (npsResp.filter((f) => f.npsScore <= 6).length / npsResp.length) * 100,
  );

  // Bucket by reason for the bar chart.
  const byReason: Record<string, number> = {};
  for (const f of feedbacks) byReason[f.reason] = (byReason[f.reason] ?? 0) + 1;
  const reasonRows = Object.entries(EXIT_REASON_LABEL).map(([key, label]) => ({
    key, label, count: byReason[key as ExitReason] ?? 0,
  }));
  const maxReason = Math.max(1, ...reasonRows.map((r) => r.count));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Admin · Platform
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <MessageSquare size={22} className="text-brand-600" />
          Feedback
          <span className="text-xs font-mono tabular-nums text-subtle">{total}</span>
        </h1>
        <p className="text-sm text-muted mt-2 max-w-3xl leading-snug">
          Aggregated exit-survey responses from trainees leaving the talent
          pool, plus open feedback invitations. Click any row for the full
          response.
        </p>
      </header>

      {/* Summary */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Tile label="Responses"          value={total}                            unit="" />
        <Tile label="NPS"                value={nps ?? "—"}                       unit={nps !== null ? "" : ""} highlight={nps !== null && nps >= 30} />
        <Tile label="Helpfulness"        value={helpful ?? "—"}                   unit={helpful !== null ? "/10" : ""} />
        <Tile label="Partner quality"    value={partner ?? "—"}                   unit={partner !== null ? "/10" : ""} />
        <Tile label="Platform UX"        value={platform ?? "—"}                  unit={platform !== null ? "/10" : ""} />
        <Tile label="Comms frequency"    value={commsFreq ?? "—"}                 unit={commsFreq !== null ? "/10" : ""} />
      </section>
      {foundJobPct !== null && (
        <p className="text-sm text-fg">
          <ThumbsUp size={12} className="inline -mt-0.5 mr-1 text-emerald-600" />
          <strong>{foundJobPct}%</strong> of respondents said they found a job before leaving.
        </p>
      )}

      {/* Reason breakdown */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <h2 className="text-sm font-bold text-fg inline-flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-brand-600" /> Exit reasons
        </h2>
        <ul className="space-y-1.5">
          {reasonRows.map((r) => (
            <li key={r.key} className="grid grid-cols-[180px_1fr_30px] gap-2 items-center text-xs">
              <span className="text-fg truncate">{r.label}</span>
              <div className="h-2 rounded-full bg-bg overflow-hidden">
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${(r.count / maxReason) * 100}%` }}
                />
              </div>
              <span className="font-mono tabular-nums text-fg text-right">{r.count}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent responses */}
      <section>
        <h2 className="text-sm font-bold text-fg inline-flex items-center gap-2 mb-3">
          <Star size={14} className="text-brand-600" /> Recent responses
        </h2>
        {feedbacks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
            <p className="text-sm font-medium text-muted">No exit surveys yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {feedbacks.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/admin/feedback/${f.id}`}
                  className="block rounded-2xl border border-line bg-card hover:border-brand-300 transition-colors p-4 surface-shadow"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-fg text-sm">
                        {f.user?.name ?? <span className="italic text-muted">Anonymous</span>}
                      </p>
                      <p className="text-xs text-muted">{f.user?.email ?? "—"}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <ReasonChip reason={f.reason} />
                        {f.foundJob && (
                          <span className="text-[10px] uppercase tracking-[0.14em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-emerald-50 text-emerald-800 ring-emerald-200 inline-flex items-center gap-1">
                            <ThumbsUp size={9} /> Found job
                          </span>
                        )}
                        {f.npsScore !== null && (
                          <NPSChip score={f.npsScore} />
                        )}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-subtle">
                      {new Date(f.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      <ArrowRight size={12} className="inline ml-1 text-subtle" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invitations */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
        <h2 className="text-sm font-bold text-fg inline-flex items-center gap-2">
          <MailPlus size={14} className="text-brand-600" /> Feedback invitations
        </h2>
        <p className="text-xs text-muted leading-snug">
          Mint a single-use link inviting a specific user (or anyone with the
          link) to fill the survey. Useful for following up with people who
          left without completing the in-line form, or asking for general
          NPS / post-completion feedback.
        </p>

        <FeedbackInviteForm />

        {invitations.length > 0 && (
          <div className="rounded-xl border border-line bg-bg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-elevated/60 text-[10px] uppercase tracking-[0.14em] font-bold text-subtle">
                <tr>
                  <th className="text-left px-3 py-2">Recipient</th>
                  <th className="text-left px-3 py-2">Kind</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Sent</th>
                  <th className="text-left px-3 py-2">Expires</th>
                  <th className="text-left px-3 py-2">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-3 py-2 text-fg">
                      {inv.user
                        ? <>{inv.user.name ?? inv.user.email}</>
                        : <span className="italic text-muted">Anyone with link</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted">{inv.kind}</td>
                    <td className="px-3 py-2">
                      {inv.consumedAt ? (
                        <span className="text-emerald-700 font-bold">Used</span>
                      ) : inv.expiresAt < new Date() ? (
                        <span className="text-rose-700">Expired</span>
                      ) : (
                        <span className="text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-subtle">
                      {new Date(inv.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-3 py-2 text-subtle">
                      {new Date(inv.expiresAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-3 py-2">
                      <code className="font-mono text-[10px] text-muted">
                        /feedback/{inv.token.slice(0, 12)}…
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({
  label, value, unit, highlight,
}: {
  label: string;
  value: number | string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 surface-shadow">
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">{label}</p>
      <p className={`text-2xl font-bold font-mono tabular-nums mt-1 ${highlight ? "text-emerald-700" : "text-fg"}`}>
        {value}
        {unit && <span className="text-sm text-muted ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

function ReasonChip({ reason }: { reason: string }) {
  const label = EXIT_REASON_LABEL[reason as ExitReason] ?? reason;
  return (
    <span className="text-[10px] uppercase tracking-[0.14em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-elevated text-muted ring-line">
      {label}
    </span>
  );
}

function NPSChip({ score }: { score: number }) {
  const tier =
    score >= 9 ? { label: `NPS ${score} (promoter)`, cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" }
    : score >= 7 ? { label: `NPS ${score} (passive)`, cls: "bg-amber-100 text-amber-800 ring-amber-200" }
    : { label: `NPS ${score} (detractor)`, cls: "bg-rose-100 text-rose-800 ring-rose-200" };
  return (
    <span className={`text-[10px] uppercase tracking-[0.14em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset ${tier.cls}`}>
      {tier.label}
    </span>
  );
}
