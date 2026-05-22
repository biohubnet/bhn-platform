/**
 * POST /api/employer/companies/[id]/join-requests/[reqId]/approve
 *   Approve a pending join request.
 *   Body: { role?: string } — override the suggested role. Optional.
 *   Requires: manager+.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireCompanyRole } from "@/lib/employer/company";
import { writeEmployerAction } from "@/lib/employer/activity";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const callerId = (session.user as { id: string }).id;
  const { id: companyId, reqId } = await params;

  try {
    await requireCompanyRole(companyId, callerId, "manager");
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const joinReq = await prisma.companyJoinRequest.findUnique({
    where:  { id: reqId },
    select: { id: true, companyId: true, status: true, requesterId: true, suggestedRole: true,
              requester: { select: { name: true, email: true } } },
  });
  if (!joinReq || joinReq.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (joinReq.status !== "pending") {
    return NextResponse.json({ error: "Request already resolved" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({})) as { role?: string };
  const role = body.role ?? joinReq.suggestedRole;

  // Create the membership and mark the request approved in one tx.
  await prisma.$transaction([
    prisma.companyMember.upsert({
      where:  { companyId_userId: { companyId, userId: joinReq.requesterId } },
      update: { role },
      create: { companyId, userId: joinReq.requesterId, role, invitedById: callerId },
    }),
    prisma.companyJoinRequest.update({
      where: { id: reqId },
      data:  { status: "approved", decidedById: callerId, decidedAt: new Date() },
    }),
  ]);

  await writeEmployerAction({
    kind:         "join_request_approved",
    companyId,
    actorId:      callerId,
    payload:      { targetName: joinReq.requester.name ?? joinReq.requester.email, role },
    targetUserId: joinReq.requesterId,
  }).catch(() => {});

  revalidatePath("/employer/team");
  return NextResponse.json({ ok: true, role });
}
