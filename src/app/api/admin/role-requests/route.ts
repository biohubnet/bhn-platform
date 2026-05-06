import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status");
  const where = status && ["pending", "approved", "rejected"].includes(status) ? { status } : {};
  const list = await prisma.roleChangeRequest.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, role: true, organization: true, jobTitle: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json(list);
}
