import Link from "next/link";
import {
  Building2, FilePlus, Users2, Video, ArrowRight, Sparkles, Calendar,
  Plus, Mail, MapPin, Clock, ChevronRight, AlertCircle, CheckCircle2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { GreetingTagline } from "@/components/lms/GreetingTagline";
import { getDisplayName } from "@/lib/user/display-name";
import { PreferredNameEditor } from "@/components/profile/PreferredNameEditor";

interface UserShape {
  id: string;
  name: string | null;
  preferredName: string | null;
  email?: string | null;
  employerCompany: string | null;
  companyWebsite: string | null;
  companyLogo: string | null;
  companyIndustry: string | null;
  companySize: string | null;
  companyLocation: string | null;
  companyDescription: string | null;
  companyFounded: string | null;
}

/** HR-tailored dashboard. Replaces the learner dashboard when role
 *  === "employer". Focuses on three things: profile completeness,
 *  active postings, and recent applicants. */
export async function EmployerDashboard({
  user,
  committeeBadge,
}: {
  user: UserShape;
  /** Optional content rendered immediately AFTER the hero — used by
   *  the dashboard page to inject CommitteeBadgeStrip without
   *  pushing the editorial hero off the top of the page. */
  committeeBadge?: React.ReactNode;
}) {
  // Greeting form: preferredName (if user has chosen one) → full
  // name → email local-part → "there". See src/lib/user/display-name.ts
  // for the contract and the rationale behind not auto-splitting
  // multi-word given names.
  const firstName = getDisplayName(user);
  const companyName = user.employerCompany ?? "your company";

  // Profile completeness — six fields total. Used for the gentle nudge
  // card when the partner hasn't filled in their info yet.
  const fields = [
    user.employerCompany,
    user.companyWebsite,
    user.companyIndustry,
    user.companySize,
    user.companyLocation,
    user.companyDescription,
  ];
  const filled = fields.filter(Boolean).length;
  const profilePct = Math.round((filled / fields.length) * 100);

  const [postings, applicants, talentForm, postingsCount, applicantsCount, hasVideo] =
    await Promise.all([
      // Most-recent five postings authored by this employer.
      prisma.internshipPosting.findMany({
        where: { createdById: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Latest five talent-application submissions, scoped to active form.
      prisma.eventFormSubmission.findMany({
        where: { form: { slug: "talent-application" } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.eventForm.findFirst({ where: { slug: "talent-application" }, select: { id: true } }),
      prisma.internshipPosting.count({ where: { createdById: user.id, status: "active" } }),
      prisma.eventFormSubmission.count({ where: { form: { slug: "talent-application" } } }),
      // Unused right now but kept as the placeholder for "videos to watch" once we score reviewed/unreviewed.
      Promise.resolve(0),
    ]);
  void talentForm; void hasVideo;

  // Newcomers since profile load — currently last 7 days; will move
  // to "since lastSeenAt" once that field exists on User.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newRecently = await prisma.eventFormSubmission.count({
    where: { form: { slug: "talent-application" }, createdAt: { gt: since } },
  });

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="full-bleed relative overflow-hidden text-white -mt-8 mb-2 hero-mesh-brand">
        <div className="absolute inset-0 pointer-events-none">
          <div className="blob-shape blob-soft drift" style={{ width: 540, height: 540, top: -180, left: -160 }} />
          <div className="blob-shape blob-soft drift-slow" style={{ width: 660, height: 660, bottom: -260, right: -180, opacity: 0.55 }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-20">
          <div className="grid md:grid-cols-[2fr_1fr] gap-10 items-end">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                <Building2 size={12} /> Employer portal
              </span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mt-3 inline-flex items-baseline gap-2 flex-wrap">
                <span>Hi, <span className="gradient-text">{firstName}</span> at {companyName}.</span>
                <PreferredNameEditor
                  mode="pencil"
                  fullName={user.name}
                  initial={user.preferredName}
                />
              </h1>
              <GreetingTagline tone="dark" />
              <p className="mt-4 text-white/85 leading-relaxed text-base md:text-lg max-w-2xl">
                {applicantsCount > 0
                  ? `${applicantsCount} talent applications on file${newRecently > 0 ? ` — ${newRecently} new this week.` : "."} Pick up where you left off.`
                  : "Post your first internship and BHN-vetted candidates will start showing up here."}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/admin/internships/new"
                  className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-semibold text-sm px-6 py-3 organic-card shadow-lg shadow-brand-900/30 transition-all hover:-translate-y-0.5"
                >
                  <Plus size={16} /> Post an internship
                </Link>
                <Link
                  href="/employer/applicants"
                  className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/25 text-white hover:bg-white/20 text-sm font-semibold px-6 py-3 organic-card-alt transition-colors"
                >
                  <Users2 size={16} /> Browse applicants
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: FilePlus, label: "Active postings",   value: postingsCount, alt: false },
                { icon: Users2,   label: "Applicants",        value: applicantsCount, alt: true  },
                { icon: Sparkles, label: "New this week",     value: newRecently, alt: true  },
                { icon: Building2, label: "Profile complete", value: `${profilePct}%`, alt: false },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`bg-white/10 backdrop-blur border border-white/20 px-4 py-3.5 ${(i % 2 === 0) ? "organic-card" : "organic-card-alt"}`}>
                    <div className="flex items-center gap-2 text-white/75 text-[11px] uppercase tracking-wider">
                      <Icon size={12} /> {s.label}
                    </div>
                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="curve-down" />
      </section>

      {/* Committee badge — slotted in by the page wrapper. Renders
          immediately after the hero so the platform "hero is at the
          top" rule is preserved. */}
      {committeeBadge}

      {/* Profile-completeness nudge — only if profile is sparse */}
      {profilePct < 100 && (
        <Link
          href="/employer/profile"
          className="block bg-card border-2 border-brand-200 rounded-2xl p-5 hover:border-brand-400 hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-fg">Finish your company profile</p>
              <p className="text-sm text-muted mt-0.5">
                Paste your website and let the AI fill in your industry, HQ, size, and a short description in one click. Candidates see this on every posting your team makes.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: `${profilePct}%` }} />
                </div>
                <span className="text-xs font-medium text-muted">{profilePct}%</span>
              </div>
            </div>
            <ArrowRight size={18} className="text-brand-600 mt-1.5" />
          </div>
        </Link>
      )}

      {/* Quick actions row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/admin/internships/new", label: "New posting", icon: FilePlus, tone: "brand" },
          { href: "/employer/postings",     label: "My postings", icon: Building2, tone: "amber" },
          { href: "/employer/applicants",   label: "Applicants",  icon: Users2,    tone: "violet" },
          { href: "/employer/profile",      label: "Edit profile",icon: Sparkles,  tone: "emerald" },
        ].map((a) => {
          const Icon = a.icon;
          const tones: Record<string, string> = {
            brand:   "from-brand-500 to-brand-700 shadow-brand-600/20",
            violet:  "from-violet-500 to-violet-700 shadow-violet-600/20",
            amber:   "from-amber-400 to-amber-600 shadow-amber-500/20",
            emerald: "from-emerald-500 to-emerald-700 shadow-emerald-600/20",
          };
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group bg-card border border-line rounded-2xl p-4 hover:-translate-y-0.5 hover:shadow-md hover:border-brand-200 transition-all flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tones[a.tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{a.label}</p>
                <p className="text-xs text-subtle mt-0.5 inline-flex items-center gap-0.5">Open <ChevronRight size={11} /></p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent applicants */}
      <section className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-fg">Recent applicants</h2>
            <p className="text-xs text-muted mt-0.5">Latest five talent-application submissions</p>
          </div>
          <Link
            href="/employer/applicants"
            className="text-xs font-medium text-brand-700 hover:underline inline-flex items-center gap-1"
          >
            See all <ArrowRight size={11} />
          </Link>
        </div>
        {applicants.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted">
            <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
              <Users2 size={20} />
            </div>
            No applicants yet. Once candidates submit the talent application they&apos;ll show up here.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {applicants.map((s) => {
              const data = s.data as Record<string, string | string[]>;
              const fn = String(data.first_name ?? "").trim();
              const ln = String(data.last_name ?? "").trim();
              const initials = ((fn[0] ?? "?") + (ln[0] ?? "")).toUpperCase();
              const role = String(data.title_position ?? data.current_position ?? "").trim();
              const pitch = String(data.pitch ?? "").trim();
              const hasResume = typeof data.resume === "string" && data.resume.length > 0;
              const hasVid = typeof data.video === "string" && data.video.length > 0;
              return (
                <li key={s.id} className="flex items-start gap-4 px-5 py-4 hover:bg-elevated/40">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium text-fg leading-tight">{fn} {ln}</p>
                        {role && <p className="text-xs text-subtle mt-0.5">{role}</p>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted shrink-0">
                        {hasResume && <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-600" /> Resume</span>}
                        {hasVid && <span className="inline-flex items-center gap-1"><Video size={11} className="text-brand-600" /> Video</span>}
                        <span className="inline-flex items-center gap-1 text-subtle">
                          <Calendar size={11} /> {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {pitch && <p className="text-sm text-muted line-clamp-2 mt-2 leading-relaxed">{pitch}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recent postings */}
      <section className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-fg">Your postings</h2>
            <p className="text-xs text-muted mt-0.5">Latest five internships from {companyName}</p>
          </div>
          <Link
            href="/employer/postings"
            className="text-xs font-medium text-brand-700 hover:underline inline-flex items-center gap-1"
          >
            See all <ArrowRight size={11} />
          </Link>
        </div>
        {postings.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted">
            <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
              <FilePlus size={20} />
            </div>
            No postings yet.
            <div className="mt-3">
              <Link
                href="/admin/internships/new"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
              >
                Create your first <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {postings.map((p) => (
              <li key={p.id} className="flex items-start gap-4 px-5 py-4 hover:bg-elevated/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Link
                        href={`/internships/${p.id}`}
                        className="font-medium text-fg leading-tight hover:text-brand-700 transition-colors"
                      >
                        {p.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                        {p.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {p.location}</span>}
                        {p.duration && <span className="inline-flex items-center gap-1"><Clock size={11} /> {p.duration}</span>}
                        {p.deadline && <span className="inline-flex items-center gap-1"><Calendar size={11} /> by {p.deadline.toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusPill status={p.status} />
                      <Link
                        href={`/admin/internships/${p.id}/edit`}
                        className="text-xs px-2.5 py-1 rounded-md border border-line hover:border-brand-300 hover:text-brand-700 text-muted transition-colors"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Inbox CTA — placeholder until messaging ships */}
      <div className="bg-elevated/50 border border-dashed border-line rounded-2xl p-5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-card-solid border border-line text-brand-600 flex items-center justify-center shrink-0">
          <Mail size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fg">Reaching out to candidates</p>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Open a candidate from <Link href="/employer/applicants" className="text-brand-700 hover:underline">Applicants</Link> and use the <strong>Contact</strong> link to email them directly. In-platform messaging, save / shortlist, interview scheduling, and side-by-side comparison are on the roadmap.
          </p>
        </div>
        <AlertCircle size={14} className="text-subtle shrink-0 mt-1" />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "draft"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-elevated text-muted border-line";
  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}
