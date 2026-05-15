/**
 * POST /api/admin/courses/thumbnail-overlay/batch
 *
 * Apply (or clear) a colour / gradient overlay across a list of
 * course OR pathway IDs in one request. Admin-only — called from
 * /admin/cover-art's overlay builder.
 *
 * Body:
 *   {
 *     kind?: "course" | "pathway",   // default "course"; ignored when ids is empty
 *     ids?: string[],                // courses or pathways to stamp
 *     overlay: ThumbnailOverlay | null,
 *     saveAsDefault?: boolean,       // also persist this overlay as the
 *                                    //   platform-wide default that
 *                                    //   regenerate endpoints apply
 *                                    //   to future thumbnails (only when
 *                                    //   the target has no per-item
 *                                    //   overlay of its own). When the
 *                                    //   overlay is null, the default
 *                                    //   gets cleared too.
 *   }
 *
 * Either ids[] or saveAsDefault must be set. The overlay blob is
 * validated through `parseOverlay` before being persisted — bad
 * shapes are rejected with 400.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOverlay } from "@/lib/courses/thumbnail-overlay";
import { setDefaultThumbnailOverlay } from "@/lib/courses/thumbnail-overlay-default";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { kind?: unknown; ids?: unknown; overlay?: unknown; saveAsDefault?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

  const kind: "course" | "pathway" = body.kind === "pathway" ? "pathway" : "course";
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];
  const saveAsDefault = body.saveAsDefault === true;

  if (ids.length === 0 && !saveAsDefault) {
    return NextResponse.json(
      { error: "Pick at least one item OR enable saveAsDefault." },
      { status: 400 },
    );
  }

  // Validate the overlay shape once. Null = explicit clear signal.
  let overlay: ReturnType<typeof parseOverlay> | null = null;
  let overlayJson: Prisma.InputJsonValue | null;
  if (body.overlay === null) {
    overlayJson = null;
  } else {
    overlay = parseOverlay(body.overlay);
    if (!overlay) {
      return NextResponse.json({ error: "Invalid overlay shape" }, { status: 400 });
    }
    overlayJson = overlay as unknown as Prisma.InputJsonValue;
  }

  // ── Per-item batch update ───────────────────────────────────
  let updated = 0;
  if (ids.length > 0) {
    // Prisma needs the DbNull sentinel to actually write NULL to a
    // JSON column — passing literal null leaves the field unchanged.
    const data = {
      thumbnailOverlay: overlayJson === null ? Prisma.DbNull : overlayJson,
    };
    if (kind === "pathway") {
      const r = await prisma.pathway.updateMany({ where: { id: { in: ids } }, data });
      updated = r.count;
    } else {
      const r = await prisma.course.updateMany({ where: { id: { in: ids } }, data });
      updated = r.count;
    }
  }

  // ── Site-wide default ───────────────────────────────────────
  let defaultSaved = false;
  let defaultCleared = false;
  if (saveAsDefault) {
    await setDefaultThumbnailOverlay(overlay ?? null);
    if (overlay) defaultSaved = true;
    else defaultCleared = true;
  }

  return NextResponse.json({
    ok: true,
    kind,
    updated,
    defaultSaved,
    defaultCleared,
  });
}
