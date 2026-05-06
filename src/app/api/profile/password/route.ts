import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { currentPassword, newPassword } = await req.json();

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password) return NextResponse.json({ error: "Password not set on account" }, { status: 400 });

  const ok = await bcrypt.compare(String(currentPassword ?? ""), user.password);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  return NextResponse.json({ ok: true });
}
