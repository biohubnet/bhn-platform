import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";
import { DesignSystemProvider } from "@/components/ui/DesignSystemProvider";
import { InstructorDashboard } from "@/components/dashboards/InstructorDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { TodaysReviewsCard, type ReviewQuestion } from "@/components/adaptive/TodaysReviewsCard";
import { UpcomingEventBanner } from "@/components/events/UpcomingEventBanner";
import { ExpiringCreditsBanner } from "@/components/credits/ExpiringCreditsBanner";
import { CommitteeBadgeStrip } from "@/components/lms/CommitteeBadgeStrip";
import { LogoMark } from "@/components/ui/Logo";
import { CreditUsageScoreboard } from "@/components/dashboards/CreditUsageScoreboard";
import { RewardsDistanceCard } from "@/components/dashboards/RewardsDistanceCard";
import { LatestNewsCard } from "@/components/dashboards/LatestNewsCard";

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
    openEquipVc,
    openEquipVl,
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
    // Currently-open VC + VL windows — one card per stream, the
    // SOONEST upcoming open or extended cycle. Trainees see at most
    // two EQUIP rows (one VC, one VL); if a stream has nothing
    // open, that row simply doesn't render. Skips closed / passed
    // windows by definition.
    prisma.equipDeadline.findFirst({
      where: { stream: "venture_connect", status: { in: ["open", "extended"] }, deadlineAt: { gte: now } },
      orderBy: { deadlineAt: "asc" },
      select: { id: true, stream: true, deadlineAt: true, status: true, cycleLabel: true },
    }),
    prisma.equipDeadline.findFirst({
      where: { stream: "venture_lift", status: { in: ["open", "extended"] }, deadlineAt: { gte: now } },
      orderBy: { deadlineAt: "asc" },
      select: { id: true, stream: true, deadlineAt: true, status: true, cycleLabel: true },
    }),
  ]);
  const openEquipDeadlines = [openEquipVc, openEquipVl].filter(
    (d): d is NonNullable<typeof d> => d !== null,
  );

  // ─── WE ARE DEADLINE-DRIVEN data ───────────────────────────────
  // Powers the 4-column ENGAGE / EXPERIENCE / EQUIP / EVENTS pillar
  // card that mirrors the biohubnet.ca marketing pattern. Each query
  // is capped to keep the columns vertically balanced.
  const [
    engagePathways,
    engageOpportunities,
    experienceInternships,
    experienceOpportunities,
    upcomingEvents,
  ] = await Promise.all([
    // ENGAGE — published pathways with enrollment open (or no close
    // date). Pathways are the most "deadline-driven" engage items
    // (Med Affairs, Entrepreneurship, …) so they go first.
    prisma.pathway.findMany({
      where: {
        status: "published",
        enrollmentStatus: "open",
        OR: [
          { enrollmentClosesAt: null },
          { enrollmentClosesAt: { gte: now } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        enrollmentClosesAt: true,
        enrollmentStatus: true,
      },
      orderBy: [{ enrollmentClosesAt: "asc" }, { createdAt: "desc" }],
      take: 2,
    }),
    // Admin-curated engage highlights (special workshops, featured
    // pathways the admin wants to push). Sits below pathways.
    prisma.opportunityDeadline.findMany({
      where: { pillar: "engage", status: { in: ["active", "full"] } },
      orderBy: [{ displayOrder: "asc" }, { deadlineAt: "asc" }],
      take: 2,
    }),
    // EXPERIENCE — active internships with a future deadline.
    prisma.internshipPosting.findMany({
      where: { status: "active", deadline: { gte: now } },
      select: {
        id: true,
        title: true,
        companyName: true,
        deadline: true,
        keySkills: true,
      },
      orderBy: { deadline: "asc" },
      take: 2,
    }),
    // Knowledge Exchange + Mobility Award opportunities. The
    // OpportunityDeadline table is the generic home for "deadline
    // cards without their own dedicated model" — admins curate it
    // and the dashboard reads it back.
    prisma.opportunityDeadline.findMany({
      where: { pillar: "experience", status: { in: ["active", "full"] } },
      orderBy: [{ displayOrder: "asc" }, { deadlineAt: "asc" }],
      take: 3,
    }),
    // EVENTS — pulls from the SAME event calendar source that the
    // public /events page renders (BhnEvent, not individual
    // Workshops). Trainees see the parent symposium / training-week
    // editions here; the per-event page handles drilling into the
    // workshop schedule. Filter mirrors /events: published + not
    // yet ended.
    prisma.bhnEvent.findMany({
      where: { status: "published", endDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        tagline: true,
        startDate: true,
        endDate: true,
        mainVenueName: true,
      },
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

  // ─── HERO COPY VARIANTS ────────────────────────────────────────
  // Slightly different state-aware lead lines so a returning
  // trainee, a brand-new trainee, and a finished-some trainee each
  // get a fitted sentence under their name instead of one generic
  // line trying to cover every state.
  const heroLead =
    inProgress > 0
      ? `${inProgress} course${inProgress === 1 ? "" : "s"} in flight. Today's the day to make a stitch.`
      : completedCourseCount > 0
        ? `${completedCourseCount} course${completedCourseCount === 1 ? "" : "s"} done. The path keeps unfolding.`
        : "The path lives here. Pick one up.";

  return (
    <div>
      {/* HERO — bespoke editorial composition for the trainee
            dashboard. Deeper, more designerly than the stock
            PageHero/DSPageHeader: theme-aware `.hero-mesh-brand`
            base for theme adaptation, layered with extra
            blurred mesh blobs + a faint constellation grid for
            depth, an editorial top rail (mono date + decorative
            hairlines + four-petal mark), and a magazine-style
            title block that mixes a small italic-serif greeting
            with a huge italic-serif name set on the cinematic
            gradient. Optional right-column stats stack on lg+
            adds quantitative presence. Bottom scrim from
            .hero-mesh-brand provides contrast under the body
            copy on every theme. */}
      <section className="relative overflow-hidden hero-mesh-brand">
        {/* Extra blurred mesh accents — beyond what
            .hero-mesh-brand draws — give the panel more atmospheric
            depth. Theme-aware via mesh tokens, but the radii +
            opacities here amplify the "wash" feeling. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--hero-mesh-1, rgba(56,189,248,0.6))" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-20 w-[32rem] h-[32rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--hero-mesh-2, rgba(244,114,182,0.6))" }}
        />

        {/* Faint constellation grid — gives "depth" without screaming.
            Single repeating dot pattern at very low opacity, mix-blend-
            overlay so it interacts with the underlying mesh instead of
            sitting on top as obvious noise. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-14 sm:pb-20 lg:pb-24 max-w-6xl mx-auto">
          {/* Top rail — left: small "DASHBOARD · weekday, date"
              in mono, then a decorative hairline runner, right:
              the four-petal mark. Editorial / brand mark detail. */}
          <div className="flex items-center gap-4 mb-10 sm:mb-12">
            <span className="text-[10px] uppercase tracking-[0.32em] font-bold text-white/60 font-mono whitespace-nowrap">
              Dashboard · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </span>
            <span aria-hidden className="flex-1 h-px bg-gradient-to-r from-white/25 via-white/10 to-transparent" />
            <LogoMark size={22} className="shrink-0 opacity-85 drop-shadow-[0_2px_12px_rgba(56,189,248,0.45)]" />
          </div>

          {/* Title block — two-column on lg (title left, stats
              right), single column otherwise. Italic-serif "Welcome
              back," + giant italic-serif name in the cinematic
              gradient. Pulls every theme's accent into the title
              treatment. */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-end">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-serif italic text-white/70 leading-none">
                Welcome back,
              </p>
              <h1
                className="mt-2 sm:mt-3 font-serif italic text-6xl sm:text-7xl lg:text-8xl leading-[0.92] tracking-tight"
                style={{
                  backgroundImage: "var(--hero-title-gradient, linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.85) 55%, var(--brand-600, #1d4f8b) 100%))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  // Solid colour fallback in case the gradient doesn't
                  // paint (older browsers, SSR pre-paint).
                  color: "#ffffff",
                }}
              >
                {firstName}.
              </h1>

              {/* Mid-rule + lead sentence */}
              <div className="mt-7 max-w-xl">
                <span aria-hidden className="block h-px w-12 bg-white/30 mb-4" />
                <p className="text-base sm:text-lg text-white/85 leading-relaxed">
                  {heroLead}
                </p>
              </div>

              {/* Actions — primary brand pill + ghost secondary */}
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={inProgress > 0 ? "/my-courses" : "/courses"}
                  className="inline-flex items-center gap-1.5 bg-white text-slate-900 hover:bg-white/90 font-bold text-xs px-4 py-2.5 rounded-full shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  {inProgress > 0 ? "Continue" : "Browse courses"} <ArrowRight size={13} />
                </Link>
                <Link
                  href="/experience"
                  className="inline-flex items-center gap-1.5 bg-white/8 hover:bg-white/14 border border-white/25 text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-colors backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  <Compass size={13} /> How it works
                </Link>
              </div>
            </div>

            {/* Right-column stats stack — only on lg+. Hairline-
                separated from the title block. Each row carries a
                mono number + uppercase label, evoking a printer's
                colophon or a designer's spec sheet. */}
            <aside className="hidden lg:block self-stretch pl-10 border-l border-white/15">
              <div className="space-y-5">
                <HeroStat label="In progress" value={inProgress.toLocaleString()} />
                <HeroStat label="Credits" value={(user?.credits ?? 0).toLocaleString()} />
                <HeroStat label="Certificates" value={certsCount.toLocaleString()} />
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Committee badge — recognition surface. Auto-hides for
          non-members. */}
      <CommitteeBadgeStrip userId={userId} />

      {/* ── A NOTE FROM THE TEAM ────────────────────────────────────
            Hand-set editorial blurb from the BHN founders to the
            trainee, sitting just under the hero. Italic serif body
            on a faint brand-tone wash, signed off with the four-
            petal LogoMark + uppercase team attribution. Standard
            section padding so it pairs with the rest of the page;
            extra `max-w-2xl mx-auto` centres the body for an
            editorial line-length that's comfortable to read. */}
      <section
        className="border-t border-line py-5 sm:py-7 px-5 sm:px-8 relative overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(56,189,248,0.045) 0%, rgba(99,102,241,0.03) 55%, rgba(244,114,182,0.045) 100%)",
        }}
      >
        <div className="relative max-w-2xl mx-auto">
          <SectionEyebrow tone="brand">A note from the team</SectionEyebrow>
          <p className="mt-3 font-serif italic text-base sm:text-lg text-fg leading-relaxed">
            Welcome, <span className="not-italic font-bold">{firstName}</span>. We hope
            BHN does what we built it for — keeps the next move within reach. We hope you
            find a course that surprises you, a placement that opens a door, a funding
            round that gets your idea moving, and a few people whose company you&apos;d
            keep beyond the platform.{" "}
            <span className="not-italic font-bold">We&apos;re rooting for you.</span>
          </p>
          <div className="mt-4 flex items-center gap-2.5">
            <LogoMark size={20} className="shrink-0" />
            <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-fg-muted">
              — The BioHubNet team
            </span>
          </div>
        </div>
      </section>

      {/* ─── DASHBOARD SECTIONS ──────────────────────────────────────
          No outer panel, no rounded inner boxes. Each section is a
          full-width band with its own faint gradient wash, separated
          by a hairline. Reads as a sequence of editorial stripes
          rather than a stack of card-on-card chrome. The Loot Vault
          (RewardsDistanceCard) lives at the bottom now, narrower,
          per user request. */}

      {/* ── OPEN OPPORTUNITIES — four-column deadline board ──────
            ENGAGE / EXPERIENCE / EQUIP / EVENTS columns listing
            upcoming deadline-driven items. Native to the platform
            design system: standard section padding, SectionEyebrow
            header, hairline-divided columns, theme-token text +
            pill colours. Stacks 1-up small, 2x2 md, 4-up lg. */}
      <OpenOpportunitiesBoard
        engageItems={[
          ...engagePathways.map((p) => ({
            title: p.title,
            description: p.description?.trim()
              ? p.description.slice(0, 110).trim() + (p.description.length > 110 ? "…" : "")
              : "Multi-week cohort pathway with industry mentors.",
            pill: p.enrollmentClosesAt
              ? `APPLY BY ${shortDate(p.enrollmentClosesAt)}`
              : "ENROLLMENT OPEN",
            pillTone: "danger" as const,
            href: `/pathways/${p.id}`,
          })),
          ...engageOpportunities.map((o) => ({
            title: o.title,
            description: o.blurb ?? "",
            pill: o.pillText ?? deadlinePill(o.deadlineAt, o.status),
            pillTone: o.status === "full" ? ("danger" as const) : ("danger" as const),
            href: o.ctaUrl ?? undefined,
          })),
        ]}
        experienceItems={[
          ...experienceInternships.map((i) => ({
            title: i.title,
            description: i.companyName
              ? `${i.companyName} — ${(i.keySkills as string[] | null)?.slice(0, 3).join(" · ") ?? "internship placement"}`
              : ((i.keySkills as string[] | null)?.slice(0, 3).join(" · ") ?? "Internship placement"),
            pill: i.deadline
              ? `APPLY BY ${shortDate(i.deadline)}`
              : "APPLY NOW",
            pillTone: "danger" as const,
            href: `/internships/${i.id}`,
          })),
          ...experienceOpportunities.map((o) => ({
            title: o.title,
            description: o.blurb ?? "",
            pill: o.pillText ?? deadlinePill(o.deadlineAt, o.status),
            pillTone: o.status === "full" ? ("danger" as const) : ("danger" as const),
            href: o.ctaUrl ?? undefined,
          })),
        ]}
        equipItems={openEquipDeadlines.map((d) => {
          const isVL = d.stream === "venture_lift";
          return {
            title: isVL
              ? `VentureLift · ${d.cycleLabel ?? shortDate(d.deadlineAt)}`
              : `VentureConnect · ${d.cycleLabel ?? shortDate(d.deadlineAt)}`,
            description: isVL
              ? "Up to $25K for IP-backed innovations — supports business strategy, product development, regulatory navigation."
              : "Up to $5K for industry events, investor conferences, and pitch competitions.",
            pill: `APPLY BY ${shortDate(d.deadlineAt)}${d.status === "extended" ? " · EXT" : ""}`,
            pillTone: "danger" as const,
            href: "/equip",
          };
        })}
        eventItems={upcomingEvents.map((e) => ({
          title: e.title,
          description: (e.tagline?.trim() || e.mainVenueName) ?? "BioHubNet in-person event",
          pill: formatEventPill(e.startDate, e.endDate),
          pillTone: "info" as const,
          href: `/events/${e.slug}`,
        }))}
      />

      {/* ── PERSONAL STATUS — compact, scannable bottom strip ──────
            The Pillar Trinity used to carry "your status" data — N
            in progress, certs earned, talent-pool state. That info
            still matters, but it doesn't need to dominate the
            page. Now it's a thin three-column strip below the
            DEADLINE-DRIVEN board: status + a primary action per
            pillar. */}
      <section className="border-t border-line">
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:divide-x lg:divide-line">
          <PersonalStatusColumn
            tone="emerald"
            eyebrow="Your training"
            primary={`${inProgress.toLocaleString()} in progress`}
            secondary={[
              `${certsCount} certificate${certsCount === 1 ? "" : "s"}`,
              `${completedCourseCount} course${completedCourseCount === 1 ? "" : "s"} done`,
              `${(user?.credits ?? 0).toLocaleString()} credits`,
            ]}
            cta={
              activeContinue[0]
                ? { label: "Continue learning", href: `/courses/${activeContinue[0].courseId}` }
                : suggestedCourses[0]
                  ? { label: "Browse catalog", href: "/courses" }
                  : { label: "Browse catalog", href: "/courses" }
            }
          />
          <PersonalStatusColumn
            tone="amber"
            eyebrow="Your placement"
            primary={
              talentSubmission
                ? inPoolApproved
                  ? "In the talent pool"
                  : talentSubmission.reviewStatus === "rejected"
                    ? "Application not approved"
                    : "Application under review"
                : "Not in the talent pool"
            }
            secondary={[
              `${savedPostingsCount} saved posting${savedPostingsCount === 1 ? "" : "s"}`,
              talentSubmission
                ? `Submitted ${new Date(talentSubmission.createdAt).toLocaleDateString()}`
                : "Apply once you have a course or two under your belt",
            ]}
            cta={
              talentSubmission
                ? { label: "Manage application", href: "/profile/applications" }
                : { label: "Apply to talent pool", href: "/forms/talent-application" }
            }
          />
          <PersonalStatusColumn
            tone="sky"
            eyebrow="Your funding"
            primary={
              fundedEquipApp
                ? `Funded $${(fundedEquipApp.approvedAmount ?? 0).toLocaleString()}`
                : liveEquipApp
                  ? liveEquipApp.status === "draft"
                    ? "Draft in progress"
                    : liveEquipApp.status === "submitted"
                      ? "Submitted — awaiting review"
                      : liveEquipApp.status === "under_review"
                        ? "Under committee review"
                        : "Pre-screen approved"
                  : "No application yet"
            }
            secondary={
              fundedEquipApp
                ? [`Stream: ${fundedEquipApp.stream === "venture_lift" ? "VentureLift" : "VentureConnect"}`, "Welcome to BHN-backed founders"]
                : liveEquipApp
                  ? [`${liveEquipApp.stream === "venture_lift" ? "VentureLift" : "VentureConnect"} application`]
                  : ["VC ≤ $5K · VL ≤ $25K", "Apply with a real idea — even early-stage"]
            }
            cta={
              liveEquipApp
                ? { label: liveEquipApp.status === "draft" ? "Resume draft" : "View application", href: `/equip/${liveEquipApp.id}` }
                : { label: "Apply for funding", href: "/equip" }
            }
          />
        </div>
      </section>

      {/* Recent activity — small ledger of latest course sessions.
          Optional, drops out when nothing's logged yet. */}
      {recentActivity.length > 0 && (
        <section className="border-t border-line py-4 sm:py-6 px-5 sm:px-8">
          <SectionEyebrow>Recent</SectionEyebrow>
          <ul className="mt-3 divide-y divide-line border-y border-line">
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
        className="border-t border-line py-4 sm:py-6 px-5 sm:px-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(56,189,248,0.07) 0%, rgba(124,58,237,0.05) 50%, rgba(244,114,182,0.06) 100%)",
        }}
      >
        <SectionEyebrow>For you</SectionEyebrow>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          <CreditUsageScoreboard userId={userId} />
          <LatestNewsCard />
        </div>
      </section>

      {/* ── REMINDERS — amber wash. Auto-hides when nothing's due. */}
      {hasReminders && (
        <section
          className="border-t border-line py-4 sm:py-6 px-5 sm:px-8"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.04) 60%, rgba(244,63,94,0.04) 100%)",
          }}
        >
          <SectionEyebrow tone="amber">Reminders</SectionEyebrow>
          <div className="mt-3 divide-y divide-line border-y border-amber-200/40">
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

      {/* ── BOTTOM: LOOT VAULT ─────────────────────────────────────
            The Loot Vault wears its full playful chrome here —
            rainbow gradient panel, floating gift glyphs, big credits
            scoreboard, glowing milestone bar with tier markers —
            mirroring the /rewards page style at dashboard scale.
            Sits alone in the bottom band; the previous "Today's
            theme" companion has migrated into the theme picker
            itself as a limited-time featured promo, so theme
            discovery lives where the action does. */}
      <section
        className="border-t border-line py-5 sm:py-6 px-5 sm:px-8"
        // Band wash now matches the inner panel's 3-stop ramp
        // (indigo → violet → fuchsia) at very low opacity so the
        // band hints at the loot palette without piling more hues
        // on top of an already-vivid panel.
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(67,56,202,0.05) 0%, rgba(109,40,217,0.04) 55%, rgba(190,24,93,0.04) 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <SectionEyebrow tone="brand">Loot vault</SectionEyebrow>
          <div className="mt-3">
            <RewardsDistanceCard userId={userId} />
          </div>
        </div>
      </section>

      <ExploreLinks credits={user?.credits ?? 0} />
    </div>
  );
}

/** HeroStat — right-column stat tile inside the trainee dashboard
 *  hero. Big mono number on top, tiny uppercase tracked label
 *  underneath. White-on-dark only — sits in the cinematic hero
 *  where text is always white. */
function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-3xl xl:text-4xl font-black font-mono tabular-nums leading-none text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] uppercase tracking-[0.28em] font-bold text-white/65">
        {label}
      </p>
    </div>
  );
}

