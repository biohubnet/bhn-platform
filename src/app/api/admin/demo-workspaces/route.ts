/**
 * Admin endpoint for demo workspaces. The mint flow creates a one-shot
 * EmployerInvite (token + demoMode=true) the admin can hand to a
 * prospect; clicking it lands on /employer/demo/[token] which spawns
 * the populated workspace and signs the visitor in.
 *
 *   GET    /api/admin/demo-workspaces             → list active demos
 *   POST   /api/admin/demo-workspaces             → mint a token
 *   DELETE /api/admin/demo-workspaces?employerId= → end a demo early
 *   POST   /api/admin/demo-workspaces/cleanup     → run the sweeper
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteDemoWorkspace, sweepExpiredDemos } from "@/lib/demo/workspace";

export async function GET() {
  await requireRole("admin");
  const [invites, active] = await Promise.all([
    // Show every non-expired demo invite, claimed or not. Magic links
    // are reusable bookmarks — admins should be able to copy them again.
    prisma.employerInvite.findMany({
      where: { demoMode: true, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.findMany({
      where: { accountKind: "demo", role: "employer" },
      select: {
        id: true, email: true, name: true,
        employerCompany: true, demoExpiresAt: true,
        createdAt: true, lastLoginAt: true,
        createdByAdminId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return NextResponse.json({ invites, active });
}

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const session = await getSession();
  const meId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    companyName?: string;
    companyWebsite?: string;
    days?: number;
  };

  const days = Math.max(1, Math.min(30, body.days ?? 7));
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Optional fields — generate friendly defaults so admins can mint a
  // throwaway link with one click for spontaneous demos.
  const tokenShort = token.slice(0, 8);
  const email = body.email?.trim().toLowerCase() || `demo-${tokenShort}@biohubnet.test`;
  const companyName = body.companyName?.trim() || `Demo Workspace ${tokenShort}`;

  const invite = await prisma.employerInvite.create({
    data: {
      email,
      token,
      companyName,
      companyWebsite: body.companyWebsite?.trim() ?? null,
      invitedById: meId ?? undefined,
      expiresAt,
      demoMode: true,
    },
  });

  return NextResponse.json({
    ok: true,
    invite: {
      id: invite.id,
      token: invite.token,
      email: invite.email,
      companyName: invite.companyName,
      expiresAt: invite.expiresAt,
      claimUrl: `/employer/demo/${invite.token}`,
    },
  });
}

export async function DELETE(req: NextRequest) {
  await requireRole("admin");
  const url = new URL(req.url);
  const employerId = url.searchParams.get("employerId");
  if (!employerId) return NextResponse.json({ error: "employerId required" }, { status: 400 });
  const r = await deleteDemoWorkspace(employerId);
  return NextResponse.json({ ok: true, removed: r.removed });
}

// Cleanup sweeper — admin can trigger manually; also fired on /admin/system-status load.
export async function PATCH() {
  await requireRole("admin");
  const r = await sweepExpiredDemos();
  return NextResponse.json({ ok: true, deleted: r.deleted });
}
