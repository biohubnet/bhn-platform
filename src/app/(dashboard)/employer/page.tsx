/**
 * /employer — flagship employer home.
 *
 * The home page used to be the linear HR workspace (HrWorkspace
 * component) — postings + applicant queue + inline expand. That was
 * functional but didn't lead with the employer's own brand identity.
 *
 * This page now opens with the cinematic profile layout that used to
 * live at /employer/profile, then surfaces the action queue + hiring
 * shopfront inline beneath it. The old /employer/profile route is
 * preserved as a redirect alias.
 *
 * Section flow, top → bottom (continuous gradient-washed canvas,
 * sections separated by hairlines + eyebrows):
 *
 *   COVER BANNER — full-bleed cinematic gradient with 5 auroras and
 *      noise texture. The visual stage.
 *
 *   IDENTITY ROW — logo + company name + chips + trust signals,
 *      floating directly on a brand-tinted wash bleeding out of the
 *      cover. Pencil button top-right opens the edit modal (URL
 *      auto-fill first, manual fields behind a disclosure).
 *
 *   ABOUT QUOTE — pull-quote rendered with a three-colour gradient
 *      rule on the left, only shown when a description is set.
 *
 *   STAT TRIPLET — three numbers (postings live, applicants
 *      reviewed, interviews held) divided by vertical hairlines.
 *
 *   ACTION QUEUE — items needing the employer's attention right
 *      now (new triage, stale, awaiting offer response). Pulled
 *      forward from the old HrWorkspace home so this critical signal
 *      doesn't get buried.
 *
 *   HIRING SHOPFRONT — live postings as hairline-divided list rows,
 *      with a link to the per-posting management page.
 *
 * The full single-page workspace (inline applicant expand, drag-drop
 * pipeline, etc.) still lives at /employer/postings/[id] for deep
 * work; this home page is the "brand stage" entry point.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Globe, MapPin, Users, Calendar, Briefcase, Sparkles,
  ShieldCheck, Clock, ArrowRight, Inbox, AlertTriangle, Hourglass,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ELIGIBLE_APPLICANT_FILTER } from "@/lib/talent-pool/eligibility";
import { DesignSystemProvider } from "@/components/ui/DesignSystemProvider";
import { EditProfileTrigger } from "@/components/employer/EditProfileTrigger";
import { SetPasswordBanner } from "@/components/employer/SetPasswordBanner";
import { normalizeLogoShape, logoShapeClasses } from "@/lib/employer/logo-shape";
import {
  parseLogoTransform,
  isIdentityTransform,
  logoTransformCss,
  type LogoTransform,
} from "@/lib/employer/logo-transform";
import { upgradeLogoForDisplay } from "@/lib/employer/logo-discovery";

export const dynamic = "force-dynamic";

const ACTIVE_STAGES = [
  "new", "reviewing", "shortlisted", "phone_screen", "onsite", "offer",
] as const;

type QueueKind = "new" | "stale" | "offer-waiting";

export default async function EmployerHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "trainee";
  const userId = (session.user as { id?: string }).id ?? null;
  const isAdmin = role === "admin" || role === "superadmin";
  if (role !== "employer" && !isAdmin) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          password: true,
          employerCompany: true,
          companyWebsite: true,
          companyLogo: true,
          companyLogoShape: true,
          companyLogoTransform: true,
          companyBrand: true,
          companyIndustry: true,
          companySize: true,
          companyLocation: true,
          companyDescription: true,
          companyFounded: true,
          companyMainBusiness: true,
          companyTicker: true,
        },
      }).catch(() => null)
    : null;

  // Filter shape for InternshipPosting. Admins see the full platform;
  // employers see only their own postings. Each downstream query
  // either uses this directly or wraps it as a nested `posting`
  // relation filter — we conditionally OMIT the `posting:` key when
  // the filter is empty (admin) to keep Prisma from interpreting
  // `posting: {}` as a relation filter (which can be ambiguous).
  const postingsWhere = isAdmin ? undefined : { createdById: userId ?? "_" };
  const nestedPostingWhere = postingsWhere ? { posting: postingsWhere } : {};

  const since7d = new Date(Date.now() - 7 * 86_400_000);
  const since2d = new Date(Date.now() - 2 * 86_400_000);

  // Every query has a per-call `.catch(() => safe_default)` so a
  // single DB hiccup or schema drift on one query never takes down
  // the whole hero. Worst case the relevant section reads as zero /
  // empty — the page still renders.
  const [
    postingsLive,
    applicantsCount,
    interviewsCount,
    hiredCount,
    livePostingsPreview,
    firstPosting,
    queueRows,
  ] = await Promise.all([
    prisma.internshipPosting.count({ where: { ...(postingsWhere ?? {}), status: "active" } }).catch(() => 0),
    prisma.applicationStatus.count({ where: nestedPostingWhere }).catch(() => 0),
    prisma.interview.count({ where: nestedPostingWhere }).catch(() => 0),
    prisma.applicationStatus.count({
      where: { ...nestedPostingWhere, status: "hired" },
    }).catch(() => 0),
    prisma.internshipPosting.findMany({
      where: { ...(postingsWhere ?? {}), status: "active" },
      select: {
        id: true,
        title: true,
        location: true,
        type: true,
        compensation: true,
        deadline: true,
        keySkills: true,
        _count: { select: { applicationStatuses: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => [] as Array<{
      id: string; title: string; location: string | null; type: string | null;
      compensation: string | null; deadline: Date | null; keySkills: string[];
      _count: { applicationStatuses: number };
    }>),
    prisma.internshipPosting.findFirst({
      where: postingsWhere ?? {},
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }).catch(() => null),
    prisma.applicationStatus.findMany({
      where: {
        // Eligibility gate — only show applicants who have been
        // human-verified and are still in the pool.
        ...ELIGIBLE_APPLICANT_FILTER,
        ...nestedPostingWhere,
        OR: [
          { status: "new" },
          {
            status: { in: [...ACTIVE_STAGES] as string[] },
            stageEnteredAt: { lt: since7d },
          },
          { status: "offer", stageEnteredAt: { lt: since2d } },
        ],
      },
      select: {
        id: true,
        status: true,
        stageEnteredAt: true,
        posting: { select: { id: true, title: true } },
        applicant: { select: { id: true, name: true, email: true } },
      },
      orderBy: { stageEnteredAt: "asc" },
      take: 8,
    }).catch(() => [] as Array<{
      id: string; status: string; stageEnteredAt: Date;
      posting: { id: string; title: string };
      applicant: { id: string; name: string | null; email: string };
    }>),
  ]);

  // flatMap-with-guard so an orphan row (relation cascaded away but
  // the application_status row survived) doesn't throw on the
  // `row.posting.id` access. Prisma's generated types claim the
  // relations are non-null since the FK columns are required, but
  // legacy data sometimes disagrees. Same for stageEnteredAt —
  // the column is non-null with a default but old rows may pre-date
  // the migration that backfilled it.
  const actionQueue = queueRows.flatMap((row) => {
    if (!row.posting || !row.applicant || !row.stageEnteredAt) return [];
    const days = Math.floor((Date.now() - row.stageEnteredAt.getTime()) / 86_400_000);
    const isOffer = row.status === "offer";
    const isStale = ACTIVE_STAGES.includes(row.status as (typeof ACTIVE_STAGES)[number])
      && days >= 7 && row.status !== "new";
    const kind: QueueKind = isOffer ? "offer-waiting" : isStale ? "stale" : "new";
    return [{
      applicationStatusId: row.id,
      postingId: row.posting.id,
      postingTitle: row.posting.title,
      applicantId: row.applicant.id,
      applicantName: row.applicant.name ?? row.applicant.email,
      kind,
      daysInStage: days,
    }];
  });

  const hasName = Boolean(user?.employerCompany?.trim());
  const memberSinceYear = (firstPosting?.createdAt ?? user?.createdAt)?.getFullYear();
  const noPassword = !user?.password;

  const profileForEditor = {
    employerCompany: user?.employerCompany ?? null,
    companyWebsite: user?.companyWebsite ?? null,
    companyLogo: user?.companyLogo ?? null,
    companyLogoShape: user?.companyLogoShape ?? null,
    companyLogoTransform: user?.companyLogoTransform ?? null,
    companyBrand: user?.companyBrand ?? null,
    companyIndustry: user?.companyIndustry ?? null,
    companySize: user?.companySize ?? null,
    companyLocation: user?.companyLocation ?? null,
    companyDescription: user?.companyDescription ?? null,
    companyFounded: user?.companyFounded ?? null,
    companyMainBusiness: user?.companyMainBusiness ?? null,
    companyTicker: user?.companyTicker ?? null,
  };

  // Route-scoped Studio override. The /employer LAYOUT no longer
  // forces Studio for the whole segment; only this home page (the
  // canonical HR Overview brand stage) opts into it. Every other
  // /employer/* sub-page inherits the platform-default Cinematic
  // look from the root dashboard layout.
  return (
    <DesignSystemProvider value="studio">
    <div className="-mt-2 space-y-0">

      {/* ── PANEL ──────────────────────────────────────────────
          Single rounded outer wrapper containing the cover banner
          and the body — one continuous edge per side instead of two
          stacked rings clashing at the seam.
          Note: the SetPasswordBanner used to render ABOVE this
          panel — that broke the platform-wide "hero owns the top
          edge" rule. It now sits INSIDE the panel, just below
          CoverBanner (the hero), so the cover always sits at the
          very top of the page. */}
      <div className="rounded-3xl overflow-hidden shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]">
        <CoverBanner />

        {noPassword && (
          <div className="px-6 sm:px-10 lg:px-14 pt-4">
            <SetPasswordBanner />
          </div>
        )}

        <div
          className="relative -mt-24 sm:-mt-28"
          style={{
            background:
              "linear-gradient(180deg, rgba(59,130,246,0.07) 0%, rgba(244,114,182,0.04) 18%, rgba(255,255,255,0) 35%), linear-gradient(180deg, var(--card) 0%, var(--card) 100%)",
          }}
        >
          {/* Soft accent wash */}
          <div
            aria-hidden
            className="absolute top-10 left-1/4 w-[40rem] h-[40rem] rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(closest-side, rgba(59,130,246,0.5), rgba(59,130,246,0) 70%)",
            }}
          />

          {/* ── IDENTITY ROW ───────────────────────────────── */}
          <section
            aria-label="Company identity"
            className="relative px-6 sm:px-10 lg:px-14 pt-8 sm:pt-10 pb-10"
          >
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-6 sm:gap-10 items-start">
              <LogoDisc
                // upgradeLogoForDisplay swaps Google s2/favicons URLs
                // (128 px max, persisted by older auto-fills) for the
                // equivalent Clearbit 400 px URL at render time, so
                // existing low-res profiles render high-res without
                // forcing the operator to re-fetch.
                src={upgradeLogoForDisplay(user?.companyLogo)}
                alt={user?.employerCompany ?? ""}
                shape={normalizeLogoShape(user?.companyLogoShape)}
                transform={parseLogoTransform(user?.companyLogoTransform)}
              />

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-brand-700 mb-3">
                  Company profile
                </p>
                <h1
                  className={
                    "font-bold tracking-tight leading-[1.02] " +
                    (hasName
                      ? "text-4xl sm:text-5xl lg:text-6xl text-fg"
                      : "text-3xl sm:text-4xl text-muted italic")
                  }
                  style={
                    hasName
                      ? {
                          backgroundImage:
                            "linear-gradient(135deg, var(--fg) 0%, var(--fg) 60%, rgb(59,130,246) 100%)",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          color: "transparent",
                        }
                      : undefined
                  }
                >
                  {user?.employerCompany?.trim() || "Add your company name"}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
                  {user?.companyIndustry && (
                    <InlineMeta icon={Briefcase}>{user.companyIndustry}</InlineMeta>
                  )}
                  {user?.companyLocation && (
                    <>
                      <Dot />
                      <InlineMeta icon={MapPin}>{user.companyLocation}</InlineMeta>
                    </>
                  )}
                  {user?.companySize && (
                    <>
                      <Dot />
                      <InlineMeta icon={Users}>{user.companySize} people</InlineMeta>
                    </>
                  )}
                  {user?.companyFounded && (
                    <>
                      <Dot />
                      <InlineMeta icon={Calendar}>Since {user.companyFounded}</InlineMeta>
                    </>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                  {user?.companyWebsite && (
                    <a
                      href={normalizeUrl(user.companyWebsite)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 font-bold transition-colors"
                      style={{
                        backgroundImage:
                          "linear-gradient(90deg, rgb(29,78,216), rgb(124,58,237))",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      <Globe size={12} className="text-brand-700" />
                      Visit {hostnameFor(user.companyWebsite)}
                      <ArrowRight size={11} className="text-brand-700" />
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <ShieldCheck size={12} /> Verified employer
                  </span>
                  {memberSinceYear && (
                    <span className="inline-flex items-center gap-1.5 text-subtle">
                      <Clock size={11} /> On BHN since {memberSinceYear}
                    </span>
                  )}
                  {hiredCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1.5 font-semibold"
                      style={{
                        backgroundImage:
                          "linear-gradient(90deg, rgb(244,114,182), rgb(124,58,237))",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      <Sparkles size={11} className="text-fuchsia-500" /> {hiredCount} BHN talent hired
                    </span>
                  )}
                </div>

                {/* Empty-state CTA — if hardly anything is filled in,
                    surface the auto-fill button right here so day-one
                    employers don't have to hunt for the pencil. */}
                {!hasName && (
                  <div className="mt-5">
                    <EditProfileTrigger initial={profileForEditor} variant="button" />
                  </div>
                )}
              </div>

              {/* Right column: edit pencil + live status. The pencil
                  is the new primary entry point to the edit modal. */}
              <div className="flex flex-row sm:flex-col items-start gap-2 shrink-0">
                <EditProfileTrigger initial={profileForEditor} variant="icon" />
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          </section>

          {/* ── ABOUT QUOTE + business/ticker aside ─────────────
              Two-column on md+. The pull-quote sits in the left
              column with the brand-gradient rule on its left; main
              business + stock ticker live in the right column as a
              quiet metadata block. On small screens the columns
              stack — quote first, metadata below.
              The giant opening-quote glyph used to be absolutely
              positioned ABOVE the first word; it overlapped the
              prose at smaller sizes. It's now anchored to the
              far-right margin of the quote column so it acts as a
              decorative gutter mark and never collides with text. */}
          {(user?.companyDescription?.trim() ||
            user?.companyMainBusiness?.trim() ||
            user?.companyTicker?.trim()) && (
            <section
              aria-label="About"
              className="relative px-6 sm:px-10 lg:px-14 py-10 sm:py-12 border-t border-line"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(59,130,246,0.04) 0%, rgba(244,114,182,0.04) 100%)",
              }}
            >
              <SectionEyebrow>About {user?.employerCompany?.trim() || "us"}</SectionEyebrow>
              <div
                className={
                  "grid grid-cols-1 gap-8 lg:gap-12 items-start " +
                  ((user?.companyMainBusiness?.trim() || user?.companyTicker?.trim())
                    ? "md:grid-cols-[1fr_minmax(220px,320px)]"
                    : "")
                }
              >
                {/* Left column — pull-quote */}
                {user?.companyDescription?.trim() && (
                  <div className="relative pl-8 sm:pl-12 pr-12 sm:pr-16">
                    <div
                      aria-hidden
                      className="absolute left-0 top-1 bottom-1 w-1 rounded-full"
                      style={{
                        background:
                          "linear-gradient(180deg, rgb(56,189,248), rgb(124,58,237), rgb(244,114,182))",
                      }}
                    />
                    {/* Decorative “ — anchored to the right gutter
                        of the quote column so the glyph reads as a
                        margin mark rather than competing with the
                        first word of the prose. */}
                    <span
                      aria-hidden
                      className="absolute -top-6 right-0 text-[6rem] sm:text-[8rem] leading-none font-serif text-brand-100/70 pointer-events-none select-none"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      &rdquo;
                    </span>
                    <blockquote className="relative text-lg sm:text-xl lg:text-2xl text-fg leading-relaxed font-medium">
                      {user.companyDescription}
                    </blockquote>
                  </div>
                )}

                {/* Right column — main business sidecar. The "Listed
                    as" ticker block that used to live above the main-
                    business prose was removed at user request; the
                    companyTicker field is still editable in the form
                    and stored, just not surfaced on the public
                    employer profile. */}
                {user?.companyMainBusiness?.trim() && (
                  <aside aria-label="Business overview" className="space-y-5">
                    {user?.companyMainBusiness?.trim() && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                          Main business &amp; products
                        </p>
                        <p className="mt-1.5 text-sm sm:text-base text-fg leading-relaxed">
                          {user.companyMainBusiness.trim()}
                        </p>
                      </div>
                    )}
                  </aside>
                )}
              </div>
            </section>
          )}

          {/* ── STATS ────────────────────────────────────────── */}
          <section
            aria-label="Hiring at a glance"
            className="relative px-6 sm:px-10 lg:px-14 py-10 sm:py-12 border-t border-line"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(124,58,237,0.04) 50%, rgba(244,114,182,0.05) 100%)",
            }}
          >
            <SectionEyebrow>By the numbers</SectionEyebrow>
            <div className="grid grid-cols-3 divide-x divide-line">
              <InlineStat
                label={isAdmin ? "Postings live (platform)" : "Postings live"}
                value={postingsLive}
                tone="brand"
              />
              <InlineStat
                label="Applicants reviewed"
                value={applicantsCount}
                tone="violet"
              />
              <InlineStat
                label="Interviews held"
                value={interviewsCount}
                tone="rose"
              />
            </div>
          </section>

          {/* ── ACTION QUEUE ─────────────────────────────────── */}
          {actionQueue.length > 0 && (
            <section
              aria-label="Action queue"
              className="relative px-6 sm:px-10 lg:px-14 py-10 sm:py-12 border-t border-line"
            >
              <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
                <div>
                  <SectionEyebrow>Needs your attention</SectionEyebrow>
                  <h2 className="text-xl sm:text-2xl font-bold text-fg tracking-tight">
                    Action queue · {actionQueue.length}
                  </h2>
                </div>
              </div>
              <ul className="divide-y divide-line">
                {actionQueue.map((q) => (
                  <QueueRow key={q.applicationStatusId} item={q} />
                ))}
              </ul>
            </section>
          )}

          {/* ── HIRING SHOPFRONT ─────────────────────────────── */}
          {livePostingsPreview.length > 0 && (
            <section
              aria-label="Live postings"
              className="relative px-6 sm:px-10 lg:px-14 py-10 sm:py-12 border-t border-line"
            >
              <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
                <div>
                  <SectionEyebrow>Hiring shopfront</SectionEyebrow>
                  <h2 className="text-xl sm:text-2xl font-bold text-fg tracking-tight">
                    What trainees see when they find you
                  </h2>
                </div>
                <Link
                  href="/employer/postings"
                  className="text-xs font-bold inline-flex items-center gap-1"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, rgb(29,78,216), rgb(124,58,237))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Manage all postings <ArrowRight size={11} className="text-brand-700" />
                </Link>
              </div>
              <ul className="divide-y divide-line">
                {livePostingsPreview.map((p) => (
                  <PostingListRow key={p.id} posting={p} />
                ))}
              </ul>
            </section>
          )}

          {/* ── Empty postings hint ──────────────────────────── */}
          {livePostingsPreview.length === 0 && (
            <section className="relative px-6 sm:px-10 lg:px-14 py-10 sm:py-12 border-t border-line">
              <SectionEyebrow>Hiring shopfront</SectionEyebrow>
              <p className="text-sm text-muted max-w-xl leading-snug">
                No live postings yet. Once you publish your first one, this section will show what trainees see when they find your company.
              </p>
              <Link
                href="/employer/postings"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800"
              >
                Create your first posting <ArrowRight size={11} />
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
    </DesignSystemProvider>
  );
}

