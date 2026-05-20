/**
 * GET /api/profile/skills/search?q=...
 *
 * Returns up to 15 active skills whose name matches `q` (case-
 * insensitive substring) that the calling user doesn't already have
 * on their profile. Drives the search-and-add input on the trainee
 * skills page.
 *
 * No write side-effect — POSTing to /api/profile/skills with the
 * picked skillId still does the actual claim.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (!q) return NextResponse.json({ skills: [] });

  const skills = await prisma.skill.findMany({
    where: {
      status: "active",
      name: { contains: q, mode: "insensitive" },
      NOT: { users: { some: { userId: user.id } } },
    },
    orderBy: [{ postings: { _count: "desc" } }, { name: "asc" }],
    select: { id: true, name: true, category: true },
    take: 15,
  });

  return NextResponse.json({ skills });
}
