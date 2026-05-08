/**
 * Claim a demo invite — spins up the populated demo workspace and
 * returns the auto-generated credentials. The visitor uses those
 * credentials to sign in via the standard /login flow.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { spawnDemoWorkspace } from "@/lib/demo/workspace";

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string };

  const invite = await prisma.employerInvite.findUnique({ where: { token } });
  if (!invite || !invite.demoMode) {
    return NextResponse.json({ error: "Invalid demo link." }, { status: 404 });
  }
  if (invite.usedAt) {
    return NextResponse.json({ error: "This demo link has already been claimed." }, { status: 409 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This demo link has expired." }, { status: 410 });
  }

  const seedResult = await spawnDemoWorkspace({
    email: invite.email,
    companyName: invite.companyName ?? "Your Company",
    visitorName: body.name?.trim() ?? null,
    websiteUrl: invite.companyWebsite ?? null,
    expiresAt: invite.expiresAt,
    mintedByAdminId: invite.invitedById ?? "system",
  });

  await prisma.employerInvite.update({
    where: { id: invite.id },
    data: { usedAt: new Date(), usedById: seedResult.employerId },
  });

  return NextResponse.json({
    ok: true,
    credentials: {
      email: seedResult.employerEmail,
      password: seedResult.password,
    },
    counts: {
      postings: seedResult.postings.length,
      applicants: seedResult.applicantsCreated,
      interviews: seedResult.interviewsCreated,
    },
    expiresAt: invite.expiresAt,
  });
}
