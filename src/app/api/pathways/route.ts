import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET() {
  const pathways = await prisma.pathway.findMany({
    include: {
      _count: { select: { courses: true, enrollments: true } },
      courses: {
        orderBy: { order: "asc" },
        include: { course: { select: { id: true, title: true, status: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pathways);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const userId = (session.user as { id?: string }).id!;

  const pathway = await prisma.pathway.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? null,
      thumbnail: body.thumbnail ?? null,
      status: body.status ?? "draft",
      creditCost: body.creditCost ?? 0,
      createdById: userId,
      ...(Array.isArray(body.courseIds) && body.courseIds.length > 0
        ? {
            courses: {
              create: body.courseIds.map((cid: string, i: number) => ({
                courseId: cid,
                order: i,
              })),
            },
          }
        : {}),
    },
    include: { courses: true },
  });
  return NextResponse.json(pathway, { status: 201 });
}
