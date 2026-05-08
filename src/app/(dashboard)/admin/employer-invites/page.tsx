import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmployerInvitesAdmin } from "@/components/admin/EmployerInvitesAdmin";

export default async function EmployerInvitesPage() {
  await requireRole("admin");
  const invites = await prisma.employerInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-fg mb-1">Employer HR invites</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl leading-relaxed">
        Mint a magic-link sign-in for an industry partner. They click the URL — that&apos;s it. No claim form, no password to type, no credentials to copy. The link works as a reusable bookmark until it expires (default 14 days) so partners can come back later without re-auth. Use the <strong>Test</strong> button on any invite to open it yourself in a new tab and walk through the recipient experience.
      </p>
      <EmployerInvitesAdmin
        initial={invites.map((i) => ({
          id: i.id,
          email: i.email,
          token: i.token,
          companyName: i.companyName,
          companyWebsite: i.companyWebsite,
          createdAt: i.createdAt.toISOString(),
          expiresAt: i.expiresAt.toISOString(),
          usedAt: i.usedAt ? i.usedAt.toISOString() : null,
          openCount: i.openCount,
          lastOpenedAt: i.lastOpenedAt ? i.lastOpenedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
