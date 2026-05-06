import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const myId = (session.user as { id?: string }).id!;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { not: myId },
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name:  { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, jobTitle: true, organization: true },
    take: 8,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}
