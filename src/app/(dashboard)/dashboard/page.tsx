import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  BookOpen, Award, Clock, TrendingUp, Layers, Coins, ArrowRight,
  GraduationCap, Sparkles, Calendar, Briefcase, Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";
import { InstructorDashboard } from "@/components/dashboards/InstructorDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { GreetingTagline } from "@/components/lms/GreetingTagline";
import { SkillGapWidget } from "@/components/lms/SkillGapWidget";
import { DailyThemeCard } from "@/components/ui/DailyThemeCard";
import { TodaysReviewsCard, type ReviewQuestion } from "@/components/adaptive/TodaysReviewsCard";
import { UpcomingEventBanner } from "@/components/events/UpcomingEventBanner";
import { ExpiringCreditsBanner } from "@/components/credits/ExpiringCreditsBanner";

interface EnrollmentWithCourse {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  score: number | null;
  enrolledAt: Date;
  course: { id: string; title: string; category: string | null; thumbnail: string | null };
}

interface ScormSessionWithCourse {
  id: string;
  attemptNumber: number;
  status: string;
  score: number | null;
  updatedAt: Date;
  package: { course: { id: string; title: string } };
}

interface PathwayEnrollmentRow {
  id: string;
  status: string;
  pathway: {
    id: string;
    title: string;
    category: string | null;
    courses: { courseId: string }[];
  };
}

