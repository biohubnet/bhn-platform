/**
 * /profile/security — per-user security settings.
 *
 * Today: just the MFA enable/disable flow. Will grow to host
 * password change, session list / revoke, and (eventually) WebAuthn /
 * passkey enrolment. Server component — fetches current MFA state +
 * password-update timestamp, hands the rest off to a client island.
 */
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { SecuritySettingsClient } from "@/components/security/SecuritySettingsClient";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      totpEnabledAt: true,
      passwordUpdatedAt: true,
      emailVerified: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Security"
        description="Sign-in and account-protection settings. Multi-factor authentication is recommended for every account."
      />
      <SecuritySettingsClient
        email={user.email}
        mfaEnabledAt={user.totpEnabledAt?.toISOString() ?? null}
        passwordUpdatedAt={user.passwordUpdatedAt?.toISOString() ?? null}
        emailVerifiedAt={user.emailVerified?.toISOString() ?? null}
      />
    </div>
  );
}
