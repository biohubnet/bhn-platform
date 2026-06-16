/**
 * Resolve / escalate a flagged AI answer in the review queue (admin-only).
 *   PATCH /api/ai/review/[id]  { reviewStatus: "resolved"|"escalated"|"open", note? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }
const STATUSES = new Set(["open", "resolved", "escalated"]);

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as { reviewStatus?: unknown; note?: unknown };
  const reviewStatus = typeof body.reviewStatus === "string" && STATUSES.has(body.reviewStatus) ? body.reviewStatus : null;
  if (!reviewStatus) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.slice(0, 2000) : undefined;

  await prisma.aIInteraction
    .update({
      where: { id },
      data: {
        reviewStatus,
        ...(note !== undefined ? { reviewNote: note } : {}),
        reviewedById: uid,
        reviewedAt: new Date(),
        // Resolved leaves the open queue; escalated/open stay flagged.
        flaggedForReview: reviewStatus !== "resolved",
      },
    })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
