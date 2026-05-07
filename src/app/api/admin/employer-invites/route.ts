import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

// Invite tokens are 32 random bytes → 64 hex chars. Long enough that
// brute-force isn't a concern; short enough to fit in a URL.
function newToken() {
  return randomBytes(32).toString("hex");
}

export async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const invites = await prisma.employerInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    companyName?: string;
    companyWebsite?: string;
    expiresInDays?: number;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  const days = Math.max(1, Math.min(60, body.expiresInDays ?? 14));
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const userId = (session.user as { id?: string }).id ?? null;
  const invite = await prisma.employerInvite.create({
    data: {
      email,
      token: newToken(),
      companyName: body.companyName?.trim() || null,
      companyWebsite: body.companyWebsite?.trim() || null,
      invitedById: userId,
      expiresAt,
    },
  });
  return NextResponse.json({ ok: true, invite });
}
