import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  if (typeof body.name === "string")         allowed.name = body.name.trim() || null;
  if (typeof body.phone === "string")        allowed.phone = body.phone.trim() || null;
  if (typeof body.bio === "string")          allowed.bio = body.bio.trim() || null;
  if (typeof body.organization === "string") allowed.organization = body.organization.trim() || null;
  if (typeof body.jobTitle === "string")     allowed.jobTitle = body.jobTitle.trim() || null;
  if (typeof body.country === "string")      allowed.country = body.country.trim() || null;
  if (typeof body.locale === "string" && ["en","es","fr","zh"].includes(body.locale)) {
    allowed.locale = body.locale;
  }
  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      allowed.email = email;
    }
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: allowed,
    select: {
      id: true, name: true, email: true, phone: true, bio: true,
      organization: true, jobTitle: true, country: true, role: true,
    },
  });
  return NextResponse.json(updated);
}
