import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await guardRole("superadmin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id!;
  const { id } = await params;
  const body = await req.json();

  const config = await prisma.ltiConfig.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.issuer !== undefined && { issuer: body.issuer }),
      ...(body.clientId !== undefined && { clientId: body.clientId }),
      ...(body.authEndpoint !== undefined && { authEndpoint: body.authEndpoint }),
      ...(body.tokenEndpoint !== undefined && { tokenEndpoint: body.tokenEndpoint }),
      ...(body.jwksEndpoint !== undefined && { jwksEndpoint: body.jwksEndpoint }),
      ...(body.deploymentId !== undefined && { deploymentId: body.deploymentId }),
    },
  });

  await prisma.auditLog.create({
    data: { actorId, action: "lti.update", targetType: "lti", targetId: id },
  });

  return NextResponse.json(config);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await guardRole("superadmin");
  if (session instanceof NextResponse) return session;
  const actorId = (session.user as { id?: string }).id!;
  const { id } = await params;

  await prisma.ltiConfig.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { actorId, action: "lti.delete", targetType: "lti", targetId: id },
  });

  return NextResponse.json({ ok: true });
}
