/**
 * PATCH /api/equip/applications/[id]/milestones
 *
 * Update a single milestone (status + optional note). Auth: the
 * applicant (their own application) or any admin. We allow both
 * because either side might want to flag a "blocked" or move a
 * check-in to "in_progress" / "complete".
 *
 * Body: { id: string, status?: "pending"|"in_progress"|"complete"|"blocked", note?: string }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { patchMilestone } from "@/lib/equip/milestones";
import type { EquipMilestone } from "@/lib/equip/types";

export const runtime = "nodejs";

const VALID_STATUSES = new Set(["pending", "in_progress", "complete", "blocked"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = role === "admin" || role === "superadmin";

  const { id } = await params;
  const app = await prisma.equipApplication.findUnique({
    where: { id },
    select: { id: true, userId: true, milestones: true, status: true },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && app.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (app.status !== "funded") {
    return NextResponse.json({ error: "Milestones only exist on funded applications" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const milestoneId = typeof body.id === "string" ? body.id : null;
  const targetStatus = typeof body.status === "string" ? body.status : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 2000) : undefined;

  if (!milestoneId) {
    return NextResponse.json({ error: "Milestone id required" }, { status: 400 });
  }
  if (targetStatus && !VALID_STATUSES.has(targetStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const current = (app.milestones as unknown as EquipMilestone[]) ?? [];
  const found = current.find((m) => m.id === milestoneId);
  if (!found) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  const next = patchMilestone(current, milestoneId, {
    status: (targetStatus as EquipMilestone["status"] | null) ?? found.status,
    note: note ?? found.note,
  });

  await prisma.equipApplication.update({
    where: { id },
    data: { milestones: next as unknown as object },
  });
  return NextResponse.json({ ok: true, milestones: next });
}
