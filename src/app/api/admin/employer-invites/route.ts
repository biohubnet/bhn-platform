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

  const days = Math.max(1, Math.min(60, body.expiresInDays ?? 14));
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const token = newToken();

  // Both fields are optional — the magic-link flow doesn't need a
  // real email or company to work. Defaults make "Quick invite"
  // (no inputs) viable for admins testing the flow.
  const trimmedEmail = (body.email ?? "").trim().toLowerCase();
  const emailValid = !!trimmedEmail && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail);
  if (trimmedEmail && !emailValid) {
    return NextResponse.json({ error: "Email looks malformed." }, { status: 400 });
  }
  const tokenShort = token.slice(0, 8);
  const email = emailValid ? trimmedEmail : `partner-${tokenShort}@biohubnet.test`;
  const companyName = body.companyName?.trim() || `Demo Partner ${tokenShort}`;

  const userId = (session.user as { id?: string }).id ?? null;
  const invite = await prisma.employerInvite.create({
    data: {
      email,
      token,
      companyName,
      companyWebsite: body.companyWebsite?.trim() || null,
      invitedById: userId,
      expiresAt,
    },
  });
  return NextResponse.json({ ok: true, invite });
}
