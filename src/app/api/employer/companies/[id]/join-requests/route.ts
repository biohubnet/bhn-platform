/**
 * GET /api/employer/companies/[id]/join-requests
 *   Returns pending join requests for the company.
 *   Requires: manager+.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireCompanyRole } from "@/lib/employer/company";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: companyId } = await params;

  try {
    await requireCompanyRole(companyId, userId, "manager");
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const requests = await prisma.companyJoinRequest.findMany({
    where:   { companyId, status: "pending" },
    select:  {
      id:            true,
      suggestedRole: true,
      note:          true,
      createdAt:     true,
      requester: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ requests });
}
