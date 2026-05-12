/**
 * Admin: delete or extend a single phantom user.
 *
 *   DELETE /api/admin/phantom-users/[id]
 *   POST   /api/admin/phantom-users/[id]/extend  (handled in sibling route)
 *
 * Defence: deletePhantom() refuses to touch any user whose
 * accountKind isn't "phantom" even if the caller URL is hand-rolled.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { deletePhantom } from "@/lib/phantom";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const r = await deletePhantom(id);
  if (!r.ok) {
    const status = r.reason === "not_found" ? 404 : r.reason === "not_a_phantom" ? 400 : 500;
    return NextResponse.json({ error: r.reason ?? "Delete failed" }, { status });
  }
  return NextResponse.json({ ok: true });
}