type EyebrowTone = "brand" | "amber" | "emerald" | "sky" | "violet";

/** Section eyebrow — small uppercase tracked label with a tone-tinted
 *  gradient hairline leading into the title. Used to mark each
 *  hairline-divided section. Tone vocabulary mirrors the sidebar
 *  pillar tones (engage=emerald, experience=amber, equip=sky,
 *  events=violet) so visual association carries across the
 *  platform. */
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
          : tone === "violet"
            ? "linear-gradient(90deg, rgb(139,92,246), rgb(244,114,182))"
            : "linear-gradient(90deg, rgb(56,189,248), rgb(124,58,237))";
  return (
    <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-subtle inline-flex items-center gap-2">
      <span aria-hidden className="block h-px w-6" style={{ background: gradient }} />
      {children}
    </p>
  );
}

// ─── DEADLINE-DRIVEN BOARD ────────────────────────────────────────
// Native to the platform design system: a standard flat section
// (border-t + py-4 sm:py-6 + px-5 sm:px-8) with a SectionEyebrow
// header and a 4-column hairline-divided body. No rounded panel,
// no hardcoded navy chrome — every colour comes from the existing
// SectionEyebrow tone system (emerald/amber/sky/violet) + Tailwind
// status palette (rose-50/sky-50/amber-50 with ring overlays),
// both of which already have theme overrides in globals.css. Sits
// rhythmically next to the For You / Reminders / Loot Vault
// sections instead of barging in as a marketing card.

