import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id!;
  const { userId, amount, reason } = await req.json();

  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newBalance = user.credits + amount;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { credits: newBalance } }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        type: "credit",
        reason: reason ?? "admin_grant",
        balanceAfter: newBalance,
      },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "credit.grant",
      targetType: "user",
      targetId: userId,
      detail: JSON.stringify({ amount, newBalance }),
    },
  });

  return NextResponse.json({ credits: newBalance });
}