// ─── Section sub-components ──────────────────────────────────────

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-subtle mb-4 inline-flex items-center gap-2">
      <span
        aria-hidden
        className="w-6 h-px"
        style={{
          background: "linear-gradient(90deg, rgb(56,189,248), rgb(124,58,237))",
        }}
      />
      {children}
    </p>
  );
}

function CoverBanner() {
  // Per-company brand-colour theming temporarily removed; cover
  // banner is the platform-default 5-stop purple-pink stage with
  // four auroras at full strength.
  return (
    <div className="relative h-56 sm:h-72 lg:h-[22rem] overflow-hidden">
      {/* Base layer — platform-default 5-stop gradient. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0b0f24 0%, #142046 25%, #312e81 50%, #6b21a8 75%, #831843 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -top-40 -left-32 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-70"
        style={{
          background:
            "radial-gradient(closest-side, rgba(56,189,248,0.7), rgba(56,189,248,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 right-1/3 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, rgba(244,114,182,0.7), rgba(244,114,182,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-0 right-0 w-[24rem] h-[24rem] rounded-full blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, rgba(250,204,21,0.5), rgba(250,204,21,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-1/3 w-[22rem] h-[22rem] rounded-full blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, rgba(74,222,128,0.5), rgba(74,222,128,0) 70%)",
        }}
      />
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full opacity-[0.22] mix-blend-overlay pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="cover-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0.4 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#cover-noise)" />
      </svg>
      <div
        aria-hidden
        className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-transparent to-black/40"
      />
      <div className="absolute top-5 left-6 sm:left-10 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-bold text-white/70">
        <span
          aria-hidden
          className="w-6 h-px"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.7))",
          }}
        />
        Brand stage
      </div>
    </div>
  );
}

function LogoDisc({
  src, alt, shape, transform,
}: {
  src?: string | null;
  alt: string;
  /** Mask shape resolved by `normalizeLogoShape` — "natural"
   *  | "circle" | "rounded" | "square". Drives the wrapper's
   *  corner radius and whether the inner image is contained or
   *  cropped. The conic glow ring stays circular regardless of
   *  the inner mask so the disc always reads as the "centre of
   *  gravity" of the identity row. */
  shape: "natural" | "circle" | "rounded" | "square";
  /** Pan / zoom applied INSIDE the mask. Mirrors what the
   *  operator dialed in via the cropper in the Edit Profile
   *  modal. Identity-default transform short-circuits to no style. */
  transform: LogoTransform;
}) {
  const { containerMask, imageFit } = logoShapeClasses(shape);
  const xformStyle = isIdentityTransform(transform)
    ? undefined
    : { transform: logoTransformCss(transform), transformOrigin: "center center" as const };
  // NO event handlers here — this is a server-component-rendered
  // chunk and onError={() => ...} on the <img> throws at render
  // ("Event handlers cannot be passed to Client Component props").
  // Broken-image fallback is handled by the briefcase glyph
  // layered absolutely under the img: when the browser can't load
  // the src, the img leaves a transparent gap and the glyph shows
  // through.
  return (
    <div className="relative shrink-0">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(56,189,248,0.5), rgba(244,114,182,0.5), rgba(250,204,21,0.4), rgba(74,222,128,0.4), rgba(56,189,248,0.5))",
        }}
      />
      <div
        className={
          "relative w-32 h-32 sm:w-40 sm:h-40 bg-white ring-4 ring-white shadow-[0_18px_40px_-10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] flex items-center justify-center overflow-hidden " +
          containerMask
        }
      >
        {/* Glyph fallback — only rendered when there's NO src. Earlier
            versions left it absolutely-positioned underneath the img,
            assuming the img would cover it. Logos with internal
            transparency (Bayer's white-on-cross mark, etc.) let the
            briefcase show THROUGH the logo, which read as an icon
            stacked on the brand mark. Mutually-exclusive render is
            cleaner — broken-image still shows the briefcase because
            the <img> simply isn't rendered when `src` is empty. */}
        {!src ? (
          <Briefcase size={40} className="text-slate-300" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className={
              imageFit + " " +
              (imageFit === "object-contain"
                // Natural: contain the logo inside the disc, with breathing room.
                ? "w-24 h-24 sm:w-28 sm:h-28"
                // Cropping shapes: fill the wrapper edge-to-edge.
                : "w-full h-full")
            }
            style={xformStyle}
          />
        )}
      </div>
    </div>
  );
}

