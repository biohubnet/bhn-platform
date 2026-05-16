/**
 * /profile/assist-history — full audit of what the AI behaviour-
 * assist feature has on file for the calling user.
 *
 * Surface intent
 *   This is the trust artifact. Users opting in to longer
 *   retention need a direct, scrutinable view of the trail —
 *   counts, recent events, rollups, weekly summaries, hints
 *   shown to them — plus a clear "wipe all" button.
 */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AssistConsentPanel } from "@/components/assist/AssistConsentPanel";
import { AssistHistoryView } from "@/components/assist/AssistHistoryView";

export const dynamic = "force-dynamic";

export default async function AssistHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const [
    eventCount,
    recentEvents,
    rollupCount,
    rollups,
    summaries,
    hints,
  ] = await Promise.all([
    prisma.assistEvent.count({ where: { userId } }),
    prisma.assistEvent.findMany({
      where: { userId },
      orderBy: { ts: "desc" },
      take: 50,
      select: { id: true, ts: true, kind: true, surface: true, target: true },
    }),
    prisma.assistDailyRollup.count({ where: { userId } }),
    prisma.assistDailyRollup.findMany({
      where: { userId },
      orderBy: { day: "desc" },
      take: 30,
      select: {
        day: true, surface: true, views: true, clicks: true,
        rageClicks: true, deadClicks: true, formAbandons: true,
        errors: true, dwellMs: true, completed: true,
      },
    }),
    prisma.assistWeeklySummary.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      take: 12,
      select: { weekStart: true, summary: true, stuckOn: true },
    }),
    prisma.assistHint.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, helpKey: true, title: true, body: true,
        surface: true, triggeredBy: true, confidence: true,
        status: true, createdAt: true, shownAt: true,
      },
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        href="/profile"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Profile
      </Link>

      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Profile · privacy
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight">
          Help nudges · my history
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          Every behaviour signal the Help-nudges feature has on file
          for you. Use the controls to toggle data collection, adjust
          hint sensitivity, or wipe everything in one click.
        </p>
      </header>

      <AssistConsentPanel verbose />

      <AssistHistoryView
        counts={{
          events: eventCount,
          rollups: rollupCount,
          summaries: summaries.length,
          hints: hints.length,
        }}
        recentEvents={recentEvents.map((e) => ({
          ...e,
          ts: e.ts.toISOString(),
        }))}
        rollups={rollups.map((r) => ({ ...r, day: r.day.toISOString() }))}
        summaries={summaries.map((s) => ({
          ...s,
          weekStart: s.weekStart.toISOString(),
        }))}
        hints={hints.map((h) => ({
          ...h,
          createdAt: h.createdAt.toISOString(),
          shownAt: h.shownAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
