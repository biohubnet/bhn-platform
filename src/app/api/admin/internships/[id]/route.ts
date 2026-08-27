import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
export const runtime = "nodejs";

interface Body {
  companyName?: string;
  website?: string | null;
  title?: string;
  duration?: string | null;
  hours?: string | null;
  location?: string | null;
  type?: string | null;
  compensation?: string | null;
  deadline?: string | null;
  keySkills?: string[];
  positionDetails?: string;
  status?: "active" | "closed" | "draft";
  contactEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;

  const data: Record<string, unknown> = {};
  if (body.companyName !== undefined) data.companyName = body.companyName.trim();
  if (body.website !== undefined) data.website = body.website?.trim() || null;
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.duration !== undefined) data.duration = body.duration?.trim() || null;
  if (body.hours !== undefined) data.hours = body.hours?.trim() || null;
  if (body.location !== undefined) data.location = body.location?.trim() || null;
  if (body.type !== undefined) data.type = body.type?.trim() || null;
  if (body.compensation !== undefined) data.compensation = body.compensation?.trim() || null;
  if (body.deadline !== undefined) {
    data.deadline = body.deadline ? new Date(body.deadline) : null;
  }
  if (body.keySkills !== undefined) {
    data.keySkills = Array.isArray(body.keySkills)
      ? body.keySkills.map((s) => s.trim()).filter(Boolean).slice(0, 5)
      : [];
  }
  if (body.positionDetails !== undefined) data.positionDetails = body.positionDetails.trim();
  if (body.status !== undefined) data.status = body.status;
  if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail?.trim() || null;
  if (body.contactName !== undefined) data.contactName = body.contactName?.trim() || null;
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone?.trim() || null;

  const posting = await prisma.internshipPosting.update({ where: { id }, data });
  return NextResponse.json({ ok: true, posting });
}

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
  await prisma.internshipPosting.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
