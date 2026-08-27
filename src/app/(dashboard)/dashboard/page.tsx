import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Compass, CalendarDays, Route, Activity } from "lucide-react";
import { creditUtilization, CREDIT_AWARD_TOTAL } from "@/lib/credits/utilization";
import { InstructorDashboard } from "@/components/dashboards/InstructorDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { type ReviewQuestion } from "@/components/adaptive/TodaysReviewsCard";
import { CommitteeBadgeStrip } from "@/components/lms/CommitteeBadgeStrip";
import { LogoMark } from "@/components/ui/Logo";
import { getDisplayName } from "@/lib/user/display-name";
import { PreferredNameEditor } from "@/components/profile/PreferredNameEditor";

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
  // Only the active enrollment survives — the hero's "N courses in
  // flight" line is the last thing that reads it. Upstream also pulled
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
    upcomingEvents,
  ] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId, status: "active" },
      include: { course: { select: { id: true, title: true, category: true } } },
      orderBy: { enrolledAt: "desc" },
      take: 1,
    }) as Promise<EnrollmentWithCourse[]>,
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
    prisma.bhnEvent.findMany({
      where: { status: "published", endDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 3,
      select: { id: true, slug: true, title: true, tagline: true, startDate: true, endDate: true },
    }),
  ]);

  const inProgress = enrollments.length;

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

              {/* Mid-rule + lead sentence — tightened spacing */}
              <div className="mt-5 max-w-xl">
                <span aria-hidden className="block h-px w-12 bg-white/30 mb-3" />
                <p className="text-sm sm:text-base text-white/85 leading-relaxed">
                  {heroLead}
                </p>
              </div>

              {/* Actions — white primary + frosted ghost. */}
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={inProgress > 0 ? "/progress" : "/courses"}
                  // `text-[#0f172a]` is a literal hex (Tailwind arbitrary
                  // value), NOT `text-slate-900`. Voltage theme globally
                  // overrides `.text-slate-900` to lift it to slate-100 so
                  // unscoped slate-900 text stays readable against the
                  // dark page bg — but the override silently breaks any
                  // white pill that wanted slate-900 to MEAN slate-900
                  // (Continue button = white background + dark text →
                  // override turned the text near-white = invisible).
                  // Arbitrary-value Tailwind classes don't match
                  // `.text-slate-900` so they survive the override.
                  className="inline-flex items-center gap-1.5 bg-white text-[#0f172a] hover:bg-white/90 font-bold text-xs px-4 py-2.5 rounded-full shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
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

            {/* Right-column stats stack — only on lg+. White mono
                numbers + small uppercase labels against the midnight
                base. */}
            <aside className="hidden lg:block self-stretch pl-8 border-l border-white/15">
              <div className="space-y-4">
                <HeroStat label="In progress" value={inProgress.toLocaleString()} />
                {/* No credits figure in the hero — it lives in the mini
                    Progress Tracker below, where it sits next to the used
                    /awarded bar that gives it meaning. A bare balance in a
                    stat column was the thing that read as unexplained. */}
                <HeroStat label="Certificates" value={certsCount.toLocaleString()} />
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── ENGAGE training credits — prominent dashboard callout ──
          Sits directly under the hero so a trainee who's never
          applied for the 5,000-credit grant can't miss it. The
          callout's render state is internal: a big brand CTA when
          they've never applied; an amber "under review" chip while
          pending; a rose re-apply prompt if rejected; and entirely
          HIDDEN once they've been approved (since the credits are
          already in their balance — no point repeating the pitch).
          Also renders for users in the `evaluating` role, who can
          apply but aren't full trainees yet. */}
      {/* The training-credit application is hidden from trainees.
          Upstream renders CreditApplicationCallout here for trainee /
          evaluating roles only — a prominent "apply for up to N
          credits" CTA linking to /credits/apply. Since its audience
          was exactly the roles now being restricted, hiding it means
          removing the block outright rather than gating it further.
          The /credits/apply page and the admin review queue are
          untouched; only this entry point is gone. */}

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

      {/* ── A NOTE FROM THE TEAM ────────────────────────────────────
            Hand-set editorial blurb from the BHN founders to the
            trainee, sitting just under the hero. Italic serif body
            on a faint brand-tone wash, signed off with the four-
            petal LogoMark + uppercase team attribution. Standard
            section padding so it pairs with the rest of the page;
            `max-w-2xl mr-auto` caps the line length for comfortable
            reading WHILE anchoring the whole block to the left edge
            of the section. */}
      <section
        className="border-t border-line py-5 sm:py-7 px-5 sm:px-8 relative overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(56,189,248,0.045) 0%, rgba(99,102,241,0.03) 55%, rgba(244,114,182,0.045) 100%)",
        }}
      >
        {/* Left-aligned treatment — eyebrow + body + signature
            stack on the left edge of the section. `mr-auto` (NOT
            `mx-auto`) pushes the 2xl column against the left edge
            so the block ITSELF is left-aligned on the page; the
            max-w-5xl cap still keeps the measure readable — widened
            from 2xl on request, now that this note is the only thing
            below the hero. */}
        <div className="relative max-w-5xl mr-auto">
          <SectionEyebrow tone="brand">A note from the team</SectionEyebrow>
          <p className="mt-3 font-serif italic text-base sm:text-lg text-fg leading-relaxed">
            Welcome, <span className="not-italic font-bold">{firstName}</span>. We hope
            BHN does what we built it for — keeps the next move within reach. We hope a
            course re-frames something you thought you knew, a placement that opens a
            door, a funding round that gets your idea moving, and a few people whose
            company you&apos;d keep beyond the platform.{" "}
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

      {/* Committee badge — recognition surface. Auto-hides for
          non-members. Wrapped in the standard dashboard width +
          padding container so the "Also member of" pill has its
          own visual space and doesn't crowd the credit-application
          callout above it or the editorial blurb below. The mt-4
          gives a clear breath between the callout's bottom border
          and the first committee badge / chip row. */}
      <div className="max-w-screen-2xl mx-auto px-6 mt-4">
        <CommitteeBadgeStrip userId={userId} />
      </div>

      {/* ── WHERE YOU STAND + WHAT'S OPEN ───────────────────────────
            Three things the trainee home was missing: a compact read
            of the Progress Tracker, the pathways currently accepting
            people, and what's coming up.

            Two columns on lg+, events in the right rail as asked.
            Below lg they stack, events last — on a phone the thing you
            came for is your own progress, not a date three weeks out. */}
      <div className="max-w-screen-2xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            {/* ── Mini Progress Tracker ─────────────────────────── */}
            <section className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <p className="text-[12px] uppercase tracking-[0.2em] font-bold text-subtle">
                  Where you stand
                </p>
                <Link
                  href="/progress"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline shrink-0"
                >
                  Progress Tracker <ArrowRight size={12} />
                </Link>
              </div>

              <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-subtle">
                    Credits remaining
                  </p>
                  <p className="mt-0.5 text-3xl font-bold tabular-nums text-fg leading-none">
                    {util.balance.toLocaleString()}
                  </p>
                </div>
                <MiniStat label="In progress" value={inProgress} />
                <MiniStat label="Completed" value={completedCourseCount} />
                <MiniStat label="Certificates" value={certsCount} />
              </div>

              {/* Same scaleX bar language as the Progress Tracker, without
                  its animation — this is a glance, not the main event. */}
              <div className="mt-4">
                <div className="h-1.5 w-full rounded-full bg-raised overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{
                      width: `${CREDIT_AWARD_TOTAL > 0
                        ? Math.min(100, Math.max(0, (util.used / CREDIT_AWARD_TOTAL) * 100))
                        : 0}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold tabular-nums text-subtle">
                  <span>{util.used.toLocaleString()} used</span>
                  <span>{CREDIT_AWARD_TOTAL.toLocaleString()} awarded</span>
                </div>
              </div>
            </section>

            {/* ── Open learning pathways ────────────────────────── */}
            {promotedPathways.length > 0 && (
              <section className="rounded-2xl border border-line bg-card p-5">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <p className="text-[12px] uppercase tracking-[0.2em] font-bold text-subtle">
                    Open for enrolment
                  </p>
                  <Link
                    href="/pathways"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline shrink-0"
                  >
                    All pathways <ArrowRight size={12} />
                  </Link>
                </div>
                <ul className="space-y-2">
                  {promotedPathways.map((pw) => (
                    <li key={pw.id}>
                      <Link
                        href="/pathways"
                        className="flex items-start gap-3 rounded-xl border border-line p-3 hover:border-brand-200 transition-colors"
                      >
                        {/* The pathway's own colour code, as on /pathways.
                            Inline style because it is data, not a token. */}
                        <span
                          aria-hidden
                          className="mt-1 w-1 h-8 rounded-full shrink-0"
                          style={{ background: pw.accentColor ?? "var(--brand-600)" }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <Route size={13} className="text-subtle shrink-0" />
                            <span className="text-sm font-semibold text-fg truncate">{pw.title}</span>
                          </span>
                          {pw.description && (
                            <span className="mt-0.5 block text-xs text-muted line-clamp-2">
                              {pw.description}
                            </span>
                          )}
                          <span className="mt-1 block text-[11px] text-subtle tabular-nums">
                            {pw._count.courses} {pw._count.courses === 1 ? "course" : "courses"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ── Upcoming events — the right rail ──────────────────── */}
          <aside className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-[12px] uppercase tracking-[0.2em] font-bold text-subtle">
                Coming up
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline shrink-0"
              >
                All <ArrowRight size={12} />
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing scheduled right now. Events appear here as they are announced.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingEvents.map((ev) => (
                  <li key={ev.id}>
                    <Link
                      href={`/events/${ev.slug}`}
                      className="block rounded-xl border border-line p-3 hover:border-brand-200 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                        <CalendarDays size={12} />
                        {formatEventDates(ev.startDate, ev.endDate)}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-fg leading-snug">
                        {ev.title}
                      </span>
                      {ev.tagline && (
                        <span className="mt-0.5 block text-xs text-muted line-clamp-2">
                          {ev.tagline}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
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
  // The tone used to pick a gradient for a hairline dash rendered
  // before the label. The dash is gone — at eyebrow size it read as a
  // stray mark rather than an accent. The tone now colours the LABEL
  // itself, so the four-pillar board keeps its per-pillar identity
  // with one less piece of chrome. Classes are static strings so
  // Tailwind's scanner picks them up.
  const toneClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "emerald"
        ? "text-emerald-700"
        : tone === "sky"
          ? "text-sky-700"
          : tone === "violet"
            ? "text-violet-700"
            : "text-brand-700";
  return (
    <p className={`text-[12px] uppercase tracking-[0.2em] font-bold ${toneClass}`}>
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





// ─── Minimal helpers ─────────────────────────────────────────────

/** One small labelled figure in the mini Progress Tracker. */
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-subtle">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-fg leading-none">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

/** "Nov 4" for a single day, "Nov 4 – 6" within a month, "Nov 28 – Dec 2"
 *  across one. Formatted on the server in the platform's timezone so the
 *  string cannot shift between render and hydration. */
function formatEventDates(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short", day: "numeric", timeZone: "America/Toronto",
  };
  const f = new Intl.DateTimeFormat("en-CA", opts);
  const a = f.format(start);
  const b = f.format(end);
  if (a === b) return a;
  const sameMonth = a.split(" ")[0] === b.split(" ")[0];
  return sameMonth ? `${a} – ${b.split(" ")[1]}` : `${a} – ${b}`;
}
