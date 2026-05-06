import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TARGETS = new Set(["evaluating", "instructor", "admin"]);

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const reqs = await prisma.roleChangeRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(reqs);
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const realRole = (session.user as { realRole?: string }).realRole
    ?? (session.user as { role?: string }).role
    ?? "trainee";

  const { toRole, reason } = await req.json();
  if (typeof toRole !== "string" || !VALID_TARGETS.has(toRole)) {
    return NextResponse.json({ error: "Invalid target role." }, { status: 400 });
  }
  if (toRole === realRole) {
    return NextResponse.json({ error: "You already hold this role." }, { status: 400 });
  }
  if (realRole === "superadmin") {
    return NextResponse.json({ error: "Superadmins manage their own role." }, { status: 400 });
  }
  if (realRole === "admin" && toRole !== "admin") {
    // Admins shouldn't request lower roles via this flow.
    return NextResponse.json({ error: "Use the Users page to change admin roles." }, { status: 400 });
  }

  // Block stacking: any pending request blocks new ones
  const existing = await prisma.roleChangeRequest.findFirst({
    where: { userId, status: "pending" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending role-change request." },
      { status: 409 }
    );
  }

  const created = await prisma.roleChangeRequest.create({
    data: {
      userId,
      fromRole: realRole,
      toRole,
      reason: typeof reason === "string" ? reason.trim().slice(0, 1000) || null : null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
