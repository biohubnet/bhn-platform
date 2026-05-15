/**
 * POST /api/admin/courses/thumbnail-overlay/batch
 *
 * Apply (or clear) a single colour / gradient overlay across a list
 * of course IDs in one request. Admin-only — the endpoint is called
 * from /admin/course-thumbnails after the operator builds the overlay
 * in the panel and ticks which courses to stamp it onto.
 *
 * Body shape:
 *   {
 *     ids: string[],                // course IDs (non-empty)
 *     overlay: ThumbnailOverlay | null,  // null clears
 *   }
 *
 * The overlay blob is validated through `parseOverlay` before being
 * persisted — bad shapes are rejected with 400 rather than written.
 * Clear-overlay uses `null` so a single endpoint covers both apply
 * and clear without a delete-by-querystring contortion.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOverlay } from "@/lib/courses/thumbnail-overlay";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { ids?: unknown; overlay?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids[] is required" }, { status: 400 });
  }

  // overlay === null is the explicit clear signal. Otherwise we
  // validate the shape; reject rather than silently coerce.
  let overlayJson: Prisma.InputJsonValue | null;
  if (body.overlay === null) {
    overlayJson = null;
  } else {
    const parsed = parseOverlay(body.overlay);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid overlay shape" }, { status: 400 });
    }
    // Cast through unknown — parseOverlay's return type is a plain
    // object so it's structurally a Prisma JSON value.
    overlayJson = parsed as unknown as Prisma.InputJsonValue;
  }

  const result = await prisma.course.updateMany({
    where: { id: { in: ids } },
    data: {
      // Prisma needs the DbNull sentinel to actually write NULL to a
      // JSON column — passing literal null leaves the field unchanged.
      thumbnailOverlay: overlayJson === null ? Prisma.DbNull : overlayJson,
    },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
