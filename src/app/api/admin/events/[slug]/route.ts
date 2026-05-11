/**
 * Admin event basics editor.
 *
 *   PATCH /api/admin/events/[slug]
 *     body: any subset of editable fields (partial update). null
 *     clears a nullable field; omit a key to leave it alone.
 *
 * Edits supported in Phase 1
 *   • title / tagline / description
 *   • startDate / endDate
 *   • timezone
 *   • mainVenue{Name,Address,MapUrl}
 *   • coverImageUrl
 *   • accommodationInfo
 *   • status: draft | published | archived
 *   • registrationOpensAt / registrationClosesAt
 *
 * Workshops, sessions, speakers, sponsors are not editable here —
 * those are managed via the seed file / Prisma Studio until a
 * future Phase brings dedicated admin CRUD.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_STATUSES = ["draft", "published", "archived"] as const;
type Status = (typeof VALID_STATUSES)[number];
function isStatus(s: unknown): s is Status {
  return typeof s === "string" && (VALID_STATUSES as readonly string[]).includes(s);
}

interface Body {
  title?: string;
  tagline?: string | null;
  description?: string | null;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  mainVenueName?: string | null;
  mainVenueAddress?: string | null;
  mainVenueMapUrl?: string | null;
  coverImageUrl?: string | null;
  accommodationInfo?: string | null;
  status?: Status;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({ where: { slug }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Body;

  if (body.status !== undefined && !isStatus(body.status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // Date parsing helper — accepts ISO string, returns Date or 400.
  function parseDate(key: string, v: string | null | undefined): Date | null | undefined {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`${key} must be a valid ISO date or null`);
    }
    return d;
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.tagline !== undefined) data.tagline = body.tagline?.trim() || null;
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.timezone !== undefined) data.timezone = body.timezone.trim();
  if (body.mainVenueName !== undefined) data.mainVenueName = body.mainVenueName?.trim() || null;
  if (body.mainVenueAddress !== undefined) data.mainVenueAddress = body.mainVenueAddress?.trim() || null;
  if (body.mainVenueMapUrl !== undefined) data.mainVenueMapUrl = body.mainVenueMapUrl?.trim() || null;
  if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl?.trim() || null;
  if (body.accommodationInfo !== undefined) data.accommodationInfo = body.accommodationInfo?.trim() || null;
  if (body.status !== undefined) data.status = body.status;

  try {
    if (body.startDate !== undefined) data.startDate = parseDate("startDate", body.startDate);
    if (body.endDate !== undefined) data.endDate = parseDate("endDate", body.endDate);
    if (body.registrationOpensAt !== undefined)
      data.registrationOpensAt = parseDate("registrationOpensAt", body.registrationOpensAt);
    if (body.registrationClosesAt !== undefined)
      data.registrationClosesAt = parseDate("registrationClosesAt", body.registrationClosesAt);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // startDate / endDate are NOT NULL in the schema — reject explicit null.
  if (data.startDate === null) {
    return NextResponse.json({ error: "startDate cannot be null" }, { status: 400 });
  }
  if (data.endDate === null) {
    return NextResponse.json({ error: "endDate cannot be null" }, { status: 400 });
  }

  const updated = await prisma.bhnEvent.update({ where: { id: event.id }, data });
  return NextResponse.json({ ok: true, event: updated });
}
