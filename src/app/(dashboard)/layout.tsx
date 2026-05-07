import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/lms/Sidebar";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { PageTranslator } from "@/components/translation/PageTranslator";
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
      <main className="flex-1 overflow-y-auto relative">
        {actingAs && <ImpersonationBanner actingAs={actingAs} />}
        {/* Floating page-translator dock — top-right of the content area */}
        <div className="absolute top-4 right-6 z-30" data-no-translate>
          <PageTranslator />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
      <Onboarding />
    </div>
  );
}
