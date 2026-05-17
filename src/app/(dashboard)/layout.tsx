import { redirect } from "next/navigation";
import { getSession, ROLE_RANK } from "@/lib/auth";
import { Sidebar } from "@/components/lms/Sidebar";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { PageTranslator } from "@/components/translation/PageTranslator";
import { KeyboardShortcuts } from "@/components/system/KeyboardShortcuts";
import { NavHighlightOverlay } from "@/components/guide/NavHighlightOverlay";
import { AssistTracker } from "@/components/assist/AssistTracker";
import { AssistHintDock } from "@/components/assist/AssistHintDock";
import { prisma } from "@/lib/prisma";
import { getAdminQueueCounts, type QueueCounts } from "@/lib/admin/queue-counts";
import { getTraineeQueueCounts } from "@/lib/trainee/queue-counts";
import { getCommitteesForUser } from "@/lib/committees/membership";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "trainee";
  const realRole = (session.user as { realRole?: string }).realRole;
  const actingAs = (session.user as { actingAs?: string }).actingAs;
  const userId = (session.user as { id?: string }).id;
  // Sidebar-only state. Banner-relevant fields (accountKind,
  // demoExpiresAt, email, emailVerified) are re-fetched inside
  // `<LayoutBanners />`, which now owns the platform banner stack
  // and renders immediately after the hero via PageHero. The two
  // queries dedupe at Prisma's prepared-statement level, so the
  // duplicate fetch is cheap.
  const userRow = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          credits: true,
          allowPlatformContent: true,
        },
      })
    : null;

  // Queue badges — two layers stitched into one map:
  //   • Admin badges (credit apps, role requests, pathway enrolments,
  //     theme proposals, inbox) — only for admin/superadmin.
  //   • Trainee badges (interview requests, offer requests, buddy
  //     invites) — for every signed-in user, since they're per-user
  //     "someone's waiting on you" counts.
  //
  // Using the same Record<string, number> shape means the Sidebar
  // doesn't need to know which set it received; it just looks up by
  // badgeKey. The two key namespaces ("interview-requests" vs.
  // "credit-applications") never collide.
  const canSeeAdminQueues = ROLE_RANK[realRole ?? role] >= ROLE_RANK.admin;
  const [adminCounts, traineeCounts, committeeSlugs] = await Promise.all([
    canSeeAdminQueues ? getAdminQueueCounts() : Promise.resolve(undefined),
    userId ? getTraineeQueueCounts(userId) : Promise.resolve(undefined),
    userId ? getCommitteesForUser(userId) : Promise.resolve([]),
  ]);
  const queueCounts: QueueCounts | undefined =
    adminCounts || traineeCounts ? { ...traineeCounts, ...adminCounts } : undefined;

  return (
    <div className="dashboard-layout flex h-screen bg-page">
      <Sidebar
        role={role}
        realRole={realRole}
        actingAs={actingAs ?? null}
        user={session.user ?? {}}
        credits={userRow?.credits ?? undefined}
        allowPlatformContent={userRow?.allowPlatformContent ?? false}
        queueCounts={queueCounts}
        committees={committeeSlugs}
      />
      <main className="flex-1 overflow-y-auto relative">
        {/* Platform rule: the editorial hero (DSPageHeader) is the
            absolute top of every page. Layout-level banners
            (impersonation, demo expiry, unverified email, AutoPipette
            first-run) used to render here ABOVE {children} — that's
            been moved into PageHero so the banners render
            immediately AFTER the hero on every page that uses it.
            See src/components/layout/LayoutBanners.tsx. */}
        <div className="max-w-screen-2xl mx-auto px-6 py-8 pt-16">
          {children}
        </div>
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
      {/* AutoPipette (AI behaviour-watcher) — telemetry + hint chip.
          Both are no-ops for users who have opted out via the /profile
          toggle or the first-run notice. */}
      <AssistTracker />
      <AssistHintDock />
    </div>
  );
}
