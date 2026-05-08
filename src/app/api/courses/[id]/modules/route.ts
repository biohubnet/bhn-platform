import { NextRequest, NextResponse } from "next/server";
import { requireCourseOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  // requireCourseOwner: only the course's owning instructor (or any
  // admin) can add modules. Closes the IDOR where any "instructor"
  // role could insert modules into someone else's course.
  try {
    await requireCourseOwner(courseId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();
  const last = await prisma.module.findFirst({ where: { courseId }, orderBy: { order: "desc" } });

  const mod = await prisma.module.create({
    data: {
      courseId,
      title: data.title,
      description: data.description,
      type: data.type ?? "content",
      content: data.content,
      videoUrl: data.videoUrl,
      fileUrl: data.fileUrl,
      duration: data.duration,
      isRequired: data.isRequired ?? true,
      order: data.order ?? (last?.order ?? 0) + 1,
    },
  });

  return NextResponse.json(mod, { status: 201 });
}
