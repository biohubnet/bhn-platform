/**
 * /employer/profile — flagship company-presence page.
 *
 * The page is a sequence of display surfaces stacked top-to-bottom,
 * each adding a different kind of weight before the actual edit form
 * appears:
 *
 *   1. COVER BANNER  — full-bleed cinematic gradient with aurora
 *      glows + noise texture, share-link in the top right.
 *   2. IDENTITY CARD — overlaps the cover bottom by ~50%; holds the
 *      logo + name + tagline + identity chips + verified badge.
 *      This is the visual "headline" of the page.
 *   3. STAT TRIPLET — three oversize numbers (postings live,
 *      applicants reviewed, interviews held) on hairline-divided
 *      cards.
 *   4. ABOUT QUOTE  — the company description rendered as a
 *      pull-quote with a brand-accent rule on the left.
 *   5. POSTINGS PREVIEW — "what trainees see when they find you":
 *      up to four of the team's live postings in clean cards.
 *   6. EDITOR ACCORDION — collapsed by default once the profile is
 *      reasonably complete; expanded by default for fresh accounts
 *      so day-one employers see the form immediately.
 *
 * The page is a server component; the editor accordion + editor are
 * the only client islands.
 *
 * Stats are pulled from the database in one Promise.all so the
 * numbers reflect reality, not vanity placeholders. Admin viewers
 * see platform-wide totals (they use /employer as their HR control
 * surface); employer accounts see only their own postings.
 */
import Link from "next/link";
import {
  ArrowLeft, Globe, MapPin, Users, Calendar, Briefcase, Sparkles,
  ShieldCheck, Quote, BarChart3, FileText, Clock,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditorAccordion } from "@/components/employer/ProfileEditorAccordion";

