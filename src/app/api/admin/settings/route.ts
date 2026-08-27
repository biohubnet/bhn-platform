import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const settings = await prisma.platformSetting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const session = await guardRole("superadmin");
  if (session instanceof NextResponse) return session;
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
