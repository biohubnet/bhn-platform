import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  // Only allow deleting unused invites — used invites are part of the
  // audit trail.
  const invite = await prisma.employerInvite.findUnique({ where: { id } });
  if (!invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (invite.usedAt) {
    return NextResponse.json(
      { error: "This invite has already been claimed. Demote the user from /admin/users instead." },
      { status: 409 }
    );
  }
  await prisma.employerInvite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
