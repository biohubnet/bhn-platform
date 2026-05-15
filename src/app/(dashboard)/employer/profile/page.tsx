/**
 * /employer/profile — editorial / magazine layout.
 *
 * The previous iteration stacked six boxed surfaces. This pass
 * dissolves the boxes: sections now flow as a continuous canvas
 * separated by hairlines + typography, with soft gradient washes
 * setting the mood between zones.
 *
 * Section flow, top → bottom:
 *
 *   COVER BANNER — full-bleed cinematic gradient, the only "block"
 *      that survives because it's the visual stage.
 *
 *   IDENTITY ROW — logo + company name + chips + trust signals
 *      floated directly on a soft gradient wash bleeding down out
 *      of the cover. No card.
 *
 *   ABOUT QUOTE — pull-quote, no container; just a brand rule on
 *      the left and a ghosted Quote glyph behind.
 *
 *   STAT TRIPLET — three numbers in one row separated by vertical
 *      hairlines, sitting on a tinted band.
 *
 *   HIRING SHOPFRONT — live postings as hairline-divided list
 *      rows, not cards. Reads like a directory entry.
 *
 *   EDITOR — single restrained container at the foot of the page.
 *
 * Between sections: a horizontal hairline + section eyebrow label.
 * The page reads as one piece of editorial design instead of a
 * stack of dashboard tiles.
 */
