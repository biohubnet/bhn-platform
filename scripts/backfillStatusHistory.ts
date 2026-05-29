/**
 * One-off backfill for the reporting suite.
 *
 * Synthesizes a single ApplicationStatusHistory row per existing
 * ApplicationStatus so the cohort funnel + "furthest stage reached"
 * work on applications created before the transition service started
 * writing history. Each synthetic row is
 *   { fromStage: null, toStage: <current status>, changedAt: stageEnteredAt }.
 *
 * Intermediate per-stage cycle times are unavailable for these legacy
 * rows (a single event, not a chain) — documented limitation. Live
 * transitions from now on record the full chain in the same tx as the
 * AuditLog write (see src/lib/hiring/transitions.ts).
 *
 * Idempotent: skips any ApplicationStatus that already has history, so
 * it's safe to re-run. Must run AFTER the 20260803000000_reporting_suite
 * migration has been applied (the table must exist).
 *
 * Run: npx tsx scripts/backfillStatusHistory.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const BATCH = 500;
  let cursor: string | undefined;
  let scanned = 0;
  let created = 0;

  for (;;) {
    const rows = await prisma.applicationStatus.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        postingId: true,
        status: true,
        stageEnteredAt: true,
        _count: { select: { statusHistory: true } },
      },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;
    scanned += rows.length;

    const toCreate = rows
      .filter((r) => r._count.statusHistory === 0)
      .map((r) => ({
        applicationStatusId: r.id,
        postingId:           r.postingId,
        fromStage:           null as string | null,
        toStage:             r.status,
        changedAt:           r.stageEnteredAt,
      }));

    if (toCreate.length > 0) {
      await prisma.applicationStatusHistory.createMany({ data: toCreate });
      created += toCreate.length;
    }
    console.log(`  scanned ${scanned}, backfilled ${created}`);
  }

  console.log(`Done. Backfilled ${created} synthetic history rows across ${scanned} applications.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
