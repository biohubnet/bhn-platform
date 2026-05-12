/**
 * Admin: list + create cohorts for a pathway.
 *
 *   GET  /api/admin/pathways/[id]/cohorts
 *   POST /api/admin/pathways/[id]/cohorts
 *     body: { slug, name, description?, startDate, endDate?, capacity,
 *             allowWaitlist?, waitlistCapacity?,
 *             enrollmentOpensAt?, enrollmentClosesAt?, status?,
 *             displayOrder? }
 *
 * Slug uniqueness is per-pathway — two pathways can both have a
 * "spring-2026" cohort. The schema's compound unique enforces it.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cohortAvailability } from "@/lib/pathways/cohorts";

export const runtime = "nodejs";

const VALID_STATUSES = ["draft", "open", "closed", "archived"] as const;
function isStatus(s: unknown): s is (typeof VALID_STATUSES)[number] {
  return typeof s === "string" && (VALID_STATUSES as readonly string[]).includes(s);
}

interface CreateBody {
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

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const cohorts = await cohortAvailability(id);
  return NextResponse.json({ ok: true, cohorts });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: pathwayId } = await ctx.params;
  const pathway = await prisma.pathway.findUnique({
    where: { id: pathwayId },
    select: { id: true },
  });
  if (!pathway) return NextResponse.json({ error: "Pathway not found" }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as CreateBody;

  // Required-field validation.
  if (typeof b.slug !== "string" || !b.slug.match(/^[a-z0-9][a-z0-9-]{0,40}$/)) {
    return NextResponse.json(
      { error: "slug required, kebab-case, ≤ 41 chars" },
      { status: 400 },
    );
  }
  if (typeof b.name !== "string" || b.name.trim().length === 0) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (typeof b.startDate !== "string" || Number.isNaN(new Date(b.startDate).getTime())) {
    return NextResponse.json({ error: "startDate must be a valid ISO date" }, { status: 400 });
  }
  if (typeof b.capacity !== "number" || b.capacity < 1) {
    return NextResponse.json({ error: "capacity must be ≥ 1" }, { status: 400 });
  }
  if (b.status !== undefined && !isStatus(b.status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // Parse optional dates with a single helper.
  const parseOpt = (v: string | null | undefined): Date | null => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  try {
    const cohort = await prisma.pathwayCohort.create({
      data: {
        pathwayId,
        slug: b.slug,
        name: b.name.trim(),
        description: b.description?.trim() || null,
        startDate: new Date(b.startDate),
        endDate: parseOpt(b.endDate),
        capacity: b.capacity,
        allowWaitlist: b.allowWaitlist ?? true,
        waitlistCapacity: typeof b.waitlistCapacity === "number" ? b.waitlistCapacity : null,
        enrollmentOpensAt: parseOpt(b.enrollmentOpensAt),
        enrollmentClosesAt: parseOpt(b.enrollmentClosesAt),
        status: b.status ?? "draft",
        displayOrder: b.displayOrder ?? 0,
      },
    });
    return NextResponse.json({ ok: true, cohort });
  } catch (e) {
    const msg = (e as Error).message;
    // Unique constraint = duplicate slug for this pathway.
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A cohort with that slug already exists on this pathway." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