import Link from "next/link";
import {
  ArrowLeft, Globe, MapPin, Users, Calendar, Briefcase, Sparkles,
  ShieldCheck, Quote, Clock, ArrowRight,
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
      take: 5,
    }),
    prisma.internshipPosting.findFirst({
      where: postingsWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const filledCount = [
    user?.employerCompany, user?.companyWebsite, user?.companyIndustry,
    user?.companySize, user?.companyLocation, user?.companyDescription,
    user?.companyFounded, user?.companyLogo,
  ].filter((v) => v && v.toString().trim().length > 0).length;
  const editorDefaultOpen = filledCount < 4;

  const hasName = Boolean(user?.employerCompany?.trim());
  const memberSinceYear = (firstPosting?.createdAt ?? user?.createdAt)?.getFullYear();

  return (
    <div className="-mt-2">
      <Link
        href="/employer"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft size={12} /> Employer overview
      </Link>

      {/* ── COVER BANNER ──────────────────────────────────────── */}
      <CoverBanner />

      {/* ── BODY — one continuous gradient-washed canvas ──────── */}
      {/* The whole content area sits on a top-down gradient that
          bleeds out of the cover. No hard card boundaries between
          sections — hairlines + typography do the dividing. */}
      <div
        className="relative -mt-24 sm:-mt-28 rounded-3xl overflow-hidden ring-1 ring-line"
        style={{
          background:
            "linear-gradient(180deg, rgba(59,130,246,0.07) 0%, rgba(244,114,182,0.04) 18%, rgba(255,255,255,0) 35%), linear-gradient(180deg, var(--card) 0%, var(--card) 100%)",
        }}
      >
        {/* Soft accent wash near the top — a brand-tinted bloom that
            mirrors the cover's aurora and dies out before the stats. */}
        <div
          aria-hidden
          className="absolute -top-20 left-1/4 w-[40rem] h-[40rem] rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(closest-side, rgba(59,130,246,0.5), rgba(59,130,246,0) 70%)",
          }}
        />

        {/* ── IDENTITY ROW (no card) ──────────────────────────── */}
        <section
          aria-label="Company identity"
          className="relative px-6 sm:px-10 lg:px-14 pt-8 sm:pt-10 pb-10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-6 sm:gap-10 items-start">
            <LogoDisc src={user?.companyLogo} alt={user?.employerCompany ?? ""} />

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

              {/* Identity chips — no boxes, plain text separated by
                  small dot dividers + tiny icons. Reads like a
                  newspaper byline, not a UI form. */}
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

              {/* Primary action + trust signals — a single line of
                  inline content; no card wrapping. */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                {user?.companyWebsite && (
                  <a
                    href={normalizeUrl(user.companyWebsite)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 font-bold text-brand-700 hover:text-brand-800 transition-colors"
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

              {!user?.companyIndustry && !user?.companyLocation && !user?.companySize && !user?.companyFounded && (
                <p className="mt-4 text-xs text-subtle italic inline-flex items-center gap-1.5">
                  <Sparkles size={11} /> Use auto-fill below to populate this row from your website.
                </p>
              )}
            </div>

            {/* Live tag — top-right, tiny. */}
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 whitespace-nowrap self-start">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </section>

        {/* ── ABOUT QUOTE (no card, just typography) ──────────── */}
        {user?.companyDescription?.trim() && (
          <section
            aria-label="About"
            className="relative px-6 sm:px-10 lg:px-14 py-10 sm:py-12 border-t border-line"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(59,130,246,0.04) 0%, rgba(244,114,182,0.04) 100%)",
            }}
          >
            <SectionEyebrow>About {user?.employerCompany?.trim() || "us"}</SectionEyebrow>
            <div className="relative pl-6 sm:pl-8 max-w-3xl">
              {/* Brand gradient rule on the left */}
              <div
                aria-hidden
                className="absolute left-0 top-1 bottom-1 w-1 rounded-full"
                style={{
                  background:
                    "linear-gradient(180deg, rgb(56,189,248), rgb(124,58,237), rgb(244,114,182))",
                }}
              />
              {/* Ghosted oversized quotation mark behind text */}
              <Quote
                size={120}
                aria-hidden
                className="absolute -top-4 -left-2 sm:-left-4 text-brand-100 pointer-events-none opacity-60"
                strokeWidth={1.2}
              />
              <blockquote className="relative text-lg sm:text-xl lg:text-2xl text-fg leading-relaxed font-medium">
                {user.companyDescription}
              </blockquote>
            </div>
          </section>
        )}

        {/* ── STAT TRIPLET — one row, vertical hairlines ──────── */}
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

        {/* ── HIRING SHOPFRONT — list, not cards ──────────────── */}
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
                href="/employer"
                className="text-xs font-bold inline-flex items-center gap-1"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgb(29,78,216), rgb(124,58,237))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Manage postings <ArrowRight size={11} className="text-brand-700" />
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {livePostingsPreview.map((p) => (
                <PostingListRow key={p.id} posting={p} />
              ))}
            </ul>
          </section>
        )}

        {/* ── EDITOR ────────────────────────────────────────── */}
        <section className="relative px-6 sm:px-10 lg:px-14 py-10 sm:py-12 border-t border-line">
          <SectionEyebrow>Manage</SectionEyebrow>
          <ProfileEditorAccordion
            initial={user ?? {}}
            defaultOpen={editorDefaultOpen}
          />
        </section>
      </div>
    </div>
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
  return (
    <div className="relative h-56 sm:h-72 lg:h-[22rem] rounded-3xl overflow-hidden ring-1 ring-slate-800 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
      {/* Base — deeper, more saturated, with more colour movement */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0b0f24 0%, #142046 25%, #312e81 50%, #6b21a8 75%, #831843 100%)",
        }}
      />
      {/* Auroras — bigger, more colours */}
      <div
        aria-hidden
        className="absolute -top-40 -left-32 w-[36rem] h-[36rem] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(56,189,248,0.7), rgba(56,189,248,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 right-1/3 w-[34rem] h-[34rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(244,114,182,0.7), rgba(244,114,182,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-0 right-0 w-[24rem] h-[24rem] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(250,204,21,0.5), rgba(250,204,21,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-1/3 w-[22rem] h-[22rem] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(74,222,128,0.5), rgba(74,222,128,0) 70%)",
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
      {/* Horizon hairline */}
      <div
        aria-hidden
        className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      {/* Bottom soft fade — lets the body content beneath dissolve in */}
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

function LogoDisc({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div className="relative shrink-0 -mt-20 sm:-mt-24">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(56,189,248,0.5), rgba(244,114,182,0.5), rgba(250,204,21,0.4), rgba(74,222,128,0.4), rgba(56,189,248,0.5))",
        }}
      />
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
  // Gradient text colour per tone — the number itself becomes the
  // colour expression, no surrounding chrome.
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

function PostingListRow({ posting }: { posting: PostingPreview }) {
  const skills = (posting.keySkills ?? []).slice(0, 4);
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
                {posting.keySkills.length > 4 && ` · +${posting.keySkills.length - 4} more`}
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
              {posting._count.applicationStatuses}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mt-1">
              applicant{posting._count.applicationStatuses === 1 ? "" : "s"}
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
