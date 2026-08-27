/**
 * Batch-edit endpoint for internship postings. Admin-only.
 *
 *   POST /api/admin/internships/batch
 *   body: { ids: string[]; action: "delete" | "activate" | "close" | "draft" }
 *
 * - "delete"   → permanent removal of the posting rows.
 * - "activate" → status = "active"
 * - "close"    → status = "closed"
 * - "draft"    → status = "draft"
 *
 * `ids` is capped at 200 per request — well above any realistic
 * admin batch but defensive against accidental select-all on a
 * runaway list. Returns `{ ok, affected }`.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
export const runtime = "nodejs";

type BatchAction = "delete" | "activate" | "close" | "draft";
const ALLOWED: BatchAction[] = ["delete", "activate", "close", "draft"];

interface Body {
  ids?: unknown;
  action?: unknown;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === "string" && v.length > 0).slice(0, 200)
    : [];
  const action = body.action;

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array of strings" }, { status: 400 });
  }
  if (typeof action !== "string" || !ALLOWED.includes(action as BatchAction)) {
    return NextResponse.json(
      { error: `action must be one of ${ALLOWED.join(", ")}` },
      { status: 400 }
    );
  }

  let affected = 0;
  if (action === "delete") {
    const r = await prisma.internshipPosting.deleteMany({ where: { id: { in: ids } } });
    affected = r.count;
  } else {
    const status =
      action === "activate" ? "active" :
      action === "close"    ? "closed" : "draft";
    const r = await prisma.internshipPosting.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    affected = r.count;
  }

  // Audit log — single row carries the action + all affected ids so
  // an admin can later diff what was bulk-edited.
  const actorId = (session.user as { id?: string }).id ?? null;
  if (actorId) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action: `admin.internships.batch.${action}`,
        targetType: "internship_posting",
        detail: JSON.stringify({ ids, count: affected }),
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, affected });
}
