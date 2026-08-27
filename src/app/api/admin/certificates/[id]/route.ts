import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id!;
  const { id } = await params;
  const { revoke } = await req.json();

  const cert = await prisma.certificate.update({
    where: { id },
    data: revoke
      ? { revokedAt: new Date(), revokedBy: actorId }
      : { revokedAt: null, revokedBy: null },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: revoke ? "certificate.revoke" : "certificate.reinstate",
      targetType: "certificate",
      targetId: id,
    },
  });

  return NextResponse.json(cert);
}
