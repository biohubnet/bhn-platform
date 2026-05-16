/**
 * Single HQP action item.
 *   PATCH update status / resolution note.
 *
 * Authn: must be the assignee, the creator, or an admin.
 */
import { NextResponse } from "next/server";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED = new Set(["open", "in_progress", "done", "cancelled"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCommitteeOrAdmin(["hqp"]);
  const userId = (session.user as { id?: string }).id ?? "";
  const role = (session.user as { role?: string }).role ?? "";
  const isAdmin = role === "admin" || role === "superadmin";
  const { id } = await params;
  const existing = await prisma.hqpActionItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Member auth — only assignee or creator (or admin) can edit.
  if (!isAdmin && existing.assignedToId !== userId && existing.createdById !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const data: Record<string, unknown> = {};
  if (typeof body.status === "string" && ALLOWED.has(body.status)) {
    data.status = body.status;
    if (body.status === "done" || body.status === "cancelled") {
      data.resolvedAt = new Date();
    } else {
      data.resolvedAt = null;
    }
  }
  if (typeof body.resolutionNote === "string") {
    data.resolutionNote = body.resolutionNote.slice(0, 2000) || null;
  }
  if (typeof body.assignedToId === "string" && isAdmin) {
    data.assignedToId = body.assignedToId || null;
  }
  if (body.dueOn !== undefined && isAdmin) {
    const d = body.dueOn ? new Date(body.dueOn as string) : null;
    data.dueOn = d && !isNaN(d.getTime()) ? d : null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.hqpActionItem.update({ where: { id }, data });
  return NextResponse.json({ ok: true, actionItem: updated });
}
