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

  // ─── PILLAR-TRINITY DATA ───────────────────────────────────────
  // One query per pillar so the trainee dashboard surfaces ENGAGE,
  // EXPERIENCE, and EQUIP equally. Each pillar column reads the
  // trainee's status (what they've done) + opportunities (what's
  // open for them right now). Run in parallel — none depend on
  // each other.
  const now = new Date();
  const [
    certsCount,
    completedCourseCount,
    talentSubmission,
    openPostingsCount,
    savedPostingsCount,
    myEquipApps,
    openEquipWindowsCount,
  ] = await Promise.all([
    prisma.certificate.count({ where: { userId, revokedAt: null } }),
    prisma.enrollment.count({ where: { userId, status: "completed" } }),
    prisma.eventFormSubmission.findFirst({
      where: { userId, form: { slug: "talent-application" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, reviewStatus: true, leftPoolAt: true },
    }),
    prisma.internshipPosting.count({ where: { status: "active" } }),
    prisma.userSavedPosting.count({ where: { userId } }),
    prisma.equipApplication.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { id: true, stream: true, status: true, requestedAmount: true, approvedAmount: true },
    }),
    prisma.equipDeadline.count({
      where: { status: { in: ["open", "extended"] }, deadlineAt: { gte: now } },
    }),
  ]);

  // Pillar-level summaries computed once for the JSX.
  const liveEquipApp = myEquipApps.find((a) =>
    ["draft", "submitted", "under_review", "pre_screen_approved"].includes(a.status),
  ) ?? null;
  const fundedEquipApp = myEquipApps.find((a) => a.status === "funded") ?? null;
  const inPoolApproved =
    talentSubmission?.reviewStatus &&
    ["approved", "approved_skip_review"].includes(talentSubmission.reviewStatus) &&
    talentSubmission.leftPoolAt === null;

  const hasReminders =
    expiringSavedPostings.length > 0 ||
    pendingBuddyInvites.length > 0 ||
    (reviewQueue?.length ?? 0) > 0;

  return (
    <div>
      {/* HERO — platform rule: editorial hero is the absolute top. */}
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

      {/* Committee badge — recognition surface. Auto-hides for
          non-members. */}
      <CommitteeBadgeStrip userId={userId} />

      {/* ─── DASHBOARD SECTIONS ──────────────────────────────────────
          No outer panel, no rounded inner boxes. Each section is a
          full-width band with its own faint gradient wash, separated
          by a hairline. Reads as a sequence of editorial stripes
          rather than a stack of card-on-card chrome. The Loot Vault
          (RewardsDistanceCard) lives at the bottom now, narrower,
          per user request. */}

      {/* ── PILLAR TRINITY ─────────────────────────────────────────
            Three columns, one per BHN pillar, hairline-divided.
            Each column reads as the trainee's status in that pillar
            plus the next action. Designed so a trainee lands and
            understands their position across ENGAGE / EXPERIENCE /
            EQUIP at a glance instead of treating the dashboard as
            an ENGAGE-only surface. Stacks on mobile. */}
      <section className="border-t border-line">
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:divide-x lg:divide-line">
          {/* ENGAGE — Training */}
          <PillarColumn
            tone="emerald"
            eyebrow="Engage · Training"
            metric={inProgress.toLocaleString()}
            metricLabel={inProgress === 1 ? "course in progress" : "courses in progress"}
            stats={[
              `${certsCount} certificate${certsCount === 1 ? "" : "s"} earned`,
              `${completedCourseCount} course${completedCourseCount === 1 ? "" : "s"} completed`,
              `${(user?.credits ?? 0).toLocaleString()} credits available`,
            ]}
            ctas={
              activeContinue[0]
                ? [
                    { label: "Continue learning", href: `/courses/${activeContinue[0].courseId}` },
                    { label: "Browse catalog", href: "/courses", muted: true },
                  ]
                : suggestedCourses[0]
                  ? [
                      { label: `Try ${suggestedCourses[0].title.slice(0, 32)}${suggestedCourses[0].title.length > 32 ? "…" : ""}`, href: `/courses/${suggestedCourses[0].id}` },
                      { label: "Browse catalog", href: "/courses", muted: true },
                    ]
                  : [
                      { label: "Browse catalog", href: "/courses" },
                      { label: "View pathways", href: "/pathways", muted: true },
                    ]
            }
          />

          {/* EXPERIENCE — Placements */}
          <PillarColumn
            tone="amber"
            eyebrow="Experience · Placements"
            metric={openPostingsCount.toLocaleString()}
            metricLabel={openPostingsCount === 1 ? "internship open" : "internships open"}
            stats={
              talentSubmission
                ? [
                    inPoolApproved
                      ? "In the talent pool · employers can find you"
                      : talentSubmission.reviewStatus === "rejected"
                        ? "Talent-pool application — not approved this round"
                        : "Talent-pool application — under review",
                    `${savedPostingsCount} saved posting${savedPostingsCount === 1 ? "" : "s"}`,
                    `Submitted ${new Date(talentSubmission.createdAt).toLocaleDateString()}`,
                  ]
                : [
                    "Not yet in the talent pool",
                    `${savedPostingsCount} saved posting${savedPostingsCount === 1 ? "" : "s"}`,
                    "Apply once you have a course or two under your belt",
                  ]
            }
            ctas={
              talentSubmission
                ? [
                    { label: "Browse internships", href: "/internships" },
                    { label: "Manage application", href: "/profile/applications", muted: true },
                  ]
                : [
                    { label: "Apply to talent pool", href: "/forms/talent-application" },
                    { label: "Browse internships", href: "/internships", muted: true },
                  ]
            }
          />

          {/* EQUIP — Funding */}
          <PillarColumn
            tone="sky"
            eyebrow="Equip · Funding"
            metric={openEquipWindowsCount.toLocaleString()}
            metricLabel={openEquipWindowsCount === 1 ? "window open" : "windows open"}
            stats={
              fundedEquipApp
                ? [
                    `Funded $${(fundedEquipApp.approvedAmount ?? 0).toLocaleString()}`,
                    `Stream: ${fundedEquipApp.stream === "venture_lift" ? "VentureLift" : "VentureConnect"}`,
                    "Welcome to BHN-backed founders",
                  ]
                : liveEquipApp
                  ? [
                      `${liveEquipApp.stream === "venture_lift" ? "VentureLift" : "VentureConnect"} application`,
                      liveEquipApp.status === "draft"
                        ? `Draft · ${liveEquipApp.requestedAmount ? "$" + liveEquipApp.requestedAmount.toLocaleString() : "in progress"}`
                        : liveEquipApp.status === "submitted"
                          ? "Submitted · awaiting review"
                          : liveEquipApp.status === "under_review"
                            ? "Under review by the committee"
                            : "Pre-screen approved — Stage 2 unlocked",
                      "VentureConnect ≤ $5K · VentureLift ≤ $25K",
                    ]
                  : [
                      "VentureConnect — up to $5K (monthly windows)",
                      "VentureLift — up to $25K (quarterly windows)",
                      "Apply with a real idea — even early-stage",
                    ]
            }
            ctas={
              liveEquipApp
                ? [
                    { label: liveEquipApp.status === "draft" ? "Resume draft" : "View application", href: `/equip/${liveEquipApp.id}` },
                    { label: "How EQUIP works", href: "/equip", muted: true },
                  ]
                : [
                    { label: "Apply for funding", href: "/equip" },
                    { label: "How EQUIP works", href: "/equip", muted: true },
                  ]
            }
          />
        </div>
      </section>

      {/* Recent activity — small ledger of latest course sessions.
          Optional, drops out when nothing's logged yet. */}
      {recentActivity.length > 0 && (
        <section className="border-t border-line py-6 px-5 sm:px-8">
          <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
            Recent
          </div>
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

      {/* ── FOR YOU — sky→violet wash. Leaderboard + latest news. */}
      <section
        className="border-t border-line py-7 sm:py-9 px-5 sm:px-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(56,189,248,0.07) 0%, rgba(124,58,237,0.05) 50%, rgba(244,114,182,0.06) 100%)",
        }}
      >
        <SectionEyebrow>For you</SectionEyebrow>
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
          <CreditUsageScoreboard userId={userId} />
          <LatestNewsCard />
        </div>
      </section>

      {/* ── REMINDERS — amber wash. Auto-hides when nothing's due. */}
      {hasReminders && (
        <section
          className="border-t border-line py-7 sm:py-9 px-5 sm:px-8"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.04) 60%, rgba(244,63,94,0.04) 100%)",
          }}
        >
          <SectionEyebrow tone="amber">Reminders</SectionEyebrow>
          <div className="mt-5 divide-y divide-line border-y border-amber-200/40">
            <div className="py-2"><UpcomingEventBanner userId={userId} /></div>
            <div className="py-2"><ExpiringCreditsBanner userId={userId} /></div>
            <div className="py-2"><TodaysReviewsCard initial={reviewQueue} /></div>
            {expiringSavedPostings.length > 0 && (
              <Link
                href="/profile/applications"
                className="group flex items-start gap-3 py-3 hover:bg-amber-100/40 transition-colors -mx-5 sm:-mx-8 px-5 sm:px-8"
              >
                <span className="text-amber-700 text-lg leading-tight mt-0.5" aria-hidden>⏰</span>
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
                <ArrowRight size={14} className="text-amber-700 shrink-0 mt-1 opacity-60 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}
            {pendingBuddyInvites.length > 0 && (
              <Link
                href="/buddy"
                className="group flex items-center gap-3 py-3 hover:bg-amber-100/40 transition-colors -mx-5 sm:-mx-8 px-5 sm:px-8"
              >
                <span className="text-amber-700 text-lg leading-none" aria-hidden>💛</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">
                    {pendingBuddyInvites.length === 1
                      ? `${pendingBuddyInvites[0].initiator.name ?? pendingBuddyInvites[0].initiator.email} invited you to be their learning buddy`
                      : `${pendingBuddyInvites.length} learning buddy invites are waiting for you`}
                  </p>
                  <p className="text-xs text-amber-800">Open Learning buddies to accept or decline.</p>
                </div>
                <ArrowRight size={14} className="text-amber-700 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── BOTTOM: LOOT VAULT + DAILY THEME ───────────────────────
            Two narrow columns at the bottom of the page — the loot
            vault (progress toward the next merch tier) and the
            daily theme suggestion. Both are recognition / discovery
            extras; pairing them keeps the page sequence ending on a
            playful note without devoting a full band to either. */}
      <section
        className="border-t border-line py-9 sm:py-12 px-5 sm:px-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(30,58,138,0.07) 0%, rgba(109,40,217,0.06) 40%, rgba(190,24,93,0.05) 75%, rgba(249,115,22,0.04) 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
          <div>
            <SectionEyebrow tone="brand">Loot vault</SectionEyebrow>
            <div className="mt-5">
              <RewardsDistanceCard userId={userId} />
            </div>
          </div>
          <div>
            <SectionEyebrow tone="emerald">Today&apos;s theme</SectionEyebrow>
            <div className="mt-5">
              <DailyThemeCard />
            </div>
          </div>
        </div>
      </section>

      <ExploreLinks credits={user?.credits ?? 0} />
    </div>
  );
}

type EyebrowTone = "brand" | "amber" | "emerald" | "sky";

/** Section eyebrow — small uppercase tracked label with a tone-tinted
 *  gradient hairline leading into the title. Used to mark each
 *  hairline-divided section. Tone vocabulary mirrors the sidebar
 *  pillar tones (engage=emerald, experience=amber, equip=sky) so
 *  visual association carries across the platform. */
function SectionEyebrow({
  children,
  tone = "brand",
}: {
  children: React.ReactNode;
  tone?: EyebrowTone;
}) {
  const gradient =
    tone === "amber"
      ? "linear-gradient(90deg, rgb(245,158,11), rgb(244,63,94))"
      : tone === "emerald"
        ? "linear-gradient(90deg, rgb(16,185,129), rgb(56,189,248))"
        : tone === "sky"
          ? "linear-gradient(90deg, rgb(14,165,233), rgb(99,102,241))"
          : "linear-gradient(90deg, rgb(56,189,248), rgb(124,58,237))";
  return (
    <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-subtle inline-flex items-center gap-2">
      <span aria-hidden className="block h-px w-6" style={{ background: gradient }} />
      {children}
    </p>
  );
}

/** One pillar column inside the Pillar Trinity. Uniform structure
 *  across ENGAGE / EXPERIENCE / EQUIP so the trainee can scan all
 *  three pillars the same way: eyebrow → big metric → status lines
 *  → CTAs. Tone differentiates them visually (emerald / amber / sky)
 *  but the rhythm stays consistent. */
function PillarColumn({
  tone,
  eyebrow,
  metric,
  metricLabel,
  stats,
  ctas,
}: {
  tone: EyebrowTone;
  eyebrow: string;
  metric: string;
  metricLabel: string;
  stats: string[];
  ctas: { label: string; href: string; muted?: boolean }[];
}) {
  // Per-tone CTA accent — primary CTA uses the pillar tone's text
  // colour so it reads as native to the column.
  const primaryCtaCls =
    tone === "emerald"
      ? "text-emerald-700 hover:text-emerald-900"
      : tone === "amber"
        ? "text-amber-700 hover:text-amber-900"
        : tone === "sky"
          ? "text-sky-700 hover:text-sky-900"
          : "text-brand-700 hover:text-brand-900";
  const metricGradient =
    tone === "emerald"
      ? "linear-gradient(120deg, #047857 0%, #0d9488 100%)"
      : tone === "amber"
        ? "linear-gradient(120deg, #b45309 0%, #c2410c 100%)"
        : tone === "sky"
          ? "linear-gradient(120deg, #0369a1 0%, #4338ca 100%)"
          : "linear-gradient(120deg, var(--brand-700, #1d4f8b) 0%, #4338ca 100%)";

  return (
    <div className="px-5 sm:px-8 py-7 sm:py-9">
      <SectionEyebrow tone={tone}>{eyebrow}</SectionEyebrow>

      <p
        className="text-5xl font-black tabular-nums leading-none mt-4"
        style={{
          backgroundImage: metricGradient,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {metric}
      </p>
      <p className="text-xs text-fg-muted mt-1">{metricLabel}</p>

      <ul className="mt-5 space-y-1.5 text-sm text-fg-muted leading-snug">
        {stats.map((s, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span aria-hidden className="inline-block w-1 h-1 rounded-full bg-fg-subtle shrink-0 translate-y-[-0.25em]" />
            <span>{s}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col items-start gap-1.5">
        {ctas.map((c, i) => (
          <Link
            key={i}
            href={c.href}
            className={
              "inline-flex items-center gap-1.5 text-sm font-bold transition-colors " +
              (c.muted ? "text-fg-muted hover:text-fg" : `${primaryCtaCls}`)
            }
          >
            {c.label} <ArrowRight size={12} />
          </Link>
        ))}
      </div>
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
