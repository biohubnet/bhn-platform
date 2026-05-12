/**
 * Admin: edit or delete a specific cohort.
 *
 *   PATCH  /api/admin/pathways/[id]/cohorts/[cohortId]
 *   DELETE /api/admin/pathways/[id]/cohorts/[cohortId]
 *
 * DELETE cascades enrollments via the FK SET NULL — those rows stay
 * around for audit but lose their cohort association. We block delete
 * when ≥ 1 confirmed enrollment exists so admins are forced to think
 * about it: the right move is usually to set status="archived"
 * instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_STATUSES = ["draft", "open", "closed", "archived"] as const;
function isStatus(s: unknown): s is (typeof VALID_STATUSES)[number] {
  return typeof s === "string" && (VALID_STATUSES as readonly string[]).includes(s);
}

interface PatchBody {
  slug?: string;
  name?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string | null;
  capacity?: number;
  allowWaitlist?: boolean;
  waitlistCapacity?: number | null;
  enrollmentOpensAt?: string | null;
  enrollmentClosesAt?: string | null;
  status?: string;
  displayOrder?: number;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; cohortId: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: pathwayId, cohortId } = await ctx.params;
  const cohort = await prisma.pathwayCohort.findUnique({
    where: { id: cohortId },
    select: { id: true, pathwayId: true },
  });
  if (!cohort || cohort.pathwayId !== pathwayId) {
    return NextResponse.json({ error: "Cohort not found in this pathway" }, { status: 404 });
  }

  const b = (await req.json().catch(() => ({}))) as PatchBody;

  if (b.status !== undefined && !isStatus(b.status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const parseDate = (key: string, v: string | null | undefined): Date | null | undefined => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new Error(`${key} must be a valid ISO date or null`);
    return d;
  };

  const data: Record<string, unknown> = {};
  if (b.slug !== undefined) {
    if (!b.slug.match(/^[a-z0-9][a-z0-9-]{0,40}$/)) {
      return NextResponse.json({ error: "slug must be kebab-case, ≤ 41 chars" }, { status: 400 });
    }
    data.slug = b.slug;
  }
  if (b.name !== undefined) data.name = b.name.trim();
  if (b.description !== undefined) data.description = b.description?.trim() || null;
  if (b.capacity !== undefined) {
    if (typeof b.capacity !== "number" || b.capacity < 1) {
      return NextResponse.json({ error: "capacity must be ≥ 1" }, { status: 400 });
    }
    data.capacity = b.capacity;
  }
  if (b.allowWaitlist !== undefined) data.allowWaitlist = b.allowWaitlist;
  if (b.waitlistCapacity !== undefined)
    data.waitlistCapacity = b.waitlistCapacity === null ? null : Number(b.waitlistCapacity);
  if (b.status !== undefined) data.status = b.status;
  if (b.displayOrder !== undefined) data.displayOrder = b.displayOrder;

  try {
    if (b.startDate !== undefined) {
      const d = parseDate("startDate", b.startDate);
      if (d === null) return NextResponse.json({ error: "startDate is required" }, { status: 400 });
      data.startDate = d;
    }
    if (b.endDate !== undefined) data.endDate = parseDate("endDate", b.endDate);
    if (b.enrollmentOpensAt !== undefined) data.enrollmentOpensAt = parseDate("enrollmentOpensAt", b.enrollmentOpensAt);
    if (b.enrollmentClosesAt !== undefined) data.enrollmentClosesAt = parseDate("enrollmentClosesAt", b.enrollmentClosesAt);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  try {
    const updated = await prisma.pathwayCohort.update({
      where: { id: cohortId },
      data,
    });
    return NextResponse.json({ ok: true, cohort: updated });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Another cohort on this pathway already uses that slug." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; cohortId: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: pathwayId, cohortId } = await ctx.params;
  const cohort = await prisma.pathwayCohort.findUnique({
    where: { id: cohortId },
    select: { id: true, pathwayId: true },
  });
  if (!cohort || cohort.pathwayId !== pathwayId) {
    return NextResponse.json({ error: "Cohort not found in this pathway" }, { status: 404 });
  }

  // Block delete when there are non-withdrawn enrollments. Archiving
  // is the right move for past cohorts.
  const activeCount = await prisma.pathwayEnrollment.count({
    where: { cohortId, status: { notIn: ["withdrawn", "rejected"] } },
  });
  if (activeCount > 0) {
    return NextResponse.json(
      {
        error: `This cohort has ${activeCount} active enrollment${activeCount === 1 ? "" : "s"}. Set status to 'archived' instead, or withdraw the enrollments first.`,
        code: "has_enrollments",
      },
      { status: 409 },
    );
  }

  await prisma.pathwayCohort.delete({ where: { id: cohortId } });
  return NextResponse.json({ ok: true });
}
