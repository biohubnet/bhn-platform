import { Building2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmployerInvitesAdmin } from "@/components/admin/EmployerInvitesAdmin";
import { PageHero } from "@/components/ui/PageHero";

export default async function EmployerInvitesPage() {
  await requireRole("admin");
  const invites = await prisma.employerInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHero
        eyebrow={<><Building2 size={11} /> Admin · EXPERIENCE</>}
        title="Employer HR invites"
        description={(<>Mint a magic-link sign-in for an industry partner. They click the URL — that&apos;s it. No claim form, no password to type, no credentials to copy. The link works as a reusable bookmark until it expires (default 14 days) so partners can come back later without re-auth. Use the <strong>Test</strong> button on any invite to open it yourself in a new tab and walk through the recipient experience.</>)}
      />
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
