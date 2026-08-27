/**
 * Talent-pool eligibility gate — single + batch endpoint.
 *
 *   POST /api/admin/talent-pool/eligibility
 *   body: { ids: string[]; action: "approve" | "revoke"; note?: string }
 *
 * - "approve" stamps `eligibilityApprovedAt = now`,
 *   `eligibilityApprovedBy = <caller userId>` (and `eligibilityNote`
 *   if provided) on every submission in `ids`.
 * - "revoke" clears those three fields. Useful when an admin
 *   discovers an eligibility issue after the fact.
 *
 * Admin / superadmin / instructor only — the eligibility check is
 * explicitly a "human read" gate, so the same staff roles that can
 * already see the talent pool can also approve eligibility.
 * `ids` is capped at 200/request (defensive against select-all on
 * an unfiltered list).
 *
 * One AuditLog row per batch carries the action + every affected id
 * + the note, so the eligibility decisions are reconstructable from
 * /admin/audit forever.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
export const runtime = "nodejs";

const ALLOWED = ["approve", "revoke"] as const;
type EligibilityAction = (typeof ALLOWED)[number];

const STAFF_ROLES = ["admin", "superadmin", "instructor"];

interface Body {
  ids?: unknown;
  action?: unknown;
  note?: unknown;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role ?? "";
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const actorId = (session.user as { id?: string }).id ?? null;
  if (!actorId) {
    return NextResponse.json({ error: "Missing actor" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === "string" && v.length > 0).slice(0, 200)
    : [];
  const action = body.action;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 4000) : "";

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array of strings" }, { status: 400 });
  }
  if (typeof action !== "string" || !(ALLOWED as readonly string[]).includes(action)) {
    return NextResponse.json(
      { error: `action must be one of ${ALLOWED.join(", ")}` },
      { status: 400 }
    );
  }

  const data =
    action === "approve"
      ? {
          eligibilityApprovedAt: new Date(),
          eligibilityApprovedBy: actorId,
          ...(note ? { eligibilityNote: note } : {}),
        }
      : {
          eligibilityApprovedAt: null,
          eligibilityApprovedBy: null,
          eligibilityNote: note || null,
        };

  const r = await prisma.eventFormSubmission.updateMany({
    where: { id: { in: ids } },
    data,
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: `talent_pool.eligibility.${action as EligibilityAction}`,
      targetType: "event_form_submission",
      detail: JSON.stringify({ ids, count: r.count, note: note || undefined }),
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, affected: r.count });
}
