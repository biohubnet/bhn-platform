/**
 * Admin: persist a new catalog tile order.
 *
 *   POST /api/admin/courses/reorder
 *     body: { orderedIds: string[] }
 *
 * The client sends the full visible-tile ordering. We translate it
 * to a per-row displayOrder starting at 1 and increasing by 1 for
 * each subsequent id, so the catalog query (ORDER BY displayOrder
 * ASC, createdAt DESC) renders them in exactly the dragged order.
 *
 * Courses NOT in the payload are left untouched — keeps the cost
 * bounded to the number of rows the admin actually rearranged.
 * Two rows landing on the same displayOrder is harmless; the
 * createdAt DESC tiebreaker resolves it.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BATCH = 500;

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { orderedIds?: unknown };
  if (
    !Array.isArray(body.orderedIds) ||
    !body.orderedIds.every((id) => typeof id === "string")
  ) {
    return NextResponse.json(
      { error: "orderedIds must be an array of strings" },
      { status: 400 },
    );
  }
  const ids = body.orderedIds.filter((id): id is string => typeof id === "string");
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Cannot reorder more than ${MAX_BATCH} courses at once.` },
      { status: 400 },
    );
  }

  // One UPDATE per row inside a transaction. The integer-step
  // pattern (1, 2, 3, …) wastes no space and keeps re-rendering
  // predictable; a fractional-index pattern would be more
  // sophisticated but unnecessary at Phase-1 catalog sizes.
  await prisma.$transaction(
    ids.map((id, idx) =>
      prisma.course.update({
        where: { id },
        data: { displayOrder: idx + 1 },
      }),
    ),
  );

  return NextResponse.json({ ok: true, updated: ids.length });
}
