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
import { CalendarClock } from "lucide-react";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";
import { listDeadlines, type DeadlineStatus } from "@/lib/equip/deadlines";
import { derivedDeadlineSpecs, VL_ROUNDS } from "@/lib/equip/calendar";
import { PageHeader } from "@/components/ui/PageHeader";
import { DeadlineManager } from "@/components/admin/equip/DeadlineManager";

export const dynamic = "force-dynamic";

/** Sync: keeps EquipDeadline rows authoritative against the canonical
 *  schedule in derivedDeadlineSpecs(). Order matters:
 *   1. Delete stale/out-of-horizon auto-synced rows FIRST so the
 *      subsequent insert step sees a clean slate.
 *   2. Insert any rows that are now missing.
 *   3. Repair status="open" on rows whose window hasn't opened yet.
 *  Only rows whose note starts with the auto-sync prefix are ever
 *  deleted — admin-created rows are always left alone. */
async function syncRoundsToDeadlines(actorId: string): Promise<number> {
  const specs = derivedDeadlineSpecs();
  if (specs.length === 0) return 0;
  const now    = new Date();
  const halfDay = 12 * 60 * 60 * 1000;

  function specStatus(s: (typeof specs)[number]): DeadlineStatus {
    if (s.deadlineAt < now) return "closed";
    if (s.opensAt <= now)   return "open";
    return "scheduled";
  }

  // ── Step 1: purge stale auto-synced rows ───────────────────────
  // Fetch every row that was written by this function (identified by
  // the note prefix). Delete those that either fall outside the
  // schedule horizon (> 2026) or no longer match any current spec by
  // (stream + date ± 12 h). This cleans up old estimated dates,
  // removed rounds, and VC rows beyond the generation window.
  const autoSynced = await prisma.equipDeadline.findMany({
    where: { note: { startsWith: "Auto-synced" } },
    select: { id: true, stream: true, deadlineAt: true },
  });
  const staleIds = autoSynced
    .filter(
      (row) =>
        row.deadlineAt >= new Date("2027-01-01T00:00:00.000Z") ||
        !specs.some(
          (s) =>
            s.stream === row.stream &&
            Math.abs(s.deadlineAt.getTime() - row.deadlineAt.getTime()) <= halfDay,
        ),
    )
    .map((r) => r.id);
  if (staleIds.length > 0) {
    await prisma.equipDeadline.deleteMany({ where: { id: { in: staleIds } } });
  }

  // ── Step 2: insert missing rows ────────────────────────────────
  // Re-snapshot after the purge so dedup is accurate.
  const remaining = await prisma.equipDeadline.findMany({
    select: { stream: true, deadlineAt: true },
  });
  const seen = new Set(
    remaining.map(
      (d) =>
        `${d.stream}|${d.deadlineAt.toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}`,
    ),
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
        // Rendered to APPLICANTS on the deadline card, so it cannot
        // say "VL round schedule" on a VentureConnect window. The
        // "Auto-synced" prefix is load-bearing — Steps 1, 3 and 3b all
        // key off it to leave admin-created rows alone.
        note: `Auto-synced from the ${s.stream === "venture_connect" ? "VentureConnect monthly" : "VentureLift round"} schedule (${s.stageLabel})`,
        createdById: actorId,
      })),
    });
  }

  // ── Step 3: repair status="open" on not-yet-open windows ───────
  const toSchedule = specs.filter((s) => specStatus(s) === "scheduled");
  if (toSchedule.length > 0) {
    await Promise.all(
      toSchedule.map((s) =>
        prisma.equipDeadline.updateMany({
          where: {
            stream: s.stream,
            deadlineAt: {
              gte: new Date(s.deadlineAt.getTime() - halfDay),
              lte: new Date(s.deadlineAt.getTime() + halfDay),
            },
            status: "open",
            // Scoped to auto-synced rows, matching Step 1. Without it an
            // admin who hand-creates a window (the POST route hardcodes
            // status "open") has it silently demoted on the next page
            // load — and nothing promoted it back, so it never opened.
            note: { startsWith: "Auto-synced" },
          },
          data: { status: "scheduled" },
        }),
      ),
    );
  }

  // ── Step 3b: promote windows whose opening moment has passed ───
  // The mirror of Step 3, and the reason this was only ever half a
  // sync. A window created while still in the future is born
  // "scheduled", and NOTHING promoted it: the submit gate accepts only
  // "open"/"extended", and the reopen endpoint refuses any row that is
  // not "closed". A round configured even a day early was therefore
  // permanently dead — the admin table showed the right date beside a
  // grey badge while every applicant got "no open funding window".
  const toOpen = specs.filter((s) => specStatus(s) === "open");
  if (toOpen.length > 0) {
    await Promise.all(
      toOpen.map((s) =>
        prisma.equipDeadline.updateMany({
          where: {
            stream: s.stream,
            deadlineAt: {
              gte: new Date(s.deadlineAt.getTime() - halfDay),
              lte: new Date(s.deadlineAt.getTime() + halfDay),
            },
            status: "scheduled",
            note: { startsWith: "Auto-synced" },
          },
          data: { status: "open" },
        }),
      ),
    );
  }

  return toCreate.length;
}

export default async function AdminEquipDeadlinesPage() {
  const session = await requireCommitteeOrAdmin(["equip_review"], ["equip_grant_reviewer"]).catch(() => null);
  if (!session) redirect("/dashboard");
  const userId = (session.user as { id?: string }).id ?? "";

  // Sync the canonical VL round dates from lib/equip/calendar.ts
  // into EquipDeadline rows so the submit-gate stays in sync
  // with the published schedule. Idempotent — only inserts what's
  // missing on each page load.
  await syncRoundsToDeadlines(userId);

  const deadlines = await listDeadlines();

  // Flatten VL_ROUNDS into plain serialisable stage items for the
  // client component (server constants can't cross the boundary as-is
  // when they contain non-serialisable values — plain objects are safe).
  const vlRoundStages = VL_ROUNDS.flatMap((r) =>
    r.stages.map((s) => ({
      roundNumber: r.roundNumber,
      roundLabel:  r.label,
      roundYear:   r.year,
      stageKey:    s.key as string,
      stageLabel:  s.label,
      date:        s.date,
      endDate:     s.endDate ?? null,
      approximate: s.approximate ?? false,
      tone:        s.tone,
    }))
  );

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
      {/*
        Surrounding the hero in a single gradient-washed card unifies
        the page's visual identity around one brand-tinted family.
        The thin hairline divider underneath the description acts as
        the page's "this is the chrome, content starts now" beat —
        ties the dense DeadlineManager below to the same column.
      */}
      <section
        className="rounded-2xl border border-line/70 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--brand-50) 60%, var(--card)) 0%, var(--card) 70%)",
        }}
      >
        <div className="px-5 sm:px-7 py-5 sm:py-6">
          <PageHeader
            title={
              <span className="inline-flex items-center gap-2">
                <CalendarClock size={22} className="text-brand-600" />
                Equip deadlines
              </span>
            }
            description="Funding windows for VentureConnect (monthly, $5K cap) and VentureLift (quarterly, $25K cap). The VentureLift round schedule below is the canonical published timeline — its pre-screening + full-application dates auto-sync into the deadlines table for the submit-gate. Use the New-deadline form for one-off VentureConnect windows and ad-hoc overrides."
          />
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-brand-200/70 to-transparent" />
      </section>

      <DeadlineManager initial={initial} vlRoundStages={vlRoundStages} />
    </div>
  );
}
