/**
 * POST /api/admin/simulator-requests/[id]/reject
 *
 * Admin rejects a request with a written reason. Status flips to
 * 'rejected' and adminNotes is set to the reason. Doesn't touch
 * Simulation rows — purely a request-lifecycle action.
 *
 *   Body: { reason: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifySimRejected } from "@/lib/simulator/notify";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = (session.user as { id?: string }).id;
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = (body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json(
      { error: "Provide a rejection reason — the requester sees it." },
      { status: 400 },
    );
  }

  const request = await prisma.simulationRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      jdBody: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (request.status === "ready") {
    return NextResponse.json(
      { error: "Can't reject a request that's already fulfilled." },
      { status: 409 },
    );
  }

  await prisma.simulationRequest.update({
    where: { id },
    data: {
      status: "rejected",
      adminNotes: reason.slice(0, 500),
      processedById: adminId,
      processedAt: new Date(),
    },
  });

  // Notify the requester so they can revise + resubmit. Silent on
  // SMTP failure — the in-app status flip already happened.
  if (request.user.email) {
    await notifySimRejected({
      to: request.user.email,
      recipientName: request.user.name,
      jdSnippet: request.jdBody,
      reason,
    });
  }

  return NextResponse.json({ ok: true, status: "rejected" });
}
