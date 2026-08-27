import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathway = await prisma.pathway.findUnique({
    where: { id },
    include: {
      _count: { select: { courses: true, enrollments: true } },
      courses: {
        orderBy: { order: "asc" },
        include: { course: { select: { id: true, title: true, status: true, duration: true, category: true } } },
      },
    },
  });
  if (!pathway) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pathway);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Replace courses if courseIds is provided
  if (Array.isArray(body.courseIds)) {
    await prisma.pathwayCourse.deleteMany({ where: { pathwayId: id } });
    await prisma.pathwayCourse.createMany({
      data: body.courseIds.map((cid: string, i: number) => ({
        pathwayId: id,
        courseId: cid,
        order: i,
      })),
    });
  }

  const pathway = await prisma.pathway.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.thumbnail !== undefined ? { thumbnail: body.thumbnail } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.creditCost !== undefined ? { creditCost: body.creditCost } : {}),
    },
  });
  return NextResponse.json(pathway);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.pathway.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
