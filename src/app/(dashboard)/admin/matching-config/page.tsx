import Link from "next/link";
import { ArrowLeft, Settings2, Info } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getMatchingConfig,
  DEFAULT_MATCHING_CONFIG,
} from "@/lib/matching/config";
import { MatchingConfigClient } from "@/components/admin/MatchingConfigClient";

export const dynamic = "force-dynamic";

/**
 * /admin/matching-config — tune the AI matching engine.
 *
 * Surfaces every constant the scorer uses (subscore weights, band
 * thresholds, confidence thresholds, semantic / pathway cosine
 * minimums, per-pathway boost, required-skill bonus) plus a live
 * tester that re-scores a real (trainee, posting) pair using the
 * unsaved form values, so the admin can preview the impact of a
 * weight change before committing.
 *
 * Permissions
 *   admin / superadmin (requireRole gate). Every save writes an
 *   AuditLog row tagged action="matching.config.update" so the
 *   "who changed the weights" audit trail is intact.
 */
export default async function MatchingConfigPage() {
  await requireRole("admin");

  const [current, sampleUsers, samplePostings, recentEdits] = await Promise.all([
    getMatchingConfig(),
    // Trainees with at least one UserSkill — anything else has nothing
    // to score against. Limit to 25 for the dropdown.
    // User.skills is the back-relation onto UserSkill (per the schema:
    // `skills UserSkill[]` on the User model).
    prisma.user.findMany({
      where: {
        role: { in: ["trainee", "evaluating"] },
        skills: { some: {} },
      },
      select: { id: true, name: true, email: true },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
    // Active postings with at least one PostingSkill — same reason.
    prisma.internshipPosting.findMany({
      where: { status: "active", skills: { some: {} } },
      select: { id: true, title: true, companyName: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.auditLog.findMany({
      where: { action: "matching.config.update" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { actor: { select: { name: true, email: true } } },
    }).catch(() => []),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <Link
          href="/admin"
          className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={12} /> Admin overview
        </Link>
        <h1 className="text-2xl font-bold text-fg tracking-tight inline-flex items-center gap-2">
          <Settings2 size={20} className="text-brand-600" />
          AI matching — engine settings
        </h1>
        <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed">
          Tune the weights, bands, and thresholds that drive the fit
          scorer at <code className="font-mono text-[11px] bg-elevated px-1 rounded">src/lib/matching/fit.ts</code>.
          Every change saves to <code className="font-mono text-[11px] bg-elevated px-1 rounded">PlatformSetting[key=matching]</code> and
          writes an AuditLog row. Use the live tester to preview
          impact on a real (trainee × posting) pair before you save.
        </p>
      </header>

      {/* Explainer */}
      <section className="rounded-2xl border border-line bg-gradient-to-br from-brand-50/30 via-card to-card p-5">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-brand-600 mt-0.5 shrink-0" />
          <div className="text-xs text-muted leading-relaxed">
            <p className="font-semibold text-fg mb-1">How the score is computed</p>
            <p>
              Each posting is scored 0–100 = directOverlap (weight {DEFAULT_MATCHING_CONFIG.weights.direct})
              + semanticSimilarity (weight {DEFAULT_MATCHING_CONFIG.weights.semantic})
              + pathwayAlignment (weight {DEFAULT_MATCHING_CONFIG.weights.pathway}). The three weights
              must sum to 100; the save handler clamps any residual onto the direct weight so a
              misconfigured form can&apos;t produce nonsense.
            </p>
            <p className="mt-2">
              The <strong className="text-fg">live tester</strong> below lets you pick a real
              trainee + posting and see the breakdown using whatever the form currently shows —
              without touching the persisted config. Save commits the form values to the DB.
            </p>
          </div>
        </div>
      </section>

      {/* Client form */}
      <MatchingConfigClient
        initial={current}
        defaults={DEFAULT_MATCHING_CONFIG}
        users={sampleUsers.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
        postings={samplePostings.map((p) => ({
          id: p.id,
          label: `${p.title} — ${p.companyName}`,
        }))}
      />

      {/* Audit trail */}
      {recentEdits.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="text-sm font-bold text-fg mb-3">Recent edits</h2>
          <ul className="divide-y divide-line/70 text-xs">
            {recentEdits.map((a) => (
              <li key={a.id} className="py-2 flex items-center gap-3">
                <p className="font-semibold text-fg flex-1 min-w-0 truncate">
                  {a.actor?.name ?? a.actor?.email ?? "system"}
                </p>
                <p className="text-subtle tabular-nums">
                  {new Date(a.createdAt).toLocaleString(undefined, {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