function InlineMeta({
  icon: Icon, children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-fg font-medium">
      <Icon size={13} className="text-subtle" />
      {children}
    </span>
  );
}

function Dot() {
  return <span aria-hidden className="inline-block w-1 h-1 rounded-full bg-line" />;
}

function InlineStat({
  label, value, tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "violet" | "rose";
}) {
  const gradients: Record<typeof tone, string> = {
    brand:  "linear-gradient(135deg, rgb(56,189,248) 0%, rgb(29,78,216) 100%)",
    violet: "linear-gradient(135deg, rgb(167,139,250) 0%, rgb(109,40,217) 100%)",
    rose:   "linear-gradient(135deg, rgb(251,113,133) 0%, rgb(190,18,60) 100%)",
  };
  return (
    <div className="px-5 sm:px-8 first:pl-0 last:pr-0">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
        {label}
      </p>
      <p
        className="text-4xl sm:text-5xl lg:text-6xl font-bold tabular-nums tracking-tight leading-none mt-2"
        style={{
          backgroundImage: gradients[tone],
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

interface QueueItem {
  applicationStatusId: string;
  postingId: string;
  postingTitle: string;
  applicantId: string;
  applicantName: string | null;
  kind: QueueKind;
  daysInStage: number;
}

function QueueRow({ item }: { item: QueueItem }) {
  const kindMeta: Record<QueueKind, { label: string; icon: typeof Inbox; tone: string }> = {
    "new":             { label: "New application",  icon: Inbox,         tone: "text-brand-700" },
    "stale":           { label: "Stalled",          icon: AlertTriangle, tone: "text-amber-700" },
    "offer-waiting":   { label: "Awaiting reply",   icon: Hourglass,     tone: "text-violet-700" },
  };
  const meta = kindMeta[item.kind];
  const Icon = meta.icon;
  return (
    <li>
      <Link
        href={`/employer/postings/${item.postingId}/applicants/${item.applicationStatusId}`}
        className="group block py-3 hover:bg-elevated/40 transition-colors -mx-3 sm:-mx-5 px-3 sm:px-5 rounded-xl"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <Icon size={14} className={`${meta.tone} shrink-0`} />
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle whitespace-nowrap">
            {meta.label}
          </span>
          <span className="font-semibold text-fg group-hover:text-brand-700 transition-colors truncate min-w-0 flex-1">
            {item.applicantName ?? "Unknown applicant"}
          </span>
          <span className="text-xs text-muted truncate">
            {item.postingTitle}
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-subtle tabular-nums whitespace-nowrap">
            {item.daysInStage}d
          </span>
        </div>
      </Link>
    </li>
  );
}

interface PostingPreview {
  id: string;
  title: string;
  location: string | null;
  type: string | null;
  compensation: string | null;
  deadline: Date | null;
  keySkills: string[];
  // Type-wise Prisma always populates this when included, but
  // defensive in case the runtime row is malformed.
  _count?: { applicationStatuses: number } | null;
}

function PostingListRow({ posting }: { posting: PostingPreview }) {
  const allSkills = posting.keySkills ?? [];
  const skills = allSkills.slice(0, 4);
  const applicantCount = posting._count?.applicationStatuses ?? 0;
  return (
    <li>
      <Link
        href={`/employer/postings/${posting.id}/applicants`}
        className="group block py-4 hover:bg-elevated/40 transition-colors -mx-3 sm:-mx-5 px-3 sm:px-5 rounded-xl"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-fg text-base group-hover:text-brand-700 transition-colors">
                {posting.title}
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              {posting.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> {posting.location}
                </span>
              )}
              {posting.type && (<><Dot /><span>{posting.type}</span></>)}
              {posting.compensation && (<><Dot /><span>{posting.compensation}</span></>)}
              {posting.deadline && (
                <>
                  <Dot />
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={11} />
                    Closes {posting.deadline.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                  </span>
                </>
              )}
            </div>
            {skills.length > 0 && (
              <p className="mt-1.5 text-xs text-subtle truncate">
                {skills.join(" · ")}
                {allSkills.length > 4 && ` · +${allSkills.length - 4} more`}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p
              className="text-2xl font-bold tabular-nums tracking-tight leading-none"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgb(56,189,248), rgb(124,58,237))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {applicantCount}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mt-1">
              applicant{applicantCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}

// ─── URL helpers ─────────────────────────────────────────────────

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "#";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function hostnameFor(input: string): string {
  try {
    return new URL(normalizeUrl(input)).hostname.replace(/^www\./, "");
  } catch {
    return input;
  }
}
