import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("superadmin");
  const configs = await prisma.ltiConfig.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(configs);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("superadmin");
  const actorId = (session.user as { id?: string }).id!;
  const body = await req.json();

  const config = await prisma.ltiConfig.create({
    data: {
      name: body.name,
      issuer: body.issuer,
      clientId: body.clientId,
      authEndpoint: body.authEndpoint,
      tokenEndpoint: body.tokenEndpoint,
      jwksEndpoint: body.jwksEndpoint,
      deploymentId: body.deploymentId,
      active: body.active ?? true,
    },
  });

  await prisma.auditLog.create({
    data: { actorId, action: "lti.create", targetType: "lti", targetId: config.id },
  });

  return NextResponse.json(config, { status: 201 });
}
