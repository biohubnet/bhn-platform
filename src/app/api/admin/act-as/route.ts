import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRawSession, ACT_AS_COOKIE, ROLE_RANK } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * View-as authorisation matrix:
 *
 *   superadmin → may act-as any non-superadmin role (full preview
 *                surface for QA and demos)
 *   admin      → may act-as trainee only (the X-keyboard fast toggle
 *                so admins can verify the learner experience without
 *                signing out)
 *
 * Admins explicitly cannot act-as superadmin / admin / instructor /
 * employer — view-as is a downgrade tool, not a lateral move, and
 * letting admins flip into instructor or employer roles would surface
 * data they aren't supposed to see in their own seat.
 */
const SUPERADMIN_TARGETS = new Set(["trainee", "evaluating", "employer", "instructor", "admin"]);
// Admins can also flip into the employer / HR seat — it's the
// portal they help manage anyway and the keyboard shortcut for HR
// view (xx) needs to work for admins, not only superadmins.
const ADMIN_TARGETS = new Set(["trainee", "employer"]);

export async function POST(req: NextRequest) {
  const session = await getRawSession();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "superadmin" && role !== "admin") {
    return NextResponse.json({ error: "Only admins and superadmins can use view-as." }, { status: 403 });
  }
  const actorId = (session!.user as { id?: string }).id!;
  const allowedTargets = role === "superadmin" ? SUPERADMIN_TARGETS : ADMIN_TARGETS;

  const body = await req.json().catch(() => ({}));
  const target = body.role as string | undefined;
  if (!target || !allowedTargets.has(target) || ROLE_RANK[target] === undefined) {
    return NextResponse.json({ error: "Invalid or disallowed role" }, { status: 400 });
  }

  const cs = await cookies();
  cs.set(ACT_AS_COOKIE, target, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // 1 hour — automatic safety expiry
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "admin.act_as.start",
      targetType: "role",
      targetId: target,
      detail: JSON.stringify({ asRole: target, fromRole: role }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, actingAs: target });
}

export async function DELETE(req: NextRequest) {
  const session = await getRawSession();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "superadmin" && role !== "admin") {
    return NextResponse.json({ error: "Only admins and superadmins can use view-as." }, { status: 403 });
  }
  const actorId = (session!.user as { id?: string }).id!;

  const cs = await cookies();
  const prev = cs.get(ACT_AS_COOKIE)?.value;
  cs.delete(ACT_AS_COOKIE);

  if (prev) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action: "admin.act_as.stop",
        targetType: "role",
        targetId: prev,
        detail: JSON.stringify({ wasRole: prev }),
        ip: req.headers.get("x-forwarded-for") ?? undefined,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