interface PillarItem {
  title: string;
  description: string;
  pill?: string;
  pillTone?: "danger" | "info" | "warning" | "neutral";
  href?: string;
}

type PillarTone = "emerald" | "amber" | "sky" | "violet";

function OpenOpportunitiesBoard({
  engageItems,
  experienceItems,
  equipItems,
  eventItems,
}: {
  engageItems: PillarItem[];
  experienceItems: PillarItem[];
  equipItems: PillarItem[];
  eventItems: PillarItem[];
}) {
  return (
    <section
      className="border-t border-line py-4 sm:py-6 px-5 sm:px-8"
      // Quiet 4-pillar wash — emerald/amber/sky/violet — hints at
      // the column tones without competing with them. Matches the
      // wash pattern of For You / Reminders sections.
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(245,158,11,0.03) 33%, rgba(14,165,233,0.04) 66%, rgba(139,92,246,0.03) 100%)",
      }}
    >
      <SectionEyebrow tone="brand">Open opportunities</SectionEyebrow>
      <p className="text-xs text-fg-muted leading-snug mt-1 max-w-2xl">
        Deadline-driven training, placements, funding, and events. Each column lists what&apos;s open right now.
      </p>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line border-y md:border-y-0 border-line">
        <PillarColumn
          tone="emerald"
          label="Engage · Training"
          audience="Open to grad students, postdocs and researchers — free with training credits"
          emptyMessage="No upcoming pathway windows. New cohorts drop most quarters."
          viewAllHref="/pathways"
          items={engageItems}
        />
        <PillarColumn
          tone="amber"
          label="Experience · Placements"
          audience="For grad students and postdocs ready for hands-on placements"
          emptyMessage="No open internships, KE rounds, or mobility awards right now."
          viewAllHref="/internships"
          items={experienceItems}
        />
        <PillarColumn
          tone="sky"
          label="Equip · Funding"
          audience="For trainee-entrepreneurs with an IP-backed innovation"
          emptyMessage="No open funding windows. New VC + VL cycles drop most months."
          viewAllHref="/equip"
          items={equipItems}
        />
        <PillarColumn
          tone="violet"
          label="Events"
          audience="Meet the BioHubNet team in person — drop by, no RSVP needed unless noted"
          emptyMessage="No public events on the calendar this week."
          viewAllHref="/events"
          items={eventItems}
        />
      </div>
    </section>
  );
}

