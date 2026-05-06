import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const pathwayId = url.searchParams.get("pathwayId");

  const where: Record<string, unknown> = {};
  if (status && ["pending", "approved", "rejected", "waitlisted", "completed", "withdrawn"].includes(status)) {
    where.status = status;
  }
  if (pathwayId) where.pathwayId = pathwayId;

  const list = await prisma.pathwayEnrollment.findMany({
    where,
    include: {
      pathway: { select: { id: true, title: true, capacity: true } },
    },
    orderBy: [{ status: "asc" }, { enrolledAt: "asc" }],
    take: 500,
  });

  // Resolve user info separately (PathwayEnrollment doesn't have a User
  // relation in schema — we look it up here.)
  const userIds = list.map((e) => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, role: true, organization: true, jobTitle: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json(list.map((e) => ({ ...e, user: userMap.get(e.userId) ?? null })));
}
