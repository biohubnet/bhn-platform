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
        Issue a one-time signup link for an industry partner. Once they claim it, their account is created with the Employer HR role automatically — they land on /employer with the company portal. Default expiry is 14 days; revoke any unused invite from the table below.
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
        }))}
      />
    </div>
  );
}
