import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPassword } from "@/lib/security/password-policy";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { currentPassword, newPassword } = await req.json();

  if (typeof newPassword !== "string") {
    return NextResponse.json({ error: "New password required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password) return NextResponse.json({ error: "Password not set on account" }, { status: 400 });

  // Policy gate uses the user's identity to reject "JaneSmith2024"
  // -style choices that contain their name / email.
  const policy = checkPassword({ password: newPassword, email: user.email, name: user.name });
  if (!policy.ok) {
    return NextResponse.json({ error: policy.reason }, { status: 400 });
  }

  const ok = await bcrypt.compare(String(currentPassword ?? ""), user.password);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, passwordUpdatedAt: new Date() },
  });
  // Audit-log the password change. SOC 2 + Part 11 both require it.
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "auth.password_change",
      targetType: "user",
      targetId: userId,
    },
  }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
