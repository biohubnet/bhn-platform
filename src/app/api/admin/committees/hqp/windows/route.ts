/**
 * HQP open-call windows (admin).
 *
 *   GET  /api/admin/committees/hqp/windows   list every window
 *   POST /api/admin/committees/hqp/windows   create a new window
 *
 * Authn: admin only. Windows control when applications can be
 * submitted; only platform staff should be able to schedule them.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listWindows } from "@/lib/hqp/windows";

export const runtime = "nodejs";

export async function GET() {
  await requireRole("admin");
  return NextResponse.json({ windows: await listWindows() });
}

export async function POST(req: Request) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id ?? "";
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const year = typeof body.year === "number" ? body.year : new Date().getFullYear();
  const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
  const description = typeof body.description === "string" ? body.description.slice(0, 1000) : null;
  const opensAt = body.opensAt ? new Date(body.opensAt as string) : null;
  const closesAt = body.closesAt ? new Date(body.closesAt as string) : null;

  if (!title)   return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!opensAt || isNaN(opensAt.getTime()))   return NextResponse.json({ error: "Invalid opensAt" }, { status: 400 });
  if (!closesAt || isNaN(closesAt.getTime())) return NextResponse.json({ error: "Invalid closesAt" }, { status: 400 });
  if (closesAt.getTime() <= opensAt.getTime()) {
    return NextResponse.json({ error: "closesAt must be after opensAt" }, { status: 400 });
  }

  const created = await prisma.hqpApplicationWindow.create({
    data: {
      year, title, description: description || null,
      opensAt, closesAt,
      status: "open",
      createdById: actorId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "hqp_window.create",
      targetType: "hqp_application_window",
      targetId: created.id,
      detail: JSON.stringify({ year, title, opensAt, closesAt }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, window: created });
}