export default async function EmployerProfilePage() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "";
  const userId = (session!.user as { id?: string }).id;
  if (role !== "employer" && !["admin", "superadmin"].includes(role)) {
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
          employerCompany: true,
          companyWebsite: true,
          companyLogo: true,
          companyIndustry: true,
          companySize: true,
          companyLocation: true,
          companyDescription: true,
          companyFounded: true,
        },
      })
    : null;

  const isAdmin = ["admin", "superadmin"].includes(role);
  const postingsWhere = isAdmin ? {} : { createdById: userId ?? "_" };

  const [
    postingsLive,
    applicantsCount,
    interviewsCount,
    hiredCount,
    livePostingsPreview,
    firstPosting,
  ] = await Promise.all([
    prisma.internshipPosting.count({ where: { ...postingsWhere, status: "active" } }),
    prisma.applicationStatus.count({ where: { posting: postingsWhere } }),
    prisma.interview.count({ where: { posting: postingsWhere } }),
    prisma.applicationStatus.count({
      where: { posting: postingsWhere, status: "hired" },
    }),
    prisma.internshipPosting.findMany({
      where: { ...postingsWhere, status: "active" },
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
      take: 4,
    }),
    prisma.internshipPosting.findFirst({
      where: postingsWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const filledCount = [
    user?.employerCompany,
    user?.companyWebsite,
    user?.companyIndustry,
    user?.companySize,
    user?.companyLocation,
    user?.companyDescription,
    user?.companyFounded,
    user?.companyLogo,
  ].filter((v) => v && v.toString().trim().length > 0).length;
  const editorDefaultOpen = filledCount < 4;

  const hasName = Boolean(user?.employerCompany?.trim());
  const memberSinceYear = (firstPosting?.createdAt ?? user?.createdAt)?.getFullYear();

  return (
    <div className="space-y-6 -mt-2">
      {/* Back link */}
      <Link
        href="/employer"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Employer overview
      </Link>

      {/* ── 1. COVER BANNER ────────────────────────────────────── */}
      <CoverBanner />

      {/* ── 2. IDENTITY CARD (overlaps cover) ──────────────────── */}
      <section
        aria-label="Company identity"
        className="-mt-32 sm:-mt-36 mx-2 sm:mx-6 lg:mx-10 relative z-10 bg-card rounded-3xl border border-line p-6 sm:p-8 lg:p-10 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25),0_2px_4px_rgba(15,23,42,0.04)]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-6 sm:gap-8 items-start">
          <LogoDisc src={user?.companyLogo} alt={user?.employerCompany ?? ""} />

          <div className="min-w-0">
            <h1
              className={
                "font-bold tracking-tight leading-[1.02] " +
                (hasName
                  ? "text-4xl sm:text-5xl lg:text-6xl text-fg"
                  : "text-3xl sm:text-4xl text-muted italic")
              }
            >
              {user?.employerCompany?.trim() || "Add your company name"}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {user?.companyIndustry && <SoftChip icon={Briefcase}>{user.companyIndustry}</SoftChip>}
              {user?.companyLocation && <SoftChip icon={MapPin}>{user.companyLocation}</SoftChip>}
              {user?.companySize && <SoftChip icon={Users}>{user.companySize} people</SoftChip>}
              {user?.companyFounded && <SoftChip icon={Calendar}>Since {user.companyFounded}</SoftChip>}
              {user?.companyWebsite && (
                <a
                  href={normalizeUrl(user.companyWebsite)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/25 transition-colors"
                >
                  <Globe size={12} /> Visit {hostnameFor(user.companyWebsite)}
                </a>
              )}
              {!user?.companyIndustry && !user?.companyLocation && !user?.companySize && !user?.companyFounded && (
                <span className="text-xs text-subtle italic inline-flex items-center gap-1.5">
                  <Sparkles size={11} /> Use auto-fill below to populate this brag-sheet from your website.
                </span>
              )}
            </div>

            {/* Trust signals */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-subtle">
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <ShieldCheck size={12} /> Verified employer
              </span>
              {memberSinceYear && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={11} /> Posting on BHN since {memberSinceYear}
                </span>
              )}
              {hiredCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-brand-700">
                  <Sparkles size={11} /> {hiredCount} BHN talent hired
                </span>
              )}
            </div>
          </div>

          {/* Status badge — top right on wide layouts, inline below
              on narrow ones (grid auto-stacks the third column). */}
          <div className="flex sm:flex-col items-start gap-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            <p className="text-[10px] text-subtle leading-snug max-w-[140px] hidden sm:block">
              Trainees see this page on every internship you post.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. STAT TRIPLET ────────────────────────────────────── */}
      <section className="mx-2 sm:mx-6 lg:mx-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <BigStat
          label={isAdmin ? "Postings live (platform)" : "Postings live"}
          value={postingsLive}
          accent="brand"
          icon={FileText}
        />
        <BigStat
          label="Applicants reviewed"
          value={applicantsCount}
          accent="violet"
          icon={Users}
        />
        <BigStat
          label="Interviews held"
          value={interviewsCount}
          accent="emerald"
          icon={BarChart3}
        />
      </section>

      {/* ── 4. ABOUT QUOTE ─────────────────────────────────────── */}
      {user?.companyDescription?.trim() && (
        <section className="mx-2 sm:mx-6 lg:mx-10">
          <div className="relative bg-card rounded-3xl border border-line p-6 sm:p-8 lg:p-10 surface-shadow overflow-hidden">
            {/* Brand accent rule on the left */}
            <div className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full bg-gradient-to-b from-brand-500 to-brand-700" />
            {/* Background quotation mark — very subtle, behind text */}
            <Quote
              size={140}
              className="absolute -top-6 -right-2 text-brand-50 pointer-events-none"
              strokeWidth={1.2}
            />
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3 relative">
              About {user?.employerCompany?.trim() || "us"}
            </p>
            <blockquote className="relative text-base sm:text-lg lg:text-xl text-fg leading-relaxed font-medium max-w-3xl">
              {user.companyDescription}
            </blockquote>
          </div>
        </section>
      )}

      {/* ── 5. POSTINGS PREVIEW ────────────────────────────────── */}
      {livePostingsPreview.length > 0 && (
        <section className="mx-2 sm:mx-6 lg:mx-10 space-y-3">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                Hiring shopfront
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-fg tracking-tight mt-0.5">
                What trainees see when they find you
              </h2>
            </div>
            <Link
              href="/employer"
              className="text-xs font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
            >
              Manage postings →
            </Link>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {livePostingsPreview.map((p) => (
              <PostingMiniCard key={p.id} posting={p} />
            ))}
          </ul>
        </section>
      )}

      {/* ── 6. EDITOR ACCORDION ────────────────────────────────── */}
      <section className="mx-2 sm:mx-6 lg:mx-10">
        <ProfileEditorAccordion
          initial={user ?? {}}
          defaultOpen={editorDefaultOpen}
        />
      </section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

/** Full-bleed cinematic cover banner. Tall enough that the identity
 *  card overlapping its bottom edge has presence. Uses CSS-only
 *  effects so it doesn't carry a runtime cost. */
function CoverBanner() {
  return (
    <div className="relative h-56 sm:h-72 lg:h-80 rounded-3xl overflow-hidden ring-1 ring-slate-800 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0b1c3a] to-[#1e1b4b]" />
      {/* Aurora 1 — cool blue */}
      <div
        aria-hidden
        className="absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(56,189,248,0.55), rgba(56,189,248,0) 70%)",
        }}
      />
      {/* Aurora 2 — warm pink */}
      <div
        aria-hidden
        className="absolute -bottom-24 right-1/4 w-[28rem] h-[28rem] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(244,114,182,0.55), rgba(244,114,182,0) 70%)",
        }}
      />
      {/* Aurora 3 — gold */}
      <div
        aria-hidden
        className="absolute -top-10 right-10 w-[20rem] h-[20rem] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(250,204,21,0.45), rgba(250,204,21,0) 70%)",
        }}
      />
      {/* Noise overlay */}
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
      {/* Horizon line */}
      <div
        aria-hidden
        className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      {/* Bottom fade — lets the identity card sit cleanly on top */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-black/30"
      />
      {/* Eyebrow label */}
      <div className="absolute top-5 left-6 sm:left-10 text-[10px] uppercase tracking-[0.28em] font-bold text-white/70">
        Company profile
      </div>
    </div>
  );
}

