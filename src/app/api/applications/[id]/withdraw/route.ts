/**
 * Trainee withdraws their own application.
 *
 *   POST /api/applications/[id]/withdraw
 *     body: { reason?: string }
 *
 * Thin wrapper around the transition service. The application must
 * belong to the signed-in user.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionApplication } from "@/lib/hiring/transitions";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const app = await prisma.applicationStatus.findUnique({
    where: { id },
    select: { applicantId: true },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.applicantId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: string };

  const r = await transitionApplication({
    applicationStatusId: id,
    toStage: "withdrawn",
    actorUserId: userId,
    rejectionReason: body.reason?.slice(0, 500) || undefined,
  });
  if (!r.ok) {
    return NextResponse.json({ error: r.error, code: r.code }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
