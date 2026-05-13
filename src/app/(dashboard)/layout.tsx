import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/lms/Sidebar";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { DemoBanner } from "@/components/admin/DemoBanner";
import { UnverifiedEmailBanner } from "@/components/auth/UnverifiedEmailBanner";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { PageTranslator } from "@/components/translation/PageTranslator";
import { KeyboardShortcuts } from "@/components/system/KeyboardShortcuts";
import { NavHighlightOverlay } from "@/components/guide/NavHighlightOverlay";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "trainee";
  const realRole = (session.user as { realRole?: string }).realRole;
  const actingAs = (session.user as { actingAs?: string }).actingAs;
  const userId = (session.user as { id?: string }).id;
  const userRow = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          credits: true,
          allowPlatformContent: true,
          accountKind: true,
          demoExpiresAt: true,
          email: true,
          emailVerified: true,
        },
      })
    : null;

  // Show the "verify your email" banner only for real accounts —
  // demo / sandbox accounts deliberately bypass email verification
  // and the first superadmin (set during install) is auto-verified.
  const showUnverifiedBanner =
    !!userRow &&
    !userRow.emailVerified &&
    (userRow.accountKind === "real" || userRow.accountKind == null);

  return (
    <div className="flex h-screen bg-page">
      <Sidebar
        role={role}
        realRole={realRole}
        actingAs={actingAs ?? null}
        user={session.user ?? {}}
        credits={userRow?.credits ?? undefined}
        allowPlatformContent={userRow?.allowPlatformContent ?? false}
      />
      <main className="flex-1 overflow-y-auto relative">
        {actingAs && <ImpersonationBanner actingAs={actingAs} />}
        {userRow?.accountKind === "demo" && (
          <DemoBanner kind="demo" expiresAt={userRow.demoExpiresAt?.toISOString() ?? null} />
        )}
        {showUnverifiedBanner && userRow?.email && (
          <UnverifiedEmailBanner email={userRow.email} />
        )}
        <div className="max-w-7xl mx-auto px-6 py-8 pt-16">{children}</div>
      </main>
      {/* Floating page-translator dock — fixed to viewport so it stays
          clickable above all page content (modals at z-50 still win). */}
      <div className="fixed top-3 right-4 z-40 pointer-events-auto" data-no-translate>
        <div className="surface px-1 py-1">
          <PageTranslator />
        </div>
      </div>
      <Onboarding />
      <KeyboardShortcuts realRole={realRole} actingAs={actingAs ?? null} />
      <NavHighlightOverlay />
    </div>
  );
}
