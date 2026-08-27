import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/auth";
export async function GET(req: NextRequest) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const search = searchParams.get("q");

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin" || userRole === "instructor";

  const courses = await prisma.course.findMany({
    where: {
      ...(isAdmin ? {} : { status: "published" }),
      ...(category ? { category } : {}),
      ...(status && isAdmin ? { status } : {}),
      ...(search ? { title: { contains: search } } : {}),
    },
    include: {
      instructor: { select: { id: true, name: true, email: true } },
      _count: { select: { enrollments: true, modules: true } },
      scormPackage: { select: { version: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("instructor").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const userId = (session.user as { id?: string }).id!;

  const course = await prisma.course.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      courseType: data.courseType ?? "scorm",
      passingScore: data.passingScore ?? 80,
      maxAttempts: data.maxAttempts ?? 0,
      duration: data.duration,
      // Catalog filter facets — null if the form leaves them blank.
      topic:     data.topic ?? null,
      delivery:  data.delivery ?? null,
      provider:  data.provider ?? null,
      isSpecial: !!data.isSpecial,
      instructorId: userId,
    },
  });

  // Fire-and-forget skill tagging — don't block the response.
  const text = [data.title, data.description, data.category].filter(Boolean).join("\n\n");
  if (text.length > 30) {
    import("@/lib/skills/ontology").then(({ tagCourse }) => tagCourse(course.id, text)).catch(() => undefined);
  }

  return NextResponse.json(course, { status: 201 });
}
