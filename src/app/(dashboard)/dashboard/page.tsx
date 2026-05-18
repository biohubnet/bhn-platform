import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Sparkles, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";
import { DesignSystemProvider } from "@/components/ui/DesignSystemProvider";
import { InstructorDashboard } from "@/components/dashboards/InstructorDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { DailyThemeCard } from "@/components/ui/DailyThemeCard";
import { TodaysReviewsCard, type ReviewQuestion } from "@/components/adaptive/TodaysReviewsCard";
import { UpcomingEventBanner } from "@/components/events/UpcomingEventBanner";
import { ExpiringCreditsBanner } from "@/components/credits/ExpiringCreditsBanner";
import { CommitteeBadgeStrip } from "@/components/lms/CommitteeBadgeStrip";
import { CreditUsageScoreboard } from "@/components/dashboards/CreditUsageScoreboard";
import { RewardsDistanceCard } from "@/components/dashboards/RewardsDistanceCard";
import { LatestNewsCard } from "@/components/dashboards/LatestNewsCard";
import { PageHero } from "@/components/ui/PageHero";

interface EnrollmentWithCourse {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  score: number | null;
  enrolledAt: Date;
  course: { id: string; title: string; category: string | null };
}

interface ScormSessionWithCourse {
  id: string;
  attemptNumber: number;
  status: string;
  score: number | null;
  updatedAt: Date;
  package: { course: { id: string; title: string } };
}

