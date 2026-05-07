import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRawSession, ACT_AS_COOKIE, ROLE_RANK } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TARGET_ROLES = new Set(["trainee", "evaluating", "employer", "instructor", "admin"]);

export async function POST(req: NextRequest) {
  const session = await getRawSession();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Only superadmins can use view-as." }, { status: 403 });
  }
  const actorId = (session!.user as { id?: string }).id!;

  const body = await req.json().catch(() => ({}));
  const target = body.role as string | undefined;
  if (!target || !TARGET_ROLES.has(target) || ROLE_RANK[target] === undefined) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
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
      detail: JSON.stringify({ asRole: target }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, actingAs: target });
}

export async function DELETE(req: NextRequest) {
  const session = await getRawSession();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Only superadmins can use view-as." }, { status: 403 });
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
