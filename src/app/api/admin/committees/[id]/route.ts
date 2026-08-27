/**
 * Single committee membership.
 *
 *   PATCH  /api/admin/committees/[id]   toggle active, edit note
 *   DELETE /api/admin/committees/[id]   revoke (soft — sets active=false + leftAt=now)
 *
 * Soft-delete preserves the audit trail. A fully-deleted row is
 * indistinguishable from "never a member"; keeping the row with
 * active=false lets the admin page show "Past members" if we want
 * that view later and lets the audit log link back to a real row.
 */
import { NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id ?? "";
  const { id } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const existing = await prisma.committeeMembership.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") {
    data.active = body.active;
    data.leftAt = body.active ? null : new Date();
  }
  if (typeof body.note === "string") {
    data.note = body.note.slice(0, 500);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.committeeMembership.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: data.active === false ? "committee.revoke_member" : "committee.update_member",
      targetType: "user",
      targetId: existing.userId,
      detail: JSON.stringify({ committee: existing.committee, changes: data }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, membership: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id ?? "";
  const { id } = await params;

  const existing = await prisma.committeeMembership.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft revoke. See file header.
  const updated = await prisma.committeeMembership.update({
    where: { id },
    data: { active: false, leftAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "committee.revoke_member",
      targetType: "user",
      targetId: existing.userId,
      detail: JSON.stringify({ committee: existing.committee }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, membership: updated });
}
