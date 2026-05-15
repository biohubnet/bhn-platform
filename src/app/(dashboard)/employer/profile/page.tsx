/**
 * /employer/profile — cinematic company profile page.
 *
 * The previous design was a plain `H1 + description + form` — perfectly
 * functional but no presence. Employers reach this page often (it's
 * what trainees see on every internship posting they make), so the
 * page now opens with a wide dark hero that puts the company brand
 * itself at the centre:
 *
 *   • Big company logo on a glowing pale disc.
 *   • Massive company name, kerned tight.
 *   • Industry / HQ / size / founded chips laid out as a brag sheet.
 *   • A "live · visible to trainees" tag that telegraphs status.
 *   • A three-stat strip beneath (postings live, applicants reviewed,
 *     interviews scheduled) — real prestige indicators, computed
 *     from the database.
 *
 * Below the hero, the existing CompanyProfileEditor handles edits.
 * Save → router.refresh → hero re-renders with new values.
 *
 * Empty-state handling: when the employer hasn't filled anything in
 * yet, the hero stays present (so the page still feels meaningful)
 * but every empty slot reads as a "Add your X" prompt. The visual
 * weight stays — but it's tuned softer until real content lands.
 */
import Link from "next/link";
import { ArrowLeft, Globe, MapPin, Users, Calendar, Briefcase, Sparkles, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanyProfileEditor } from "@/components/employer/CompanyProfileEditor";

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

  // Stats — counts of postings + applicants + interviews under this
  // employer. Admin viewers see the platform-wide totals (because the
  // /employer pages already act as the admin's HR control surface).
  const isAdmin = ["admin", "superadmin"].includes(role);
  const postingsWhere = isAdmin ? {} : { createdById: userId ?? "_" };
  const [postingsLive, applicantsCount, interviewsCount] = await Promise.all([
    prisma.internshipPosting.count({ where: { ...postingsWhere, status: "active" } }),
    prisma.applicationStatus.count({
      where: { posting: postingsWhere },
    }),
    prisma.interview.count({
      where: { posting: postingsWhere },
    }),
  ]);

  const hasName = Boolean(user?.employerCompany?.trim());

  return (
    <div className="space-y-8">
      {/* ── Top bar ────────────────────────────────────────────── */}
      <Link
        href="/employer"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Employer overview
      </Link>

      {/* ── Cinematic hero ─────────────────────────────────────── */}
      <section
        aria-label="Company profile"
        className="relative overflow-hidden rounded-3xl ring-1 ring-slate-800 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]"
      >
        {/* Layer 1: deep base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0a1e3d]" />

        {/* Layer 2: brand-accent radial backlight behind the logo */}
        <div
          aria-hidden
          className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(59,130,246,0.55), rgba(59,130,246,0) 70%)",
          }}
        />
        {/* Layer 3: warm secondary glow far-right */}
        <div
          aria-hidden
          className="absolute -bottom-24 -right-10 w-[22rem] h-[22rem] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(244,114,182,0.45), rgba(244,114,182,0) 70%)",
          }}
        />

        {/* Layer 4: organic noise texture so the gradient doesn't
            look CSS-flat. SVG turbulence at low opacity reads as
            material; without it the panel feels plasticky. */}
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full opacity-[0.18] mix-blend-overlay pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id="profile-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="7" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0.35 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#profile-noise)" />
        </svg>

        {/* Layer 5: subtle horizon line — sells the "cinematic" feel */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />

        {/* Content */}
        <div className="relative px-6 sm:px-10 lg:px-14 py-10 sm:py-14 lg:py-16">
          {/* Status row */}
          <div className="flex items-center gap-3 mb-8 sm:mb-10">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
              <ShieldCheck size={11} />
              Live · visible to trainees
            </span>
            {hasName && (
              <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-white/40">
                {isAdmin ? "Admin view" : "Your company face"}
              </span>
            )}
          </div>

          {/* Logo + name block — grid so the logo stays anchored at
              large viewport widths and falls beneath the name on
              mobile without losing the dominant scale. */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 sm:gap-8 items-center">
            <LogoDisc src={user?.companyLogo} alt={user?.employerCompany ?? ""} />

            <div className="min-w-0">
              <h1
                className={
                  "font-bold tracking-tight leading-[1.05] " +
                  (hasName
                    ? "text-4xl sm:text-5xl lg:text-6xl text-white"
                    : "text-3xl sm:text-4xl text-white/50 italic")
                }
              >
                {user?.employerCompany?.trim() || "Add your company name"}
              </h1>

              {user?.companyDescription?.trim() && (
                <p className="mt-4 text-sm sm:text-base text-white/70 leading-relaxed max-w-3xl line-clamp-3">
                  {user.companyDescription}
                </p>
              )}

              {/* Identity chips — industry / HQ / size / founded.
                  Each renders only if there's content; empty slots
                  silently disappear so the row doesn't look ragged. */}
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {user?.companyIndustry && (
                  <Chip icon={Briefcase}>{user.companyIndustry}</Chip>
                )}
                {user?.companyLocation && (
                  <Chip icon={MapPin}>{user.companyLocation}</Chip>
                )}
                {user?.companySize && (
                  <Chip icon={Users}>{user.companySize} people</Chip>
                )}
                {user?.companyFounded && (
                  <Chip icon={Calendar}>Since {user.companyFounded}</Chip>
                )}
                {user?.companyWebsite && (
                  <a
                    href={normalizeUrl(user.companyWebsite)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15 hover:ring-white/30 transition-colors"
                  >
                    <Globe size={12} /> {hostnameFor(user.companyWebsite)}
                  </a>
                )}
                {!user?.companyIndustry && !user?.companyLocation && !user?.companySize && !user?.companyFounded && (
                  <span className="text-xs text-white/45 italic inline-flex items-center gap-1.5">
                    <Sparkles size={11} /> Auto-fill below to populate the brag-sheet automatically.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stat strip — three big numbers along the bottom of the
              hero. Tabular-nums so single-digit and multi-digit
              counts align cleanly. */}
          <div className="mt-10 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-6 max-w-3xl">
            <HeroStat label={isAdmin ? "Postings live (platform)" : "Postings live"} value={postingsLive} />
            <HeroStat label="Applicants reviewed" value={applicantsCount} />
            <HeroStat label="Interviews held" value={interviewsCount} />
          </div>
        </div>
      </section>

      {/* ── Editor body ────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-fg tracking-tight">Edit your profile</h2>
          <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">
            Auto-saves on click of Save
          </span>
        </div>
        <p className="text-sm text-muted max-w-2xl leading-relaxed">
          Add your website and let the AI fill in industry, HQ, size, founding year, and a short description. The logo defaults to your site&apos;s favicon — paste a custom URL to override. Every change updates the hero above and the company face trainees see on each of your internship postings.
        </p>
        <div className="pt-3">
          <CompanyProfileEditor initial={user ?? {}} />
        </div>
      </section>
    </div>
  );
}

// ─── Hero sub-components ─────────────────────────────────────────

/** Big circular logo disc with outer halo + inset glow. Falls back to
 *  a glyph when no logo is set — empty state still feels intentional. */
function LogoDisc({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div className="relative shrink-0">
      {/* Halo — soft outer glow */}
      <div
        aria-hidden
        className="absolute -inset-3 rounded-full opacity-70 blur-xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.35), rgba(255,255,255,0) 75%)",
        }}
      />
      {/* Disc */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/95 ring-1 ring-white/40 shadow-[0_18px_40px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.6)] flex items-center justify-center overflow-hidden">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Briefcase size={32} className="text-slate-400" />
        )}
      </div>
    </div>
  );
}

function Chip({
  icon: Icon, children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/15 backdrop-blur-sm">
      <Icon size={12} className="text-white/70" />
      {children}
    </span>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="relative">
      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-white/50 mb-1">
        {label}
      </p>
      <p className="text-3xl sm:text-4xl font-bold tabular-nums text-white tracking-tight leading-none">
        {value}
      </p>
    </div>
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
