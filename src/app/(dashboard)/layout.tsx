import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/lms/Sidebar";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "trainee";
  const realRole = (session.user as { realRole?: string }).realRole;
  const actingAs = (session.user as { actingAs?: string }).actingAs;
  const userId = (session.user as { id?: string }).id;
  const credits = userId
    ? (await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }))?.credits
    : undefined;

  return (
    <div className="flex h-screen bg-page">
      <Sidebar
        role={role}
        realRole={realRole}
        actingAs={actingAs ?? null}
        user={session.user ?? {}}
        credits={credits ?? undefined}
      />
      <main className="flex-1 overflow-y-auto">
        {actingAs && <ImpersonationBanner actingAs={actingAs} />}
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
      <Onboarding />
    </div>
  );
}
