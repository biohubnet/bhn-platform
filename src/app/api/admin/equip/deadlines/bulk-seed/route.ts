/**
 * POST /api/admin/equip/deadlines/bulk-seed?endYear=2028
 *
 * Pre-populates EquipDeadline rows for the standard published
 * cadence (VC monthly on the 25th, VL quarterly on Feb/May/Aug/
 * Nov 22) from "right now" through the end of `endYear`. Default
 * endYear is the current year + 2 so admins can call it without
 * a query param and get a reasonable horizon.
 *
 * Idempotent: each candidate row is checked against existing
 * deadlines for the same stream on the same Toronto calendar
 * date. Anything already scheduled there is skipped — admins
 * who hand-scheduled a specific cycle keep their override.
 *
 * Authn: admin OR equip_review committee (same posture as the
 * rest of the deadlines endpoints).
 */
import { NextResponse } from "next/server";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";
import { generateStandardSchedule, torontoDateKey } from "@/lib/equip/schedule";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await requireCommitteeOrAdmin(["equip_review"]);
  const actorId = (session.user as { id?: string }).id ?? "";
  const url = new URL(req.url);
  const endYearRaw = url.searchParams.get("endYear");
  const endYear = endYearRaw
    ? Math.min(2035, Math.max(new Date().getFullYear(), parseInt(endYearRaw, 10)))
    : new Date().getFullYear() + 2;

  const specs = generateStandardSchedule({
    fromDate: new Date(),
    endYear,
  });

  // Load existing deadlines once, build a lookup keyed by
  // (stream, Toronto calendar date). One query covers all
  // streams + the full horizon — small table, no need to slice.
  const existing = await prisma.equipDeadline.findMany({
    where: { deadlineAt: { gte: new Date() } },
    select: { id: true, stream: true, deadlineAt: true },
  });
  const existingKeys = new Set(
    existing.map((d) => `${d.stream}|${torontoDateKey(d.deadlineAt)}`),
  );

  const toCreate = specs.filter((s) => {
    const key = `${s.stream}|${torontoDateKey(s.deadlineAt)}`;
    return !existingKeys.has(key);
  });

  if (toCreate.length === 0) {
    return NextResponse.json({
      ok: true,
      created: 0,
      skipped: specs.length,
      message: `Already up to date — ${specs.length} deadlines on the standard cadence exist through ${endYear}.`,
    });
  }

  await prisma.equipDeadline.createMany({
    data: toCreate.map((s) => ({
      stream: s.stream,
      deadlineAt: s.deadlineAt,
      originalDeadlineAt: s.deadlineAt,
      status: "open",
      cycleLabel: s.cycleLabel,
      createdById: actorId,
    })),
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "equip_deadline.bulk_seed",
      targetType: "equip_deadline",
      targetId: "schedule",
      detail: JSON.stringify({
        endYear,
        created: toCreate.length,
        skipped: specs.length - toCreate.length,
        sample: toCreate.slice(0, 3).map((s) => ({
          stream: s.stream,
          deadlineAt: s.deadlineAt.toISOString(),
          cycleLabel: s.cycleLabel,
        })),
      }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    created: toCreate.length,
    skipped: specs.length - toCreate.length,
    endYear,
    message: `Created ${toCreate.length} deadline${toCreate.length === 1 ? "" : "s"} on the standard cadence (VC monthly 25th · VL quarterly Feb/May/Aug/Nov 22) through end of ${endYear}.`,
  });
}
