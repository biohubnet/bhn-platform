/**
 * Admin queue endpoint for HQP committee applications.
 *
 *   GET /api/admin/committees/hqp/applications?status=...&windowId=...
 */
import { NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const windowId = url.searchParams.get("windowId");

  const rows = await prisma.hqpMemberApplication.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(windowId ? { windowId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, organization: true, role: true } },
      window: { select: { id: true, year: true, title: true } },
      decidedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ applications: rows });
}
