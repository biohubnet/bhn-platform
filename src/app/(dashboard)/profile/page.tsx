import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileClient } from "@/components/lms/ProfileClient";
import { AssistConsentPanel } from "@/components/assist/AssistConsentPanel";

export default async function ProfilePage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id!;

  const [user, latestRoleRequest] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true, credits: true,
        phone: true, bio: true, organization: true, jobTitle: true, country: true,
        newsletterSubscribed: true, createdAt: true, lastLoginAt: true,
      },
    }),
    prisma.roleChangeRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="My profile"
        description="Update your information, change your password, or request a role change."
      />
      <ProfileClient user={user} latestRoleRequest={latestRoleRequest} />
      <AssistConsentPanel />
    </div>
  );
}
