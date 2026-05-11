/**
 * Bulk action on a set of InternshipPosting rows.
 *
 *   POST /api/employer/postings/bulk
 *     body: { ids: string[], action: "expire" | "delete" }
 *
 *   • "expire" — sets status="expired" on every owned posting in
 *     the set. Idempotent: already-expired rows just stay expired.
 *   • "delete" — hard deletes. Cascade on related child rows
 *     (PostingSkill, ApplicationStatus, Interview, UserSavedPosting)
 *     happens via the FKs set on those models.
 *
 * Ownership: each id is checked against createdById. Non-admin
 * callers silently skip ids they don't own (don't leak existence).
 * Admins can act on any id.
 *
 * Capped at 200 ids per call so a runaway client can't drop the
 * whole catalog in one request.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_IDS = 200;
const VALID_ACTIONS = ["expire", "delete"] as const;
type Action = (typeof VALID_ACTIONS)[number];

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isAdmin = role === "admin" || role === "superadmin";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const { ids, action } = body as { ids?: unknown; action?: unknown };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: `Too many ids (${ids.length}). Max ${MAX_IDS} per call.` },
      { status: 400 },
    );
  }
  if (!ids.every((id): id is string => typeof id === "string" && id.length > 0)) {
    return NextResponse.json({ error: "every id must be a non-empty string" }, { status: 400 });
  }
  if (typeof action !== "string" || !(VALID_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }
  const verb = action as Action;

  // Filter to ids the caller is allowed to touch. Non-admins are
  // limited to their own postings; admin sees them all.
  const owned = await prisma.internshipPosting.findMany({
    where: {
      id: { in: ids },
      ...(isAdmin ? {} : { createdById: userId }),
    },
    select: { id: true },
  });
  const allowedIds = owned.map((p) => p.id);

  if (allowedIds.length === 0) {
    return NextResponse.json({
      ok: true,
      action: verb,
      affected: 0,
      skipped: ids.length,
    });
  }

  if (verb === "expire") {
    const result = await prisma.internshipPosting.updateMany({
      where: { id: { in: allowedIds } },
      data: { status: "expired" },
    });
    return NextResponse.json({
      ok: true,
      action: verb,
      affected: result.count,
      skipped: ids.length - allowedIds.length,
    });
  }

  // verb === "delete"
  const result = await prisma.internshipPosting.deleteMany({
    where: { id: { in: allowedIds } },
  });
  return NextResponse.json({
    ok: true,
    action: verb,
    affected: result.count,
    skipped: ids.length - allowedIds.length,
  });
}
