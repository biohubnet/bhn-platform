import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface Body {
  name?: string;
  password?: string;
}

/** Public — no session required. Validates the token, creates the
 *  Employer HR user, and burns the invite. The recipient signs in
 *  immediately after claiming. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await prisma.employerInvite.findUnique({ where: { token } });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }
  if (invite.usedAt) {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite has expired. Please ask the BHN team for a new one." }, { status: 410 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const name = (body.name ?? "").trim();
  const password = body.password ?? "";
  if (!name || password.length < 8) {
    return NextResponse.json(
      { error: "Name and a password (8+ characters) are required." },
      { status: 400 }
    );
  }

  // Block if a user with this email already exists. (Could happen if
  // they signed up elsewhere first.)
  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      email: invite.email,
      name,
      password: await bcrypt.hash(password, 10),
      role: "employer",
      employerCompany: invite.companyName,
      companyWebsite: invite.companyWebsite,
      allowPlatformContent: false,
      emailVerified: new Date(),
      isActive: true,
    },
  });

  await prisma.employerInvite.update({
    where: { id: invite.id },
    data: { usedAt: new Date(), usedById: user.id },
  });

  return NextResponse.json({ ok: true, email: user.email });
}

/** Lightweight metadata so the claim page can pre-fill the company
 *  name + show whether the invite is still valid. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await prisma.employerInvite.findUnique({
    where: { token },
    select: {
      email: true, companyName: true, companyWebsite: true,
      usedAt: true, expiresAt: true,
    },
  });
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    email: invite.email,
    companyName: invite.companyName,
    companyWebsite: invite.companyWebsite,
    used: !!invite.usedAt,
    expired: invite.expiresAt < new Date(),
  });
}
