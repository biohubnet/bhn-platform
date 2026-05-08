import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sparkles } from "lucide-react";
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
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Sparkles size={20} className="text-brand-600" />
          Demo workspaces
        </h1>
        <p className="text-sm text-muted mt-1 max-w-3xl">
          Mint a time-limited link for a prospective employer. They get a populated workspace — 3 sample postings, 10 applicants spread across the funnel, scheduled interviews — to click around without setup.
        </p>
      </header>

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
        }))}
        initialActive={active.map((a) => ({
          id: a.id,
          email: a.email,
          name: a.name,
          companyName: a.employerCompany,
          expiresAt: a.demoExpiresAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
          lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
