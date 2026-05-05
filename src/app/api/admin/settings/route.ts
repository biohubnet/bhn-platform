import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("admin");
  const settings = await prisma.platformSetting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("superadmin");
  const actorId = (session.user as { id?: string }).id!;
  const updates: Record<string, string> = await req.json();

  const ops = Object.entries(updates).map(([key, value]) =>
    prisma.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  );

  await prisma.$transaction(ops);

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "settings.update",
      detail: JSON.stringify(updates),
    },
  });

  return NextResponse.json({ ok: true });
}
