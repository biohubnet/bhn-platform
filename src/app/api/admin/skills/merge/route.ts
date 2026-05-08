import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { mergeSkills } from "@/lib/skills/ontology";

/**
 * Merge two skills into one. The "loser" disappears from the active
 * vocabulary; its tags re-point to the winner; its aliases follow.
 *
 *   POST /api/admin/skills/merge { loserId, winnerId }
 */
export async function POST(req: NextRequest) {
  await requireRole("admin");
  const body = (await req.json().catch(() => ({}))) as { loserId?: string; winnerId?: string };
  if (!body.loserId || !body.winnerId) {
    return NextResponse.json({ error: "loserId and winnerId required" }, { status: 400 });
  }
  if (body.loserId === body.winnerId) {
    return NextResponse.json({ error: "cannot merge into self" }, { status: 400 });
  }
  const ok = await mergeSkills(body.loserId, body.winnerId);
  return NextResponse.json({ ok });
}
