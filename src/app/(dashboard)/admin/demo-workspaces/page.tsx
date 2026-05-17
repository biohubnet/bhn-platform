import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sparkles } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { DemoWorkspacesClient } from "@/components/admin/DemoWorkspacesClient";
import { sweepExpiredDemos } from "@/lib/demo/workspace";

export const dynamic = "force-dynamic";

export default async function DemoWorkspacesPage() {
  await requireRole("admin");

  // Fire the expiry sweeper on every visit so we don't accumulate
  // stale demo data even if no cron is wired up.
  sweepExpiredDemos().catch(() => undefined);

  const [invites, active] = await Promise.all([
    // All non-expired demo links, claimed or not — magic links are
    // reusable so admins should be able to recopy at any time.
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

  // Resolve the admin who minted each invite + the admin who created
  // each active workspace, in a single batched lookup so the page
  // can show "minted by X" / "created by X" cards. We do this here
  // rather than via Prisma relations because EmployerInvite doesn't
  // declare an invitedBy relation yet and we don't want a schema
  // migration just to surface a name.
  const adminIds = Array.from(new Set([
    ...invites.map((i) => i.invitedById).filter(Boolean) as string[],
    ...active.map((a) => a.createdByAdminId).filter(Boolean) as string[],
  ]));
  const admins = adminIds.length
    ? await prisma.user.findMany({
        where: { id: { in: adminIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const adminMap = new Map(admins.map((a) => [a.id, a]));
  function label(id: string | null | undefined): string | null {
    if (!id) return null;
    const u = adminMap.get(id);
    if (!u) return null;
    return u.name ?? u.email;
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Sparkles size={11} /> Admin · EXPERIENCE</>}
        title="Demo workspaces"
        description="Mint a time-limited link for a prospective employer. They get a populated workspace — 3 sample postings, 10 applicants spread across the funnel, scheduled interviews — to click around without setup."
      />

      <DemoWorkspacesClient
        initialInvites={invites.map((i) => ({
          id: i.id,
          token: i.token,
          email: i.email,
          companyName: i.companyName,
          companyWebsite: i.companyWebsite,
          expiresAt: i.expiresAt.toISOString(),
          createdAt: i.createdAt.toISOString(),
          usedAt: i.usedAt?.toISOString() ?? null,
          mintedBy: label(i.invitedById),
        }))}
        initialActive={active.map((a) => ({
          id: a.id,
          email: a.email,
          name: a.name,
          companyName: a.employerCompany,
          expiresAt: a.demoExpiresAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
          lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
          createdBy: label(a.createdByAdminId),
        }))}
      />
    </div>
  );
}
