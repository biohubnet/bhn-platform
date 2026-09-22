import { getSession, ROLE_RANK } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { creditUtilization, CREDIT_AWARD_TOTAL } from "@/lib/credits/utilization";
import { InstructorDashboard } from "@/components/dashboards/InstructorDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { type ReviewQuestion } from "@/components/adaptive/TodaysReviewsCard";
import { CommitteeBadgeStrip } from "@/components/lms/CommitteeBadgeStrip";
import { ApplicationStrip, creditAppStatus, internshipAppStatus } from "@/components/dashboards/ApplicationStrip";
import { ApplicationStripPreview } from "@/components/dashboards/ApplicationStripPreview";
import { EngageColumn, ExperienceColumn, type EngageCourse } from "@/components/dashboards/TraineePillarColumns";
import { getExperienceStanding } from "@/lib/experience/where-you-stand";
import { classifyEnrollment } from "@/lib/courses/enrollment-status";
import { CREDIT_GRANT_TTL_DAYS } from "@/lib/credits/expiry";
import { getDisplayName } from "@/lib/user/display-name";
import { PreferredNameEditor } from "@/components/profile/PreferredNameEditor";
import { DashboardPromos } from "@/components/dashboards/DashboardPromos";
import { getLivePromos } from "@/lib/dashboard-promos/queries";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = (session!.user as { id?: string }).id!;
  const role = (session!.user as { role?: string }).role ?? "trainee";
  // The acting-as role decides the view (and what can be managed from
  // it); the real role only decides what an admin can still preview.
  const realRole = (session!.user as { realRole?: string }).realRole ?? role;
  const isRealAdmin = (ROLE_RANK[realRole] ?? 0) >= ROLE_RANK.admin;

  // The "What's on" band sits under every dashboard's hero. Start its
  // read now so it overlaps the greeting lookup below.
  const promosPromise = getLivePromos();

  // Fetch the user's preferredName for the greeting. Falls back to
  // `name`, then email local-part, then "Learner". See
  // src/lib/user/display-name.ts for the resolver and the rationale
  // behind not auto-splitting multi-word given names ("Yoo Jin" was
  // being chopped to "Yoo" before this).
  const meForGreeting = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, preferredName: true, email: true },
  }).catch(() => null);
  const firstName = getDisplayName(meForGreeting) || "Learner";
  const fullName = meForGreeting?.name ?? null;
  const preferredName = meForGreeting?.preferredName ?? null;

  // Per-role dashboards. Each fetches its own data; we do a tiny User
  // lookup here just to grab name + role-specific fields.
  //
  // Employers don't render a /dashboard surface anymore — their
  // canonical home is the brand-stage Overview at /employer (wavy
  // aurora cover banner + identity row + action queue + hiring
  // shopfront). The Dashboard sidebar entry is also hidden for
  // employers (see Sidebar.tsx). Hitting /dashboard directly (e.g.
  // from the post-login push or an old bookmark) routes here.
  if (role === "employer") {
    redirect("/employer");
  }
  if (role === "admin" || role === "superadmin") {
    const promos = await promosPromise;
    return (
      <AdminDashboard
        user={{ id: userId, name: session!.user?.name ?? null }}
        role={role}
        committeeBadge={
          <>
            <DashboardPromos groups={promos} canManage />
            {/* Tap ⌥ Option to preview a new trainee's application cards. */}
            <ApplicationStripPreview ttlDays={CREDIT_GRANT_TTL_DAYS} />
            <CommitteeBadgeStrip userId={userId} />
          </>
        }
      />
    );
  }
  if (role === "instructor") {
    const promos = await promosPromise;
    return (
      <InstructorDashboard
        user={{ id: userId, name: session!.user?.name ?? null }}
        committeeBadge={
          <>
            <DashboardPromos groups={promos} canManage={false} />
            <CommitteeBadgeStrip userId={userId} />
          </>
        }
      />
    );
  }

  // The first-login "split a cell" mini-game is hidden from trainees.
  // Upstream redirects trainees / evaluating users to
  // /welcome/split-a-cell on their first dashboard visit; the page
  // still exists and admins can replay it at ?replay=1, but nobody is
  // sent there automatically. User.hasSplitCell is left in place so
  // restoring the guard needs no migration.

  // Minimal data for the stripped trainee home. We only need:
  //   • the one active enrollment (most-recent in-progress course)
  //   • recent activity (3-row list)
  //   • user credits (for the explore-links footer)
  //   • pathway-enrolment count (for the line under the next card)
  //   • one suggested course (fallback when no in-progress course)
  // Only the active enrollment survives (the hero's In progress stat
  // reads it). Upstream also pulled
  // recent activity, user credits, pathway enrolments and a suggested
  // course for cards the trainee view no longer renders.
  // ONE wave. This page was deliberately stripped back for latency, and
  // the three new bands below (mini tracker, open pathways, upcoming
  // events) would undo that if they each added their own await. Every
  // read the trainee home needs happens here, concurrently.
  const now = new Date();
  const [
    enrollments,
    certsCount,
    completedCourseCount,
    util,
    openPathways,
    myPathwayIds,
    scormSessions,
    latestCreditApp,
    latestInternshipApp,
    experience,
    promos,
  ] = await Promise.all([
    // Every active course — trainees hold at most a few — so the ENGAGE
    // column can offer Resume / Start and the hero can count them.
    prisma.enrollment.findMany({
      where: { userId, status: "active" },
      orderBy: { enrolledAt: "desc" },
      select: {
        courseId: true, status: true, progress: true,
        course: { select: { title: true, scormPackage: { select: { id: true } }, _count: { select: { modules: true } } } },
      },
    }),
    prisma.certificate.count({ where: { userId, revokedAt: null } }),
    prisma.enrollment.count({ where: { userId, status: "completed" } }),
    creditUtilization(userId),
    // Take more than we show so pathways the trainee has already joined
    // can be filtered out without a second round trip.
    prisma.pathway.findMany({
      where: { status: "published", enrollmentStatus: "open" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, title: true, description: true, accentColor: true,
        _count: { select: { courses: true } },
      },
    }),
    prisma.pathwayEnrollment.findMany({
      where: { userId },
      select: { pathwayId: true },
    }),
    // SCORM courses never write Enrollment.progress, so a SCORM session
    // is what says the trainee has started one.
    prisma.scormSession.findMany({ where: { userId }, distinct: ["packageId"], select: { packageId: true } }),
    // Latest application to each programme, for the cards under the hero.
    prisma.creditApplication.findFirst({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      select: { status: true, submittedAt: true, reviewedAt: true, reviewerNote: true },
    }),
    prisma.eventFormSubmission.findFirst({
      where: { userId, form: { slug: "talent-application" } },
      orderBy: { createdAt: "desc" },
      select: { reviewStatus: true, createdAt: true, reviewedAt: true, reviewerNote: true, eligibilityApprovedAt: true, leftPoolAt: true },
    }),
    getExperienceStanding(userId, now),
    promosPromise,
  ]);

  const scormStarted = new Set(scormSessions.map((s) => s.packageId));
  const courses: EngageCourse[] = enrollments
    .map((e) => {
      const pkg = e.course.scormPackage?.id;
      const started = classifyEnrollment(e.status, e.progress) === "in_progress" || (!!pkg && scormStarted.has(pkg));
      const href = pkg
        ? `/player/${e.courseId}`
        : e.course._count.modules > 0 ? `/courses/${e.courseId}/learn` : `/courses/${e.courseId}`;
      // SCORM never writes Enrollment.progress, so it has no percentage.
      return { courseId: e.courseId, title: e.course.title, progress: pkg ? null : e.progress, started, href };
    })
    // Started first (stable, so newest enrolment first within each).
    .sort((a, b) => Number(b.started) - Number(a.started));
  const inProgress = courses.filter((c) => c.started).length;

  const credit = creditAppStatus(latestCreditApp);
  const internship = internshipAppStatus(latestInternshipApp);
  const showStrip = role === "trainee" || role === "evaluating";

  const joined = new Set(myPathwayIds.map((p) => p.pathwayId));
  const promotedPathways = openPathways.filter((p) => !joined.has(p.id)).slice(0, 3);

  // (Upstream also fetched pending buddy invites, due review bookmarks
  //  and expiring saved postings here, for the REMINDERS band and the
  //  Today's-reviews card. Neither renders in the trainee view, so the
  //  three queries are gone rather than running on every load.)

  // (Upstream derived openEquipDeadlines, liveEquipApp, fundedEquipApp,
  //  inPoolApproved and hasReminders here for the OPEN OPPORTUNITIES
  //  board, the PERSONAL STATUS strip and the REMINDERS band. None of
  //  those render in the trainee view any more.)


  // An admin previewing the trainee view (acting as trainee) can still
  // tap ⌥ Option to see the new-trainee credit box — unless their own
  // state already shows it (they never applied). isRealAdmin is set at
  // the top of the page.

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
      <section className="full-bleed relative overflow-hidden -mt-8 mb-2 hero-mesh-brand">
        {/* DECORATION LAYER — every decorative element is wrapped in
            ONE absolutely-positioned container. This sidesteps the
            `.hero-mesh-brand > * { position: relative }` rule in
            globals.css (added so the cinematic mesh sits in the
            stacking context). Without this wrapper, the blobs +
            constellation grid would get forced into the layout
            flow and balloon the hero to ~1500 px tall. Only the
            wrapper itself is a direct child of .hero-mesh-brand;
            its inner absolute children sit free in its bounding
            box. Same pattern as DSPageHeader's decoration wrapper. */}
        <div
          aria-hidden
          className="inset-0 pointer-events-none overflow-hidden"
          // Inline style — load-bearing. The `.hero-mesh-brand > *`
          // rule in globals.css would otherwise force this wrapper
          // to position: relative + z-index: 1 via class specificity,
          // collapsing every child's `inset-0` to a 0 × 0 box.
          style={{ position: "absolute", inset: 0 }}
        >
          {/* ── CINEMATIC BLOB STAGE — a fresh take. Six animated
                radial-gradient blobs drift in the corners of the
                hero on a deep midnight base. The blobs are placed
                (and constrained) so none of them ever crosses the
                centre band where the title + lead + CTA sit.

                Why this fits "cinematic":
                  • Deep navy base (#0a0e1d → #181f3a) reads like a
                    night sky or a theatre stage at curtain
                  • Six saturated jewel-tone blobs — cyan, violet,
                    rose, amber, emerald, brand-blue — each
                    100–180 px Gaussian blurred and at 0.45–0.6
                    opacity so they read as colour wash, not shapes
                  • Each blob has its own `hero-blob-{a..d}` CSS
                    keyframe (60–88 s slow drift) so neighbours
                    never sync; the motion reads as atmospheric
                    breathing rather than animated banner
                  • mix-blend-screen / lighter on each blob so they
                    blend into each other like coloured light, not
                    flat overlapping shapes

                BLOB POSITIONS — every one is placed at -X / -Y
                offsets that push them PAST the corner of the hero,
                so their visible footprints clip to the corners.
                The centre band (~30–70% horizontal, ~25–75%
                vertical) stays clear — title + lead + CTA + stats
                column all read against quiet midnight. */}

          {/* Base midnight — vertical gradient + a soft top-centre
                spotlight cone for the "stage" feel */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 50% 60% at 50% 15%, rgba(255,255,255,0.06) 0%, transparent 60%), linear-gradient(180deg, #0a0e1d 0%, #131730 50%, #181f3a 100%)",
            }}
          />

          {/* TOP-LEFT — cyan, large, drifts down-right */}
          <div
            className="absolute hero-blob-a"
            style={{
              top: "-30%",
              left: "-15%",
              width: "42rem",
              height: "42rem",
              borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(56,189,248,0.55) 0%, rgba(56,189,248,0) 70%)",
              filter: "blur(60px)",
              mixBlendMode: "screen",
            }}
          />

          {/* TOP-RIGHT — magenta-rose, medium, drifts down-left */}
          <div
            className="absolute hero-blob-b"
            style={{
              top: "-25%",
              right: "-15%",
              width: "38rem",
              height: "38rem",
              borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(244,114,182,0.50) 0%, rgba(244,114,182,0) 70%)",
              filter: "blur(70px)",
              mixBlendMode: "screen",
            }}
          />

          {/* MID-RIGHT EDGE — violet, narrow, drifts up-left */}
          <div
            className="absolute hero-blob-c"
            style={{
              top: "20%",
              right: "-20%",
              width: "32rem",
              height: "32rem",
              borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(167,139,250,0.45) 0%, rgba(167,139,250,0) 70%)",
              filter: "blur(80px)",
              mixBlendMode: "screen",
            }}
          />

          {/* BOTTOM-LEFT — emerald, large, drifts up-right */}
          <div
            className="absolute hero-blob-d"
            style={{
              bottom: "-30%",
              left: "-15%",
              width: "40rem",
              height: "40rem",
              borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(74,222,128,0.50) 0%, rgba(74,222,128,0) 70%)",
              filter: "blur(70px)",
              mixBlendMode: "screen",
            }}
          />

          {/* BOTTOM-RIGHT — warm amber-gold accent, medium */}
          <div
            className="absolute hero-blob-a"
            style={{
              bottom: "-25%",
              right: "-10%",
              width: "32rem",
              height: "32rem",
              borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(251,191,36,0) 70%)",
              filter: "blur(80px)",
              mixBlendMode: "screen",
              animationDelay: "-18s",
            }}
          />

          {/* MID-LEFT EDGE — brand cyan, slim, drifts up-right.
              Sits in the LEFT periphery so it stays clear of the
              title block (which is left-aligned from the content's
              padding, not the section's left edge). */}
          <div
            className="absolute hero-blob-b"
            style={{
              top: "30%",
              left: "-22%",
              width: "30rem",
              height: "30rem",
              borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(29,78,216,0.40) 0%, rgba(29,78,216,0) 70%)",
              filter: "blur(90px)",
              mixBlendMode: "screen",
              animationDelay: "-30s",
            }}
          />

          {/* SVG noise grain — print-feel texture, very subtle */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.08] mix-blend-overlay">
            <filter id="dashboard-hero-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="5" />
              <feColorMatrix type="matrix" values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.5 0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#dashboard-hero-noise)" />
          </svg>

          {/* Edge vignette — slight 22% darkening at corners for
              the theatrical frame */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 110% 130% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.22) 100%)",
            }}
          />
        </div>

        {/* CONTENT — direct child of .hero-mesh-brand, which forces
            position:relative (intentional here — content sits in
            the natural flow). Uses the same `max-w-screen-2xl mx-auto
            px-6` container as the rest of the dashboard so text +
            actions line up with the body sections below, while the
            background spans full viewport edge-to-edge. */}
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-10 lg:px-14 pt-8 sm:pt-10 lg:pt-12 pb-9 sm:pb-12 lg:pb-14">
          {/* Top rail — DASHBOARD masthead + hairline runner.
              White text on midnight base. */}
          <div className="flex items-center gap-4 mb-6 sm:mb-8">
            <span className="text-[10px] uppercase tracking-[0.32em] font-bold text-white/60 font-mono whitespace-nowrap">
              Dashboard · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </span>
            <span aria-hidden className="flex-1 h-px bg-gradient-to-r from-white/30 via-white/12 to-transparent" />
          </div>

          {/* Title block — italic-serif welcome + first name (sized
              one step down from the previous build for the trimmed
              banner height). White text + soft tonal gradient on
              the name so it pops against the midnight stage. */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-serif italic text-white/65 leading-none">
                Welcome back,
              </p>
              <h1
                className="mt-2 font-serif italic text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight inline-flex items-baseline gap-1 flex-wrap"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.85) 50%, #bae6fd 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  // Solid fallback for browsers that miss the gradient.
                  color: "#ffffff",
                }}
              >
                <span>{firstName}.</span>
                {/* Pencil-only edit affordance — the popover panels
                    cancel the text gradient with their own backgrounds,
                    so the button reads clearly against the midnight
                    hero. The white opacity here keeps the icon legible
                    on the gradient. */}
                <span style={{ WebkitTextFillColor: "rgba(255,255,255,0.6)" }} className="not-italic">
                  <PreferredNameEditor
                    mode="pencil"
                    fullName={fullName}
                    initial={preferredName}
                  />
                </span>
              </h1>

            </div>

            {/* Right-column stats stack — only on lg+. White mono
                numbers + small uppercase labels against the midnight
                base. */}
            <aside className="hidden lg:block self-stretch pl-8 border-l border-white/15">
              <div className="space-y-4">
                <HeroStat label="In progress" value={inProgress.toLocaleString()} />
                {/* No credits figure in the hero — it lives in the mini
                    courses panel below, where it sits next to the used
                    /awarded bar that gives it meaning. A bare balance in a
                    stat column was the thing that read as unexplained. */}
                <HeroStat label="Certificates" value={certsCount.toLocaleString()} />
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* What's on — events, workshops, announcements. First thing under
          the hero; nothing goes above the hero. */}
      {promos.length > 0 && (
        <div className="max-w-screen-2xl mx-auto px-6 mt-6">
          <DashboardPromos groups={promos} canManage={false} />
        </div>
      )}

      {/* The two programme applications, side by side: ENGAGE training
          credits and the EXPERIENCE Industry Internship. Each card shows
          its own status; the strip is gone once both are approved. */}
      {showStrip && !(credit.state === "approved" && internship.state === "approved") && (
        <div className="max-w-screen-2xl mx-auto px-6 mt-6">
          <ApplicationStrip credit={credit} internship={internship} ttlDays={CREDIT_GRANT_TTL_DAYS} />
        </div>
      )}
      {/* An admin viewing as a trainee can tap ⌥ Option for the fresh
          cards — unless the real strip is already showing them. */}
      {isRealAdmin && !(showStrip && credit.state === "none" && internship.state === "none") && (
        <ApplicationStripPreview ttlDays={CREDIT_GRANT_TTL_DAYS} className="max-w-screen-2xl mx-auto px-6 mt-6" />
      )}

      {/* First-time prompt — only for users who haven't picked a
          preferredName yet. It asks in a DIALOG rather than as a card
          in the flow: it is a question, and a question parked between
          two other sections competes with them and gets scrolled past.
          Dismissible, and the skip is remembered per user. The pencil
          next to the welcome above stays available for later edits. */}
      <PreferredNameEditor
        mode="modal"
        fullName={fullName}
        initial={preferredName}
        dismissKey={userId}
      />

      {/* Committee badge — recognition surface. Auto-hides for
          non-members. Wrapped in the standard dashboard width +
          padding container so the "Also member of" pill has its
          own visual space and doesn't crowd the credit-application
          callout above it. The mt-4
          gives a clear breath between the callout's bottom border
          and the first committee badge / chip row. */}
      <div className="max-w-screen-2xl mx-auto px-6 mt-4">
        <CommitteeBadgeStrip userId={userId} />
      </div>

      {/* ── ENGAGE | EXPERIENCE ─────────────────────────────────────
            One column per pillar on lg+, ENGAGE first when they stack.
            Events live in the What's on band above, so there is no
            events rail any more. */}
      <div className="max-w-screen-2xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <EngageColumn
            balance={util.balance}
            used={util.used}
            awardTotal={CREDIT_AWARD_TOTAL}
            inProgress={inProgress}
            completed={completedCourseCount}
            certificates={certsCount}
            courses={courses.slice(0, 3)}
            pathways={promotedPathways.map((pw) => ({
              id: pw.id, title: pw.title, description: pw.description,
              accentColor: pw.accentColor, courseCount: pw._count.courses,
            }))}
          />
          <ExperienceColumn
            profileViews={experience.profileViews}
            windowDays={experience.windowDays}
            interviewsDone={experience.interviewsDone}
            postings={experience.postings}
          />
        </div>
      </div>

      {/* Everything below the team note was removed for the trainee
          view: the four-pillar OPEN OPPORTUNITIES board, the
          PERSONAL STATUS strip, FOR YOU, REMINDERS, the Loot Vault
          and the ExploreLinks footer row.

          Only trainees reach this JSX — employers redirect to
          /employer, admins and instructors render their own
          dashboards — so these are deleted outright rather than
          gated on a role. Most of them pointed into ENGAGE
          (courses, pathways, certificates, credits, rewards),
          which trainees can no longer navigate to anyway, so they
          were advertising territory the sidebar had already
          closed off. The components themselves are untouched and
          still used elsewhere. */}
    </div>
  );
}

/** HeroStat — right-column stat tile inside the trainee dashboard
 *  hero. Big mono number on top, tiny uppercase tracked label
 *  underneath. White-on-midnight — sits in the cinematic blob
 *  stage. Size trimmed for the shorter banner. */
function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl xl:text-3xl font-black font-mono tabular-nums leading-none text-white drop-shadow-text-dim">
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.28em] font-bold text-white/65">
        {label}
      </p>
    </div>
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



// Static per-tone class strings for item-title hover + view-all
// link colour. Kept STATIC (not interpolated) so Tailwind's JIT
// picks them up at build time. Every dark theme already overrides
// the 700/900 step in globals.css, so these read on every theme.


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

