import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Roles an admin-ranked session may assign. Superadmin promotion
 *  is separately gated below — this allowlist mirrors batch/route.ts.
 *  Security fix (PT-02, May 2026): previous version accepted any role
 *  value, allowing admin → superadmin elevation via this endpoint. */
const ALLOWED_ROLES = [
  "trainee", "evaluating", "employer", "hr", "industrial_mentor",
  "engage_hqp_advisor", "equip_grant_reviewer", "instructor",
  "admin",
] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export async function GET() {
  await requireRole("admin");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { enrollments: true, certificates: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id ?? "unknown";
  const actorRole = (session.user as { role?: string }).role ?? "";
  const actorIsSuperadmin = actorRole === "superadmin";

  const body = (await req.json()) as { userId?: unknown; role?: unknown };
  const { userId, role } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!role || typeof role !== "string") {
    return NextResponse.json({ error: "role is required" }, { status: 400 });
  }

  // Only superadmins may promote to superadmin (mirrors [id] route guard).
  if (role === "superadmin" && !actorIsSuperadmin) {
    return NextResponse.json({ error: "Forbidden — superadmin only" }, { status: 403 });
  }

  // Non-superadmin admins are restricted to the allowlist.
  if (!actorIsSuperadmin && !ALLOWED_ROLES.includes(role as AllowedRole)) {
    return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  // Audit — matches pattern in admin/users/[id]/route.ts
  await prisma.auditLog
    .create({
      data: {
        actorId,
        action: "user_role_changed",
        targetId: userId,
        detail: JSON.stringify({ role }),
      },
    })
    .catch(() => { /* best-effort */ });

  return NextResponse.json(user);
}
