import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole, ROLE_RANK } from "@/lib/auth";
export async function GET() {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "trainee";
  // Trainees see only entries explicitly visible to "trainee" (or "evaluating" if that's their role).
  // Staff see everything they're listed in.
  const entries = await prisma.changeLog.findMany({
    where: { visibleTo: { has: role === "user" ? "trainee" : role } },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actorId = (session.user as { id?: string }).id!;
  const body = await req.json();

  const validRoles = Object.keys(ROLE_RANK).filter((r) => r !== "user");
  const visibleTo: string[] = Array.isArray(body.visibleTo)
    ? body.visibleTo.filter((r: string) => validRoles.includes(r))
    : ["trainee", "evaluating", "instructor", "admin", "superadmin"];

  const entry = await prisma.changeLog.create({
    data: {
      title: String(body.title ?? "Untitled").trim(),
      body: String(body.body ?? "").trim(),
      kind: ["feature", "fix", "improvement", "note"].includes(body.kind) ? body.kind : "feature",
      version: body.version || null,
      visibleTo,
      createdById: actorId,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
      buildSha: process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 12) || null,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
