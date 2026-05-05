import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
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