/** Big logo disc that sits at the start of the identity card. Larger
 *  than the previous version — at 160px on desktop it gives the
 *  identity card real visual mass. */
function LogoDisc({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div className="relative shrink-0 -mt-16 sm:-mt-20">
      {/* Outer halo glow */}
      <div
        aria-hidden
        className="absolute -inset-4 rounded-full opacity-60 blur-xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(59,130,246,0.35), rgba(59,130,246,0) 75%)",
        }}
      />
      {/* The disc itself */}
      <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white ring-4 ring-white shadow-[0_18px_40px_-10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] flex items-center justify-center overflow-hidden">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Briefcase size={40} className="text-slate-400" />
        )}
      </div>
    </div>
  );
}

function SoftChip({
  icon: Icon, children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-elevated text-fg ring-1 ring-inset ring-line">
      <Icon size={12} className="text-muted" />
      {children}
    </span>
  );
}

function BigStat({
  label, value, accent, icon: Icon,
}: {
  label: string;
  value: number;
  accent: "brand" | "violet" | "emerald";
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const accentMap = {
    brand:   "from-brand-500/15 to-brand-500/0 text-brand-700",
    violet:  "from-violet-500/15 to-violet-500/0 text-violet-700",
    emerald: "from-emerald-500/15 to-emerald-500/0 text-emerald-700",
  };
  return (
    <div className="relative bg-card rounded-3xl border border-line p-5 sm:p-6 surface-shadow overflow-hidden">
      {/* Accent radial wash from the upper-right corner. Drops the
          stat into a quiet brand-coloured field without screaming. */}
      <div
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-bl ${accentMap[accent]} pointer-events-none`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            {label}
          </p>
          <p className="text-4xl sm:text-5xl font-bold tabular-nums text-fg tracking-tight leading-none mt-2">
            {value.toLocaleString()}
          </p>
        </div>
        <span className={`w-10 h-10 rounded-xl bg-card flex items-center justify-center ring-1 ring-inset ring-line shrink-0 ${accentMap[accent].split(" ").slice(-1)[0]}`}>
          <Icon size={16} />
        </span>
      </div>
    </div>
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
  _count: { applicationStatuses: number };
}

function PostingMiniCard({ posting }: { posting: PostingPreview }) {
  const skills = (posting.keySkills ?? []).slice(0, 3);
  return (
    <li>
      <Link
        href={`/employer/postings/${posting.id}/applicants`}
        className="block bg-card rounded-2xl border border-line p-5 surface-shadow hover:border-brand-300 hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_16px_40px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-fg text-sm leading-snug line-clamp-2">
            {posting.title}
          </h3>
          <span className="inline-flex items-center text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 whitespace-nowrap">
            Live
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          {posting.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {posting.location}
            </span>
          )}
          {posting.type && <span>· {posting.type}</span>}
          {posting.compensation && <span>· {posting.compensation}</span>}
        </div>
        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-elevated text-muted ring-1 ring-inset ring-line">
                {s}
              </span>
            ))}
            {posting.keySkills.length > 3 && (
              <span className="text-[10px] text-subtle py-0.5">
                +{posting.keySkills.length - 3} more
              </span>
            )}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-[11px]">
          <span className="text-muted inline-flex items-center gap-1">
            <Users size={11} /> {posting._count.applicationStatuses} applicant
            {posting._count.applicationStatuses === 1 ? "" : "s"}
          </span>
          {posting.deadline && (
            <span className="text-subtle inline-flex items-center gap-1">
              <Calendar size={11} /> Closes {posting.deadline.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
            </span>
          )}
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
