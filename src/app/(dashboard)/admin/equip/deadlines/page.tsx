/**
 * /admin/equip/deadlines — manage funding-window deadlines for
 * VentureConnect (monthly) and VentureLift (quarterly).
 *
 * Two views: list (table) + calendar (month grid). Both are
 * driven by the same data fetch; the toggle lives in the client
 * DeadlineManager component below.
 *
 * Auth: admin OR equip_review committee. Committee members run
 * the reviews — they should be able to schedule the next cycle.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";
import { listDeadlines } from "@/lib/equip/deadlines";
import { derivedDeadlineSpecs } from "@/lib/equip/calendar";
import { PageHeader } from "@/components/ui/PageHeader";
import { DeadlineManager } from "@/components/admin/equip/DeadlineManager";
import { RoundTimeline } from "@/components/admin/equip/RoundTimeline";

export const dynamic = "force-dynamic";

/** Idempotent sync: insert any EquipDeadline rows from
 *  derivedDeadlineSpecs() that don't already exist. Match by
 *  (stream, Toronto calendar date). Hand-scheduled rows or
 *  status="closed" rows on the same date are kept; we only
 *  fill in the gaps. Also repairs existing rows that were
 *  previously auto-synced with status="open" when their window
 *  hasn't started yet — flips those to "scheduled".
 *  Runs on every page load — cheap, three queries. */
async function syncRoundsToDeadlines(actorId: string): Promise<number> {
  const specs = derivedDeadlineSpecs();
  if (specs.length === 0) return 0;
  const now = new Date();

  /** Correct status for a spec at the current instant:
   *  "closed"    — deadline already passed
   *  "open"      — window has opened (opensAt ≤ now) and not yet closed
   *  "scheduled" — window hasn't opened yet */
  function specStatus(s: (typeof specs)[number]): string {
    if (s.deadlineAt < now) return "closed";
    if (s.opensAt <= now)   return "open";
    return "scheduled";
  }

  // Snapshot existing rows over the relevant date range so we
  // can dedupe by Toronto-local calendar date.
  const earliest = specs.reduce(
    (min, s) => (s.deadlineAt < min ? s.deadlineAt : min),
    specs[0].deadlineAt,
  );
  const latest = specs.reduce(
    (max, s) => (s.deadlineAt > max ? s.deadlineAt : max),
    specs[0].deadlineAt,
  );
  const existing = await prisma.equipDeadline.findMany({
    where: { deadlineAt: { gte: earliest, lte: new Date(latest.getTime() + 24 * 60 * 60 * 1000) } },
    select: { stream: true, deadlineAt: true },
  });
  const seen = new Set(
    existing.map((d) => `${d.stream}|${d.deadlineAt.toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}`),
  );

  const toCreate = specs.filter((s) => {
    const key = `${s.stream}|${s.deadlineAt.toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}`;
    return !seen.has(key);
  });

  if (toCreate.length > 0) {
    await prisma.equipDeadline.createMany({
      data: toCreate.map((s) => ({
        stream: s.stream,
        deadlineAt: s.deadlineAt,
        originalDeadlineAt: s.deadlineAt,
        status: specStatus(s),
        cycleLabel: s.cycleLabel,
        note: `Auto-synced from VL round schedule (${s.stageLabel})`,
        createdById: actorId,
      })),
    });
  }

  // Repair pass: existing rows that were previously auto-synced as
  // "open" but whose window hasn't started yet should be "scheduled".
  // We never touch admin-set "closed" or "extended" rows.
  const toSchedule = specs.filter((s) => specStatus(s) === "scheduled");
  if (toSchedule.length > 0) {
    const halfDay = 12 * 60 * 60 * 1000;
    await Promise.all(
      toSchedule.map((s) =>
        prisma.equipDeadline.updateMany({
          where: {
            stream: s.stream,
            deadlineAt: {
              gte: new Date(s.deadlineAt.getTime() - halfDay),
              lte: new Date(s.deadlineAt.getTime() + halfDay),
            },
            status: "open", // only repair incorrectly-open future rows
          },
          data: { status: "scheduled" },
        }),
      ),
    );
  }

  return toCreate.length;
}

export default async function AdminEquipDeadlinesPage() {
  const session = await requireCommitteeOrAdmin(["equip_review"]).catch(() => null);
  if (!session) redirect("/dashboard");
  const userId = (session.user as { id?: string }).id ?? "";

  // Sync the canonical VL round dates from lib/equip/calendar.ts
  // into EquipDeadline rows so the submit-gate stays in sync
  // with the published schedule. Idempotent — only inserts what's
  // missing on each page load.
  await syncRoundsToDeadlines(userId);

  const deadlines = await listDeadlines();

  // Serialize Dates for the client component (Next.js doesn't
  // serialize Date instances across server/client; ISO strings
  // round-trip cleanly).
  const initial = deadlines.map((d) => ({
    id: d.id,
    stream: d.stream,
    deadlineAt: d.deadlineAt.toISOString(),
    originalDeadlineAt: d.originalDeadlineAt.toISOString(),
    status: d.status,
    cycleLabel: d.cycleLabel,
    note: d.note,
    closedAt: d.closedAt?.toISOString() ?? null,
    extendedAt: d.extendedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      {/* Back-link removed — the editorial hero owns the top of the
          page; sidebar handles cross-page navigation. */}
      <PageHeader
        title={<span className="inline-flex items-center gap-2"><CalendarClock size={22} className="text-brand-600" /> Equip deadlines</span>}
        description="Funding windows for VentureConnect (monthly, $5K cap) and VentureLift (quarterly, $25K cap). The VentureLift round schedule below is the canonical published timeline — its pre-screening + full-application dates auto-sync into the deadlines table for the submit-gate. Use the New-deadline form for one-off VentureConnect windows and ad-hoc overrides."
      />

      <RoundTimeline />

      <DeadlineManager initial={initial} />
    </div>
  );
}
