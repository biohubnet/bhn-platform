/**
 * Admin: extend a phantom's TTL.
 *
 *   POST /api/admin/phantom-users/[id]/extend
 *     body: { hours: number }   (clamped to [1, PHANTOM_TTL_MAX_HOURS])
 *
 * Capped at PHANTOM_TTL_MAX_HOURS from the original spawn so a chain
 * of extensions can't promote a phantom into a permanent fixture —
 * if admins want long-lived test users they should use sandbox or
 * showcase accounts instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { extendPhantom, PHANTOM_TTL_DEFAULT_HOURS, PHANTOM_TTL_MAX_HOURS } from "@/lib/phantom";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { hours?: unknown };
  const hours =
    typeof body.hours === "number" && Number.isFinite(body.hours)
      ? body.hours
      : PHANTOM_TTL_DEFAULT_HOURS;
  if (hours < 1 || hours > PHANTOM_TTL_MAX_HOURS) {
    return NextResponse.json(
      { error: `hours must be between 1 and ${PHANTOM_TTL_MAX_HOURS}` },
      { status: 400 },
    );
  }

  const r = await extendPhantom(id, hours);
  if (!r.ok) {
    const status = r.reason === "not_found" ? 404 : r.reason === "not_a_phantom" ? 400 : 500;
    return NextResponse.json({ error: r.reason ?? "Extend failed" }, { status });
  }
  return NextResponse.json({ ok: true, expiresAt: r.expiresAt?.toISOString() });
}