export default async function DashboardPage() {
  const session = await getSession();
  const userId = (session!.user as { id?: string }).id!;
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const firstName = session!.user?.name?.split(" ")[0] ?? "Learner";

  // Per-role dashboards. Each fetches its own data; we do a tiny User
  // lookup here just to grab name + role-specific fields.
  if (role === "employer") {
    const employer = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true,
        employerCompany: true, companyWebsite: true, companyLogo: true,
        companyIndustry: true, companySize: true, companyLocation: true,
        companyDescription: true, companyFounded: true,
      },
    });
    if (employer) return (
      // The HR overview is the canonical Studio design-system
      // surface. Override the platform-default DS for this
      // sub-tree only — mirrors the /employer/layout.tsx scope.
      // Platform rule: hero is the absolute top — CommitteeBadgeStrip
      // renders inside the per-role dashboards AFTER their hero, not
      // here.
      <DesignSystemProvider value="studio">
        <EmployerDashboard user={employer} committeeBadge={<CommitteeBadgeStrip userId={userId} />} />
      </DesignSystemProvider>
    );
  }
  if (role === "admin" || role === "superadmin") {
    return (
      <AdminDashboard
        user={{ id: userId, name: session!.user?.name ?? null }}
        role={role}
        committeeBadge={<CommitteeBadgeStrip userId={userId} />}
      />
    );
  }
  if (role === "instructor") {
    return (
      <InstructorDashboard
        user={{ id: userId, name: session!.user?.name ?? null }}
        committeeBadge={<CommitteeBadgeStrip userId={userId} />}
      />
    );
  }

  // Minimal data for the stripped trainee home. We only need:
  //   • the one active enrollment (most-recent in-progress course)
  //   • recent activity (3-row list)
  //   • user credits (for the explore-links footer)
  //   • pathway-enrolment count (for the line under the next card)
  //   • one suggested course (fallback when no in-progress course)
  const [enrollments, recentActivity, user, myPathways, suggestedCourses] =
    await Promise.all([
      prisma.enrollment.findMany({
        where: { userId, status: "active" },
        include: { course: { select: { id: true, title: true, category: true } } },
        orderBy: { enrolledAt: "desc" },
        take: 1,
      }) as Promise<EnrollmentWithCourse[]>,
      prisma.scormSession.findMany({
        where: { userId },
        include: { package: { include: { course: { select: { id: true, title: true } } } } },
        orderBy: { updatedAt: "desc" },
        take: 3,
      }) as Promise<ScormSessionWithCourse[]>,
      prisma.user.findUnique({ where: { id: userId }, select: { credits: true, role: true } }),
      prisma.pathwayEnrollment.findMany({
        where: { userId, status: { in: ["approved", "completed"] } },
        select: { id: true },
      }),
      prisma.course.findMany({
        where: {
          status: "published",
          enrollments: { none: { userId } },
        },
        select: { id: true, title: true, category: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
    ]);

  // The single in-progress course (or null) drives the
  // PrimaryNextCard's "Pick up where you left off" state. We only
  // pull take:1 above; the array is just for the convenience of
  // .length checks in the hero copy.
  const activeContinue = enrollments;
  const inProgress = enrollments.length;
  const completed = 0; // No longer surfaced anywhere — keep symbol for the hero copy fallback path below.

  // Pending buddy invites (incoming) — surfaced as a top banner
  const pendingBuddyInvites = await prisma.buddyPair.findMany({
    where: { partnerId: userId, status: "invited" },
    include: { initiator: { select: { name: true, email: true } } },
    take: 3,
  });

  // Today's review bookmarks — questions the trainee starred for
  // self-test, due now per the expanding-interval schedule. Pulled
  // raw and shaped into the ReviewQuestion props the card expects.
  const dueBookmarks = await prisma.reviewBookmark.findMany({
    where: { userId, nextReviewAt: { lte: new Date() } },
    include: {
      question: {
        select: {
          id: true, text: true, type: true, options: true,
          correctAnswer: true, explanation: true, topic: true,
          assessment: { select: { id: true, title: true, courseId: true } },
        },
      },
    },
    orderBy: { nextReviewAt: "asc" },
    take: 12,
  });
  const reviewQueue: ReviewQuestion[] = dueBookmarks.map((b) => ({
    bookmarkId: b.id,
    question: b.question,
  }));

  // Saved-internship deadline nudge — shown when the trainee has any
  // saved postings whose deadline lands in the next 7 days. Cheaper
  // than a full reminder system and accurate enough to nudge action.
  const SOON_MS = 7 * 24 * 60 * 60 * 1000;
  const expiringSavedPostings = await prisma.userSavedPosting.findMany({
    where: {
      userId,
      posting: {
        status: "active",
        deadline: { gte: new Date(), lte: new Date(Date.now() + SOON_MS) },
      },
    },
    include: {
      posting: { select: { id: true, title: true, companyName: true, deadline: true } },
    },
    orderBy: { posting: { deadline: "asc" } },
    take: 3,
  });

  return (
    <div className="space-y-8">
      {/* HERO — platform rule: the editorial hero is the absolute
          top of every page. Banners (committee badge, credit-expiry,
          today's reviews, saved-internship, buddy invites) all live
          BELOW it now. */}
      <PageHero
        eyebrow={(
          <>
            <Sparkles size={11} />
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </>
        )}
        title={<>Hi, {firstName}.</>}
        description={(
          <>
            <strong className="text-fg">BioHubNet</strong> wires Ontario biomanufacturing HQP from their first course to their first industry placement.{" "}
            {inProgress > 0
              ? `${inProgress} in progress.`
              : completed > 0
                ? `${completed} completed so far.`
                : "Start with a course, or skip ahead to the talent pool."}
          </>
        )}
        actions={(
          <>
            <Link
              href={inProgress > 0 ? "/my-courses" : "/courses"}
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors"
            >
              {inProgress > 0 ? "Continue" : "Browse courses"} <ArrowRight size={12} />
            </Link>
            <Link
              href="/experience"
              className="inline-flex items-center gap-1.5 bg-card hover:bg-elevated border border-line text-fg text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Compass size={12} /> How it works
            </Link>
          </>
        )}
      />

      {/* Committee badge — auto-hides unless the user holds a
          committee membership. HQP Advisory members get the proud
          big badge; EQUIP Review members get a compact chip. */}
      <CommitteeBadgeStrip userId={userId} />

      {/* Credit-expiry nudge — auto-hides unless a grant is within
          90 days of expiry; ramps urgency at 30 and 7 days. */}
      <ExpiringCreditsBanner userId={userId} />

      {/* Today's review bookmarks — auto-hides when nothing's due. */}
      <TodaysReviewsCard initial={reviewQueue} />

      {/* Saved-internship deadline nudge */}
      {expiringSavedPostings.length > 0 && (
        <Link
          href="/profile/applications"
          className="block bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-2xl px-5 py-3.5 hover:border-amber-300 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 text-lg">
              ⏰
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {expiringSavedPostings.length} saved posting{expiringSavedPostings.length === 1 ? "" : "s"} expire{expiringSavedPostings.length === 1 ? "s" : ""} this week
              </p>
              <ul className="text-xs text-amber-800/90 mt-0.5 space-y-0.5">
                {expiringSavedPostings.map((s) => (
                  <li key={s.id}>
                    <span className="font-medium">{s.posting.title}</span> — {s.posting.companyName}
                    {s.posting.deadline && (
                      <span className="text-amber-700/80"> · {s.posting.deadline.toLocaleDateString()}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Link>
      )}

      {/* Pending buddy invites banner */}
      {pendingBuddyInvites.length > 0 && (
        <Link
          href="/buddy"
          className="block bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-2xl px-5 py-3 hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              💛
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {pendingBuddyInvites.length === 1
                  ? `${pendingBuddyInvites[0].initiator.name ?? pendingBuddyInvites[0].initiator.email} invited you to be their learning buddy`
                  : `${pendingBuddyInvites.length} learning buddy invites are waiting for you`}
              </p>
              <p className="text-xs text-amber-800">Open Learning buddies to accept or decline.</p>
            </div>
            <ArrowRight size={16} className="text-amber-700" />
          </div>
        </Link>
      )}

      {/* Below-the-hero soft banners. Both auto-hide when not
          relevant. */}
      <UpcomingEventBanner userId={userId} />
      <DailyThemeCard />

      {/* ─── MINIMAL BODY ───────────────────────────────────────────
          Deliberately not a dashboard. No stat tiles, no card grids,
          no sidebars, no widgets. One primary action card + a quiet
          activity list + text-only explore links. Reader answers a
          single question here — "what should I do next?" — and
          everything else lives behind the sidebar. */}
      <PrimaryNextCard
        active={activeContinue[0] ?? null}
        myPathwayCount={myPathways.length}
        suggestion={suggestedCourses[0] ?? null}
      />
      {recentActivity.length > 0 && (
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
            Recent
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {recentActivity.slice(0, 3).map((s) => {
              const done = s.status === "passed" || s.status === "completed";
              return (
                <li key={s.id} className="flex items-baseline gap-3 py-2.5">
                  <span className={cn(
                    "text-sm flex-1 truncate",
                    done ? "text-fg" : "text-muted",
                  )}>
                    {s.package.course.title}
                  </span>
                  {s.score != null && (
                    <span className="text-xs text-subtle font-mono tabular-nums shrink-0">{Math.round(s.score)}%</span>
                  )}
                  <span className="text-xs text-subtle shrink-0">{new Date(s.updatedAt).toLocaleDateString()}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {/* ─── FOR YOU ─────────────────────────────────────────────────
          User-requested goodies surface: how far the trainee is from
          their next merch unlock (full-width prominent card), an
          anonymised top-10 leaderboard of real-account trainees by
          credits trained, and a feed of the latest platform updates
          from the changelog registry. All three components auto-hide
          when there's nothing meaningful to show. */}
      <section className="pt-2 space-y-5">
        <h2 className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          For you
        </h2>
        <RewardsDistanceCard userId={userId} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CreditUsageScoreboard userId={userId} />
          <LatestNewsCard />
        </div>
      </section>

      <ExploreLinks credits={user?.credits ?? 0} />
    </div>
  );
}

// ─── Minimal helpers ─────────────────────────────────────────────

interface ActiveCourse {
  id: string;
  courseId: string;
  progress: number;
  course: { id: string; title: string; category: string | null };
}

/**
 * The page's single primary action card. Answers "what should I do
 * next?" with whichever of three states applies:
 *
 *   • If the trainee has an in-progress course → resume it.
 *   • If they don't but the platform has suggested one → start it.
 *   • Otherwise → push them to the catalog with friendly copy.
 *
 * One card, one CTA. Replaces the previous three-pillar / numbers /
 * grid / sidebar tangle.
 */
function PrimaryNextCard({
  active, myPathwayCount, suggestion,
}: {
  active: ActiveCourse | null;
  myPathwayCount: number;
  suggestion: { id: string; title: string; category: string | null } | null;
}) {
  if (active) {
    return (
      <Link
        href={`/courses/${active.courseId}`}
        className="group block rounded-2xl border border-line bg-card surface-shadow p-6 hover:border-brand-300 hover:-translate-y-0.5 transition-all"
      >
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Pick up where you left off
        </p>
        <h2 className="text-2xl font-bold text-fg mt-1 tracking-tight group-hover:text-brand-700 transition-colors">
          {active.course.title}
        </h2>
        <p className="text-xs text-muted mt-1">
          {active.course.category ?? "Course"}
          {myPathwayCount > 0 && (
            // Plain text — can't nest a Link with an onClick handler
            // inside the parent <Link> (server component would have
            // to serialise the handler to the client and crashes).
            // The pathway shortcut lives below the card in the
            // ExploreLinks row instead.
            <> · enrolled in {myPathwayCount} pathway{myPathwayCount === 1 ? "" : "s"}</>
          )}
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted mb-1.5">
            <span>{Math.round(active.progress)}% complete</span>
            <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
              Resume <ArrowRight size={12} />
            </span>
          </div>
          <div className="h-2 bg-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
              style={{ width: `${active.progress}%` }}
            />
          </div>
        </div>
      </Link>
    );
  }
  if (suggestion) {
    return (
      <Link
        href={`/courses/${suggestion.id}`}
        className="group block rounded-2xl border border-line bg-card surface-shadow p-6 hover:border-brand-300 hover:-translate-y-0.5 transition-all"
      >
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          One suggestion to start with
        </p>
        <h2 className="text-2xl font-bold text-fg mt-1 tracking-tight group-hover:text-brand-700 transition-colors">
          {suggestion.title}
        </h2>
        <p className="text-xs text-muted mt-1">{suggestion.category ?? "Course"}</p>
        <p className="text-xs font-semibold text-brand-700 mt-4 inline-flex items-center gap-1">
          Open course <ArrowRight size={12} />
        </p>
      </Link>
    );
  }
  return (
    <Link
      href="/courses"
      className="group block rounded-2xl border border-line bg-card surface-shadow p-6 hover:border-brand-300 hover:-translate-y-0.5 transition-all"
    >
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Start somewhere</p>
      <h2 className="text-2xl font-bold text-fg mt-1 tracking-tight group-hover:text-brand-700 transition-colors">
        Browse the catalog
      </h2>
      <p className="text-sm text-muted mt-1">
        Pick one course to anchor your training. Pathways and certificates follow.
      </p>
      <p className="text-xs font-semibold text-brand-700 mt-4 inline-flex items-center gap-1">
        Open the catalog <ArrowRight size={12} />
      </p>
    </Link>
  );
}

/**
 * Text-only "explore the rest" footer. Deliberately not a card grid;
 * the page already answers the primary question. Anything else is
 * just a list of inline links — no boxes, no badges.
 */
function ExploreLinks({ credits }: { credits: number }) {
  return (
    <p className="text-xs text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
      <Link href="/courses"      className="hover:text-fg hover:underline">Browse courses</Link>
      <Link href="/pathways"     className="hover:text-fg hover:underline">Pathways</Link>
      <Link href="/certificates" className="hover:text-fg hover:underline">Certificates</Link>
      <Link href="/credits"      className="hover:text-fg hover:underline">{credits.toLocaleString()} credits</Link>
      <Link href="/experience"   className="hover:text-fg hover:underline">How the program works</Link>
    </p>
  );
}