interface FeaturedPathwayRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  _count: { courses: number; enrollments: number };
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
    if (employer) return <EmployerDashboard user={employer} />;
  }
  if (role === "admin" || role === "superadmin") {
    return <AdminDashboard user={{ id: userId, name: session!.user?.name ?? null }} role={role} />;
  }
  if (role === "instructor") {
    return <InstructorDashboard user={{ id: userId, name: session!.user?.name ?? null }} />;
  }

  const [enrollments, certificates, recentActivity, user, myPathways, featuredPathways, suggestedCourses] =
    await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: { course: { select: { id: true, title: true, category: true, thumbnail: true } } },
        orderBy: { enrolledAt: "desc" },
        take: 12,
      }) as Promise<EnrollmentWithCourse[]>,
      prisma.certificate.count({ where: { userId, revokedAt: null } }),
      prisma.scormSession.findMany({
        where: { userId },
        include: { package: { include: { course: { select: { id: true, title: true } } } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }) as Promise<ScormSessionWithCourse[]>,
      prisma.user.findUnique({ where: { id: userId }, select: { credits: true, role: true } }),
      prisma.pathwayEnrollment.findMany({
        where: { userId },
        include: {
          pathway: {
            select: {
              id: true,
              title: true,
              category: true,
              courses: { select: { courseId: true } },
            },
          },
        },
        orderBy: { enrolledAt: "desc" },
        take: 4,
      }) as Promise<PathwayEnrollmentRow[]>,
      prisma.pathway.findMany({
        where: { status: "published" },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          _count: { select: { courses: true, enrollments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }) as Promise<FeaturedPathwayRow[]>,
      prisma.course.findMany({
        where: {
          status: "published",
          enrollments: { none: { userId } },
        },
        select: { id: true, title: true, category: true, duration: true },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);

  // Active postings for the skill-gap widget
  const openPostings = await prisma.internshipPosting.findMany({
    where: { status: "active" },
    select: { id: true, title: true, companyName: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const completed = enrollments.filter((e) => e.status === "completed").length;
  const inProgress = enrollments.filter((e) => e.status === "active").length;

  // Compute pathway progress for "my pathways"
  const courseIdsAcrossPathways = Array.from(
    new Set(myPathways.flatMap((p) => p.pathway.courses.map((c) => c.courseId)))
  );
  const courseEnrollmentMap = new Map(
    enrollments
      .filter((e) => courseIdsAcrossPathways.includes(e.courseId))
      .map((e) => [e.courseId, e])
  );

  const activeContinue = enrollments.filter((e) => e.status === "active").slice(0, 3);

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
      {/* Credit-expiry nudge — auto-hides unless a grant is within 90
          days of expiry; ramps urgency at 30 and 7 days. Renders above
          the event banner so time-sensitive credit warnings beat the
          general "register for the symposium" CTA. */}
      <ExpiringCreditsBanner userId={userId} />

      {/* Upcoming BHN event — Symposium / Training Week. Auto-hides
          when there's no published event in the future, or registration
          is closed and the viewer isn't already registered. */}
      <UpcomingEventBanner userId={userId} />

      {/* Theme of the day — once-per-calendar-day suggestion the
          trainee can try without committing, then keep if they like it. */}
      <DailyThemeCard />

      {/* Today's review bookmarks — auto-hidden when nothing's due. */}
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

      {/* ─── HERO ────────────────────────────────────────────────────
          Magazine-style greeting + a one-line statement of what
          BioHubNet actually is. The point of leading with "what is
          BHN" rather than just "Hi, name" is that a returning user
          should still be reminded of the platform's purpose every
          time they land here — it's a network, not just a course
          catalogue. The personalised hint about in-progress courses
          slots underneath the identity line, so it's the second
          thing the eye lands on. */}
      <section className="full-bleed relative overflow-hidden text-white -mt-8 mb-8 hero-mesh-brand">
        <div className="absolute inset-0 pointer-events-none">
          <div className="blob-shape blob-soft drift" style={{ width: 560, height: 560, top: -200, left: -160 }} />
          <div className="blob-shape blob-soft drift-slow" style={{ width: 700, height: 700, bottom: -300, right: -200, opacity: 0.55 }} />
          <div className="blob-shape drift" style={{ width: 320, height: 320, top: "20%", left: "58%", opacity: 0.35 }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-14">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
            <Sparkles size={12} />
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mt-3">
            Hi, <span className="gradient-text">{firstName}</span>.
          </h1>
          <GreetingTagline tone="dark" />
          <p className="mt-5 text-white/90 leading-relaxed max-w-3xl text-lg">
            <strong className="text-white">BioHubNet</strong> is Canada&apos;s biomanufacturing training
            network — a single platform that wires Ontario HQP from their first course
            all the way to their first industry placement.{" "}
            <span className="text-white/75">
              {inProgress > 0
                ? `You have ${inProgress} course${inProgress === 1 ? "" : "s"} in progress.`
                : completed > 0
                  ? `You've completed ${completed} course${completed === 1 ? "" : "s"} so far.`
                  : "Start with a course, or skip ahead to the talent pool."}
            </span>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={inProgress > 0 ? "/my-courses" : "/courses"}
              className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-semibold text-sm px-6 py-3 organic-card shadow-lg shadow-brand-900/30 transition-all hover:-translate-y-0.5"
            >
              {inProgress > 0 ? "Continue learning" : "Browse courses"} <ArrowRight size={16} />
            </Link>
            <Link
              href="/experience"
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/25 text-white hover:bg-white/20 text-sm font-semibold px-6 py-3 organic-card-alt transition-colors"
            >
              <Compass size={16} /> How the program works
            </Link>
          </div>
        </div>
        <div className="curve-down" />
      </section>

      {/* ─── THE IDEA ────────────────────────────────────────────────
          Three-pillar explainer. Reads as: this is what we're trying
          to do here, in plain English. Each card is a clickable
          jump-off so the page doubles as platform navigation for a
          returning user who's been away a while. */}
      <section className="grid md:grid-cols-3 gap-4 -mt-2">
        <PillarCard
          icon={BookOpen}
          label="LEARN"
          title="Train the craft"
          body="Self-paced SCORM courses, instructor-led workshops, multi-course pathways that ladder up to a certificate. Pick a single topic from the catalog or commit to a curated journey."
          href="/courses"
          ctaLabel="Open the catalog"
          tone="brand"
        />
        <PillarCard
          icon={Briefcase}
          label="CONNECT"
          title="Wire to industry"
          body="Build a reusable application kit once. Submit to the talent pool. Browse live internship postings from BHN partners. Every conversation tracked in one place."
          href="/experience"
          ctaLabel="See how it works"
          tone="violet"
        />
        <PillarCard
          icon={Coins}
          label="EARN"
          title="Train, unlock gear"
          body="Every credit you spend on coursework counts toward real BHN merch — a swag bag at 2,500, an insulated bottle at 5,000. Pick up at U of T or request mailing."
          href="/rewards"
          ctaLabel="See rewards"
          tone="amber"
        />
      </section>

      {/* ─── YOUR NUMBERS ────────────────────────────────────────────
          Personal stats split out of the hero into a slim row so
          the hero stays focused on identity + idea. Each tile is
          one figure, neither over-decorated nor hidden. */}
      <section>
        <h2 className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
          Your numbers
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <NumberTile icon={BookOpen}   label="Enrolled"     value={enrollments.length} tone="brand"   />
          <NumberTile icon={Clock}      label="In progress"  value={inProgress}         tone="amber"   />
          <NumberTile icon={TrendingUp} label="Completed"    value={completed}          tone="emerald" />
          <NumberTile icon={Award}      label="Certificates" value={certificates}       tone="violet"  />
          <NumberTile icon={Coins}      label="Credits"      value={(user?.credits ?? 0)} tone="ember" href="/credits" />
        </div>
      </section>

      {/* Skill-gap widget — only renders if there are open postings */}
      {openPostings.length > 0 && (
        <SkillGapWidget postings={openPostings} />
      )}

      {/* Continue learning */}
      {activeContinue.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">Continue learning</h2>
              <p className="text-sm text-muted">Pick up where you left off.</p>
            </div>
            <Link href="/my-courses" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeContinue.map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/courses/${enrollment.courseId}`}
                className="group bg-card rounded-2xl border border-line p-5 hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center shrink-0 group-hover:from-brand-200 transition-colors">
                    <BookOpen size={18} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg text-sm leading-tight group-hover:text-brand-700 transition-colors line-clamp-2">
                      {enrollment.course.title}
                    </p>
                    <p className="text-xs text-subtle mt-1">
                      {enrollment.course.category ?? "General"}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted mb-1.5">
                    <span>Progress</span>
                    <span className="font-semibold text-muted">{Math.round(enrollment.progress)}%</span>
                  </div>
                  <div className="h-1.5 bg-raised rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My pathways */}
      {myPathways.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">Your pathways</h2>
              <p className="text-sm text-muted">Multi-course journeys you've enrolled in.</p>
            </div>
            <Link href="/pathways" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              All pathways →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {myPathways.map((pe) => {
              const total = pe.pathway.courses.length;
              const done = pe.pathway.courses.filter(
                (c) => courseEnrollmentMap.get(c.courseId)?.status === "completed"
              ).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Link
                  key={pe.id}
                  href={`/pathways/${pe.pathway.id}`}
                  className="group bg-card rounded-2xl border border-line p-5 hover:border-brand-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-md shadow-violet-600/20 shrink-0">
                      <Layers size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-fg truncate group-hover:text-brand-700 transition-colors">
                          {pe.pathway.title}
                        </p>
                        {pe.status === "completed" && <Badge tone="success">Done</Badge>}
                      </div>
                      <p className="text-xs text-subtle mt-0.5">
                        {pe.pathway.category ?? "Pathway"} · {done}/{total} complete
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-raised rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Two column lower section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-fg">Recent activity</h2>
          </div>
          <div className="bg-card rounded-2xl border border-line overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar size={32} className="mx-auto text-subtle mb-3" />
                <p className="text-sm text-muted">No activity yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {recentActivity.map((s) => {
                  const tone = s.status === "passed" || s.status === "completed"
                    ? "success" as const
                    : s.status === "failed" ? "danger" as const : "neutral" as const;
                  return (
                    <li key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-elevated/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                          <GraduationCap size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-fg truncate">{s.package.course.title}</p>
                          <p className="text-xs text-subtle">Attempt #{s.attemptNumber} · {new Date(s.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 pl-3">
                        {s.score != null && (
                          <span className="text-sm font-semibold text-muted">{Math.round(s.score)}%</span>
                        )}
                        <Badge tone={tone}>{s.status}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Right column: featured + suggested */}
        <aside className="space-y-6">
          {featuredPathways.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted mb-3 flex items-center gap-2">
                <Layers size={14} className="text-violet-500" /> Featured pathways
              </h3>
              <div className="space-y-2">
                {featuredPathways.map((p) => (
                  <Link
                    key={p.id}
                    href={`/pathways/${p.id}`}
                    className="block bg-card border border-line rounded-xl p-3 hover:border-brand-300 hover:shadow-sm transition-all group"
                  >
                    <p className="text-sm font-medium text-fg group-hover:text-brand-700 line-clamp-1">{p.title}</p>
                    <p className="text-xs text-subtle mt-0.5">
                      {p._count.courses} courses · {p._count.enrollments} learners
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {suggestedCourses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" /> Suggested for you
              </h3>
              <div className="space-y-2">
                {suggestedCourses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/courses/${c.id}`}
                    className="block bg-card border border-line rounded-xl p-3 hover:border-brand-300 hover:shadow-sm transition-all group"
                  >
                    <p className="text-sm font-medium text-fg group-hover:text-brand-700 line-clamp-1">{c.title}</p>
                    <p className="text-xs text-subtle mt-0.5">
                      {c.category ?? "General"}{c.duration ? ` · ${c.duration} min` : ""}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Empty state if truly nothing */}
      {enrollments.length === 0 && (
        <div className="text-center py-16 bg-card rounded-2xl border border-line">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
            <BookOpen size={20} />
          </div>
          <p className="text-muted font-semibold">Ready to start your first course?</p>
          <p className="text-sm text-muted mt-1">Browse the catalog to find something for your role.</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 mt-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-md shadow-brand-600/20 transition-all hover:-translate-y-0.5"
          >
            Browse courses <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Helper components ───────────────────────────────────────────

/**
 * One tile of the three-pillar "what BHN actually is" explainer.
 * Clickable card with a brand-toned icon badge, a label / title /
 * body, and a CTA arrow that links to the relevant top-level section.
 */
function PillarCard({
  icon: Icon, label, title, body, href, ctaLabel, tone,
}: {
  icon: React.ElementType;
  label: string;
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
  tone: "brand" | "violet" | "amber";
}) {
  const toneClasses = {
    brand:  { ring: "hover:border-brand-300",  badge: "from-brand-500 to-brand-700",   text: "text-brand-700",   icon: "shadow-brand-600/30" },
    violet: { ring: "hover:border-violet-300", badge: "from-violet-500 to-violet-700", text: "text-violet-700",  icon: "shadow-violet-600/30" },
    amber:  { ring: "hover:border-amber-300",  badge: "from-amber-500 to-amber-600",   text: "text-amber-700",   icon: "shadow-amber-500/30" },
  }[tone];
  return (
    <Link
      href={href}
      className={`group bg-card rounded-2xl border border-line p-5 transition-all ${toneClasses.ring} hover:shadow-md hover:-translate-y-0.5 flex flex-col`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${toneClasses.badge} text-white flex items-center justify-center shadow-md ${toneClasses.icon} shrink-0`}>
          <Icon size={18} />
        </div>
        <span className={`text-[10px] uppercase tracking-[0.24em] font-bold ${toneClasses.text}`}>
          {label}
        </span>
      </div>
      <h3 className="text-lg font-bold text-fg tracking-tight">{title}</h3>
      <p className="text-sm text-muted mt-1.5 leading-relaxed flex-1">{body}</p>
      <p className={`text-xs font-semibold ${toneClasses.text} mt-3 inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 group-hover:gap-2 transition-all`}>
        {ctaLabel} <ArrowRight size={12} />
      </p>
    </Link>
  );
}

/**
 * Slim numeric tile for the "Your numbers" row. Icon + label + big
 * number. Optional href to make the whole tile a click-target —
 * used by the Credits tile so trainees can jump straight to the
 * credits page where their balance is the actionable surface.
 */
function NumberTile({
  icon: Icon, label, value, tone, href,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: "brand" | "amber" | "emerald" | "violet" | "ember";
  href?: string;
}) {
  const toneClass = {
    brand:   "text-brand-700",
    amber:   "text-amber-700",
    emerald: "text-emerald-700",
    violet:  "text-violet-700",
    ember:   "text-rose-700",
  }[tone];
  const inner = (
    <div className="bg-card border border-line rounded-2xl px-4 py-3.5 transition-colors hover:border-brand-200">
      <div className="flex items-center gap-2 text-subtle text-[10px] uppercase tracking-[0.18em] font-bold">
        <Icon size={11} className={toneClass} /> {label}
      </div>
      <p className={`text-3xl font-bold mt-1 font-mono tabular-nums leading-none ${toneClass}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}
