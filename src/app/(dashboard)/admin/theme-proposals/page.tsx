import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sparkles, Heart, ThumbsDown, Inbox } from "lucide-react";
import {
  PROPOSAL_STATUS_META,
  isValidProposalStatus,
  VALID_THEME_IDS,
} from "@/lib/themes/constants";
import { AdminProposalQueue } from "@/components/admin/AdminProposalQueue";
import { PageHero } from "@/components/ui/PageHero";

/**
 * /admin/theme-proposals — admin review surface.
 *
 * Two panels:
 *   1. Vote aggregates — top-loved + top-disliked themes by count.
 *      Surfaced to admins only (the trainee-facing /themes page
 *      hides aggregates to preserve voter anonymity at low N).
 *   2. Queue of every ThemeProposal, most recent first, with the
 *      proposer + content + action buttons (review / build / ship /
 *      ship_with_bounty / decline). Each action posts to
 *      /api/admin/theme-proposals/[id].
 */
export default async function AdminThemeProposalsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  // Vote aggregations — group by (themeId, sentiment).
  const voteGroups = await prisma.themeVote.groupBy({
    by: ["themeId", "sentiment"],
    _count: { _all: true },
  });

  // Build separate sorted lists for favourites and least-favourites.
  // Filter to known theme IDs so retired themes don't pollute the
  // chart (orphan votes are an accepted drift cost — themes are code
  // constants, not FKs).
  const known = new Set<string>(VALID_THEME_IDS);
  const fav = voteGroups
    .filter((g) => g.sentiment === "favorite" && known.has(g.themeId))
    .map((g) => ({ themeId: g.themeId, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
  const least = voteGroups
    .filter((g) => g.sentiment === "least_favorite" && known.has(g.themeId))
    .map((g) => ({ themeId: g.themeId, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  // Proposals queue with proposer info.
  const proposals = await prisma.themeProposal.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      proposer: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  });

  // Group counts so the header summary reads at a glance.
  const counts = {
    submitted:    proposals.filter((p) => p.status === "submitted").length,
    underReview:  proposals.filter((p) => p.status === "under_review").length,
    building:     proposals.filter((p) => p.status === "building").length,
    shipped:      proposals.filter((p) => p.status === "shipped").length,
    declined:     proposals.filter((p) => p.status === "declined").length,
  };

  return (
    <div>
      <PageHero
        eyebrow={<><Sparkles size={11} /> Admin · ENGAGE</>}
        title="Theme proposals"
        description="Trainee-submitted theme ideas + aggregated vote totals. Shipping a proposal can issue a tier-3 MerchReward bounty (Theme Designer Bundle) — idempotent: one bundle per user even if they have multiple shipped ideas."
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">

      {/* Headline counts */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="New"           value={counts.submitted}   rag="grey" />
        <Stat label="In review"     value={counts.underReview} rag="amber" />
        <Stat label="Building"      value={counts.building}    rag="sky" />
        <Stat label="Shipped"       value={counts.shipped}     rag="green" />
        <Stat label="Declined"      value={counts.declined}    rag="rose" />
      </section>

      {/* Vote aggregations */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VoteList
          icon={Heart}
          label="Top-loved themes"
          accent="text-rose-600"
          items={fav}
          empty="No favourite votes yet."
        />
        <VoteList
          icon={ThumbsDown}
          label="Top-disliked themes"
          accent="text-amber-700"
          items={least}
          empty="No least-favourite votes yet."
        />
      </section>

      {/* Proposals queue */}
      <section>
        <h2 className="text-sm font-semibold text-fg mb-3 inline-flex items-center gap-2">
          <Inbox size={14} className="text-brand-600" />
          Proposal queue
        </h2>

        {proposals.length === 0 ? (
          <p className="text-sm text-muted bg-card border border-line rounded-2xl p-6 text-center">
            No proposals yet. They'll appear here as trainees submit them.
          </p>
        ) : (
          <AdminProposalQueue
            proposals={proposals.map((p) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              inspiration: p.inspiration,
              status: isValidProposalStatus(p.status) ? p.status : "submitted",
              reviewerNote: p.reviewerNote,
              reviewedAt: p.reviewedAt?.toISOString() ?? null,
              shippedThemeId: p.shippedThemeId,
              bountyIssued: p.bountyIssued,
              bountyRewardId: p.bountyRewardId,
              createdAt: p.createdAt.toISOString(),
              proposer: {
                id: p.proposer.id,
                name: p.proposer.name ?? null,
                email: p.proposer.email,
              },
              reviewer: p.reviewer
                ? {
                    id: p.reviewer.id,
                    name: p.reviewer.name ?? null,
                    email: p.reviewer.email,
                  }
                : null,
            }))}
          />
        )}
      </section>

      {/* Status legend */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3">
          Status reference
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {Object.entries(PROPOSAL_STATUS_META).map(([key, meta]) => (
            <div key={key} className="flex items-start gap-2">
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ragDot(meta.rag)}`} />
              <div>
                <dt className="font-semibold text-fg">{meta.label}</dt>
                <dd className="text-muted leading-snug">{meta.description}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function Stat({
  label, value, rag,
}: {
  label: string;
  value: number;
  rag: "grey" | "amber" | "sky" | "green" | "rose";
}) {
  const tints: Record<typeof rag, string> = {
    grey:  "bg-card border-line text-fg",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    sky:   "bg-sky-50 border-sky-200 text-sky-800",
    green: "bg-emerald-50 border-emerald-200 text-emerald-800",
    rose:  "bg-rose-50 border-rose-200 text-rose-800",
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tints[rag]}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-tight mt-0.5">{value}</p>
    </div>
  );
}

function ragDot(rag: "grey" | "amber" | "sky" | "green" | "rose"): string {
  switch (rag) {
    case "grey":  return "bg-subtle";
    case "amber": return "bg-amber-500";
    case "sky":   return "bg-sky-500";
    case "green": return "bg-emerald-500";
    case "rose":  return "bg-rose-500";
  }
}

function VoteList({
  icon: Icon,
  label,
  accent,
  items,
  empty,
}: {
  icon: React.ElementType;
  label: string;
  accent: string;
  items: { themeId: string; count: number }[];
  empty: string;
}) {
  const top = items.slice(0, 5);
  const max = top[0]?.count ?? 0;
  return (
    <div className="rounded-2xl border border-line bg-card p-5 surface-shadow">
      <h3 className={`text-sm font-semibold mb-3 inline-flex items-center gap-2 ${accent}`}>
        <Icon size={14} />
        {label}
      </h3>
      {top.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {top.map((row) => {
            const pct = max === 0 ? 0 : Math.round((row.count / max) * 100);
            return (
              <li key={row.themeId} className="flex items-center gap-3">
                <span className="text-sm font-semibold text-fg w-24 truncate">{row.themeId}</span>
                <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono tabular-nums text-fg w-8 text-right">
                  {row.count}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