// Static per-tone class strings for item-title hover + view-all
// link colour. Kept STATIC (not interpolated) so Tailwind's JIT
// picks them up at build time. Every dark theme already overrides
// the 700/900 step in globals.css, so these read on every theme.
const PILLAR_TONE_CLASSES: Record<PillarTone, { title: string; link: string }> = {
  emerald: {
    title: "text-fg group-hover:text-emerald-700 transition-colors",
    link:  "text-emerald-700 hover:text-emerald-900",
  },
  amber: {
    title: "text-fg group-hover:text-amber-700 transition-colors",
    link:  "text-amber-700 hover:text-amber-900",
  },
  sky: {
    title: "text-fg group-hover:text-sky-700 transition-colors",
    link:  "text-sky-700 hover:text-sky-900",
  },
  violet: {
    title: "text-fg group-hover:text-violet-700 transition-colors",
    link:  "text-violet-700 hover:text-violet-900",
  },
};

function PillarColumn({
  tone,
  label,
  audience,
  emptyMessage,
  viewAllHref,
  items,
}: {
  tone: PillarTone;
  label: string;
  audience: string;
  emptyMessage: string;
  viewAllHref: string;
  items: PillarItem[];
}) {
  const cls = PILLAR_TONE_CLASSES[tone];

  return (
    <div className="px-4 lg:px-5 py-4 lg:py-2 flex flex-col">
      {/* Column header — same SectionEyebrow rhythm as every
          other section heading on the dashboard. Tone differs
          per pillar; spacing stays uniform. */}
      <SectionEyebrow tone={tone}>{label}</SectionEyebrow>
      <p className="text-[11px] italic text-fg-muted leading-snug mt-1.5">
        {audience}
      </p>

      {items.length === 0 ? (
        <p className="text-xs text-fg-muted italic leading-snug mt-4">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-4 space-y-3 flex-1">
          {items.map((it, i) => {
            const titleBody = (
              <>
                <p className={`text-sm font-semibold leading-snug ${cls.title}`}>
                  {it.title}
                </p>
                {it.description && (
                  <p className="text-[11.5px] text-fg-muted leading-snug mt-0.5">
                    {it.description}
                  </p>
                )}
                {it.pill && (
                  <span
                    className={
                      "mt-1.5 inline-flex items-center text-[10px] uppercase tracking-[0.14em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset " +
                      pillToneClasses(it.pillTone)
                    }
                  >
                    {it.pill}
                  </span>
                )}
              </>
            );
            return (
              <li key={i}>
                {it.href ? (
                  <Link href={it.href} className="block group">
                    {titleBody}
                  </Link>
                ) : (
                  <div>{titleBody}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={viewAllHref}
        className={`mt-auto pt-3 inline-flex items-center gap-1 text-[11px] font-bold ${cls.link}`}
      >
        See all <ArrowRight size={11} />
      </Link>
    </div>
  );
}

// Status pill tones — light fills with ring outlines, matching the
// platform's existing status badge family (see admin event status
// pills, equip-application pills). All three theme overrides for
// rose / sky / amber kick in on dark themes via globals.css.
function pillToneClasses(tone: PillarItem["pillTone"]): string {
  switch (tone) {
    case "info":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    case "warning":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "neutral":
      return "bg-elevated text-fg-muted ring-line";
    case "danger":
    default:
      return "bg-rose-50 text-rose-800 ring-rose-200";
  }
}

function shortDate(d: Date | null | undefined): string {
  if (!d) return "TBA";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
}

function deadlinePill(deadline: Date | null | undefined, status: string): string {
  if (status === "full") return "FULL · WAITLIST";
  if (status === "closed") return "CLOSED";
  if (!deadline) return "OPEN";
  return `APPLY BY ${shortDate(deadline)}`;
}

function formatEventPill(start: Date, end: Date | null | undefined): string {
  const startDate = new Date(start);
  const dateStr = startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
  const startTime = startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(":00", "");
  if (!end) return `${dateStr} · ${startTime}`;
  const endDate = new Date(end);
  const endTime = endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(":00", "");
  return `${dateStr} · ${startTime}–${endTime}`;
}

// ─── PERSONAL STATUS COLUMN ───────────────────────────────────────
// Compact below-the-board strip carrying the trainee's personal
// status across each pillar. Replaces the heavier metric-led
// PillarColumn from before — same information, less real estate.
function PersonalStatusColumn({
  tone,
  eyebrow,
  primary,
  secondary,
  cta,
}: {
  tone: EyebrowTone;
  eyebrow: string;
  primary: string;
  secondary: string[];
  cta: { label: string; href: string };
}) {
  const ctaCls =
    tone === "emerald" ? "text-emerald-700 hover:text-emerald-900" :
    tone === "amber"   ? "text-amber-700 hover:text-amber-900" :
    tone === "sky"     ? "text-sky-700 hover:text-sky-900" :
                          "text-brand-700 hover:text-brand-900";

  // Padding matches the DEADLINE-DRIVEN board's PillarColumn so
  // the two stacked sections (the board + this status strip)
  // read as one rhythmic surface — same column horizontal spacing,
  // same vertical breathing room. Eyebrow + primary line tightened
  // (mt-1.5, leading-snug, smaller secondary text) to keep the
  // strip compact.
  return (
    <div className="px-4 sm:px-5 py-4 sm:py-5">
      <SectionEyebrow tone={tone}>{eyebrow}</SectionEyebrow>
      <p className="mt-1.5 text-base font-black text-fg leading-snug">
        {primary}
      </p>
      <ul className="mt-1 space-y-0.5 text-[11.5px] text-fg-muted leading-snug">
        {secondary.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`mt-2 inline-flex items-center gap-1 text-[11px] font-bold ${ctaCls}`}
      >
        {cta.label} <ArrowRight size={11} />
      </Link>
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
