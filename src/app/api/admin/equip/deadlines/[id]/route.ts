/**
 * Single Equip deadline.
 *
 *   PATCH  /api/admin/equip/deadlines/[id]
 *     action=extend      → push the deadline forward, status stays
 *                          effectively-open ("extended"). Records
 *                          extendedAt + extendedById.
 *     action=close       → block submissions (status=closed).
 *     action=reopen      → admin escape hatch — flip back to "open"
 *                          without changing dates. Useful when a
 *                          window was closed prematurely.
 *     action=update_meta → edit cycleLabel / note in place. Also
 *                          accepts `deadlineAt` for a HARD edit of
 *                          the date (e.g. correcting an auto-synced
 *                          prepopulated row). Unlike `extend`, this
 *                          overwrites both `deadlineAt` AND
 *                          `originalDeadlineAt` and clears any prior
 *                          `extendedAt`/`extendedById` marker, so
 *                          the row reads as a fresh value with no
 *                          extension audit trail. Use `extend` when
 *                          you're pushing an already-announced
 *                          deadline forward and want the history
 *                          preserved; use `update_meta` with
 *                          `deadlineAt` when you're correcting a
 *                          mistakenly-prepopulated date.
 *
 *   DELETE /api/admin/equip/deadlines/[id]   hard delete
 *     Only allowed when the window has no submissions counted
 *     against it (we can't enforce that strictly — we don't link
 *     applications to a deadline row — but the admin gets a
 *     warning + confirmation client-side).
 *
 * Authn: admin OR equip_review committee.
 */
import { NextResponse } from "next/server";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCommitteeOrAdmin(["equip_review"], ["equip_grant_reviewer"]);
  const actorId = (session.user as { id?: string }).id ?? "";
  const { id } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = typeof body.action === "string" ? body.action : "";

  const existing = await prisma.equipDeadline.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  let data: Record<string, unknown> = {};

  if (action === "extend") {
    const newDeadlineRaw = typeof body.deadlineAt === "string" ? body.deadlineAt : "";
    const newDeadline = new Date(newDeadlineRaw);
    if (isNaN(newDeadline.getTime())) {
      return NextResponse.json({ error: "Invalid new deadline" }, { status: 400 });
    }
    if (newDeadline.getTime() <= existing.deadlineAt.getTime()) {
      return NextResponse.json(
        { error: "Extended deadline must be AFTER the current deadline." },
        { status: 400 },
      );
    }
    data = {
      deadlineAt: newDeadline,
      status: "extended",
      extendedAt: now,
      extendedById: actorId,
      // Reopening implicitly when extending after a manual close
      // — if you extend a closed deadline you want it to accept
      // submissions again.
      closedAt: null,
      closedById: null,
      ...(typeof body.note === "string" && body.note.length > 0
        ? { note: body.note.slice(0, 500) }
        : {}),
    };
  } else if (action === "close") {
    data = {
      status: "closed",
      closedAt: now,
      closedById: actorId,
      ...(typeof body.note === "string" && body.note.length > 0
        ? { note: body.note.slice(0, 500) }
        : {}),
    };
  } else if (action === "reopen") {
    if (existing.status !== "closed") {
      return NextResponse.json({ error: "Only closed deadlines can be reopened" }, { status: 400 });
    }
    if (existing.deadlineAt.getTime() < now.getTime()) {
      return NextResponse.json(
        { error: "This deadline has already passed; extend it instead." },
        { status: 400 },
      );
    }
    data = {
      status: existing.extendedAt ? "extended" : "open",
      closedAt: null,
      closedById: null,
    };
  } else if (action === "update_meta") {
    if (typeof body.cycleLabel === "string") data.cycleLabel = body.cycleLabel.slice(0, 100) || null;
    if (typeof body.note === "string") data.note = body.note.slice(0, 500) || null;
    // Hard date edit — overwrites both deadlineAt + originalDeadlineAt
    // and clears any prior extension audit. Use the `extend` action
    // instead to preserve the "originally X" trail when announcing a
    // later deadline to applicants.
    if (typeof body.deadlineAt === "string" && body.deadlineAt.length > 0) {
      const newDate = new Date(body.deadlineAt);
      if (isNaN(newDate.getTime())) {
        return NextResponse.json({ error: "Invalid deadline date" }, { status: 400 });
      }
      data.deadlineAt = newDate;
      data.originalDeadlineAt = newDate;
      data.extendedAt = null;
      data.extendedById = null;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const updated = await prisma.equipDeadline.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: `equip_deadline.${action}`,
      targetType: "equip_deadline",
      targetId: id,
      detail: JSON.stringify({ before: { status: existing.status, deadlineAt: existing.deadlineAt }, changes: data }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, deadline: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCommitteeOrAdmin(["equip_review"], ["equip_grant_reviewer"]);
  const actorId = (session.user as { id?: string }).id ?? "";
  const { id } = await params;

  const existing = await prisma.equipDeadline.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.equipDeadline.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "equip_deadline.delete",
      targetType: "equip_deadline",
      targetId: id,
      detail: JSON.stringify({ stream: existing.stream, deadlineAt: existing.deadlineAt, status: existing.status }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
