/**
 * HQP action items — admin endpoints.
 *   POST create (optionally tied to a meeting)
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id ?? "";
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
  const description = typeof body.description === "string" ? body.description.slice(0, 2000) : null;
  const meetingId = typeof body.meetingId === "string" ? body.meetingId : null;
  const assignedToId = typeof body.assignedToId === "string" ? body.assignedToId : null;
  const dueOn = body.dueOn ? new Date(body.dueOn as string) : null;
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const created = await prisma.hqpActionItem.create({
    data: {
      title, description: description || null,
      meetingId: meetingId || null,
      assignedToId: assignedToId || null,
      dueOn: dueOn && !isNaN(dueOn.getTime()) ? dueOn : null,
      status: "open",
      createdById: actorId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "hqp_action.create",
      targetType: "hqp_action_item",
      targetId: created.id,
      detail: JSON.stringify({ title, assignedToId, dueOn }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, actionItem: created });
}
