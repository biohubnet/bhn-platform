/**
 * The trainee home's two pillar columns, side by side on lg+:
 *   ENGAGE (left)      — credit tracker, courses to resume or start,
 *                        pathways open for enrolment
 *   EXPERIENCE (right) — where you stand with employers (profile views,
 *                        interviews done) and open internship postings
 *
 * Server components; the page fetches everything in its one
 * Promise.all and passes plain data in.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, CalendarClock, MapPin, Play, Route } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EngageCourse {
  courseId: string;
  title: string;
  /** 0–100, or null when the course doesn't report one (SCORM). */
  progress: number | null;
  started: boolean;
  /** Player / reader URL, or the course page when it has no content yet. */
  href: string;
}

export interface EngagePathway {
  id: string;
  title: string;
  description: string | null;
  accentColor: string | null;
  courseCount: number;
}

export interface OpenPosting {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  deadline: Date | null;
}

const PILLARS = {
  engage: { label: "ENGAGE", tagline: "Train and certify", text: "text-brand-700", bar: "bg-brand-600", link: "text-brand-700" },
  experience: { label: "EXPERIENCE", tagline: "Get industry-ready", text: "text-amber-800", bar: "bg-amber-600", link: "text-amber-800" },
} as const;
type Pillar = keyof typeof PILLARS;

export function EngageColumn({
  balance, used, awardTotal, inProgress, completed, certificates, courses, pathways,
}: {
  balance: number;
  used: number;
  awardTotal: number;
  inProgress: number;
  completed: number;
  certificates: number;
  courses: EngageCourse[];
  pathways: EngagePathway[];
}) {
  const pct = awardTotal > 0 ? Math.min(100, Math.max(0, (used / awardTotal) * 100)) : 0;
  return (
    <div className="space-y-4 min-w-0" data-pillar-column="engage">
      <PillarHeading pillar="engage" />

      <Panel title="Credit tracker" link={{ label: "My credits", href: "/credits" }} pillar="engage">
        <BigStat label="Credits remaining" value={balance} />
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-raised overflow-hidden">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold tabular-nums text-subtle">
            <span>{used.toLocaleString()} used</span>
            <span>{awardTotal.toLocaleString()} awarded</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-line pt-4">
          <MiniStat label="In progress" value={inProgress} />
          <MiniStat label="Completed" value={completed} />
          <MiniStat label="Certificates" value={certificates} />
        </div>
      </Panel>

      <Panel title="Your courses" link={{ label: "My Courses", href: "/progress" }} pillar="engage">
        {courses.length === 0 ? (
          <p className="text-sm text-muted">
            You aren&apos;t enrolled in a course yet.{" "}
            <Link href="/courses" className="font-semibold text-brand-700 hover:underline">Browse courses</Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {courses.map((c) => (
              <li key={c.courseId} className="flex items-center gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/courses/${c.courseId}`} className="block text-sm font-semibold text-fg truncate hover:text-brand-700">
                    {c.title}
                  </Link>
                  <div className="mt-1.5 flex items-center gap-2">
                    {c.progress !== null && (
                      <div className="h-1.5 flex-1 rounded-full bg-raised overflow-hidden">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.round(c.progress)}%` }} />
                      </div>
                    )}
                    <span className="text-[11px] tabular-nums text-subtle shrink-0">
                      {!c.started ? "Not started" : c.progress === null ? "In progress" : `${Math.round(c.progress)}%`}
                    </span>
                  </div>
                </div>
                <Link
                  href={c.href}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  <Play size={12} aria-hidden /> {c.started ? "Resume" : "Start"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {pathways.length > 0 && (
        <Panel title="Open for enrolment" link={{ label: "All pathways", href: "/pathways" }} pillar="engage">
          <ul className="space-y-2">
            {pathways.map((pw) => (
              <li key={pw.id}>
                <Link
                  href={`/pathways/${pw.id}`}
                  className="flex items-start gap-3 rounded-xl border border-line p-3 hover:border-brand-200 transition-colors"
                >
                  {/* The pathway's own colour code, as on /pathways. Inline
                      style because it is data, not a token. */}
                  <span aria-hidden className="mt-1 w-1 h-8 rounded-full shrink-0" style={{ background: pw.accentColor ?? "var(--brand-600)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <Route size={13} className="text-subtle shrink-0" aria-hidden />
                      <span className="text-sm font-semibold text-fg truncate">{pw.title}</span>
                    </span>
                    {pw.description && <span className="mt-0.5 text-xs text-muted line-clamp-2">{pw.description}</span>}
                    <span className="mt-1 block text-[11px] text-subtle tabular-nums">
                      {pw.courseCount} {pw.courseCount === 1 ? "course" : "courses"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

export function ExperienceColumn({
  profileViews, windowDays, interviewsDone, postings,
}: {
  profileViews: number;
  windowDays: number;
  interviewsDone: number;
  postings: OpenPosting[];
}) {
  return (
    <div className="space-y-4 min-w-0" data-pillar-column="experience">
      <PillarHeading pillar="experience" />

      <Panel title="Where you stand" link={{ label: "My applications", href: "/profile/applications" }} pillar="experience">
        <div className="grid grid-cols-2 gap-4">
          <BigStat label="Profile views" value={profileViews} caption={`in the past ${windowDays} days`} />
          <BigStat label="Interviews done" value={interviewsDone} caption="so far" />
        </div>
        <p className="mt-4 text-xs text-muted leading-relaxed">
          Views count employers who opened your talent-pool profile, an application or your resume.{" "}
          <Link href="/interviews" className="font-semibold text-amber-800 hover:underline">My interviews</Link>
        </p>
      </Panel>

      <Panel title="Upcoming opportunities" link={{ label: "All postings", href: "/internships" }} pillar="experience">
        {postings.length === 0 ? (
          <p className="text-sm text-muted">
            No open postings right now. New roles appear here as host companies post them.
          </p>
        ) : (
          <ul className="space-y-2">
            {postings.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/internships/${p.id}`}
                  className="flex items-start gap-3 rounded-xl border border-line p-3 hover:border-amber-300 transition-colors"
                >
                  <Briefcase size={14} className="mt-0.5 text-amber-800 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg truncate">{p.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span className="truncate">{p.companyName}</span>
                      {p.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} aria-hidden /> {p.location}
                        </span>
                      )}
                      {p.deadline && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock size={11} aria-hidden /> Apply by {formatDay(p.deadline)}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function PillarHeading({ pillar }: { pillar: Pillar }) {
  const p = PILLARS[pillar];
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className={cn("h-5 w-1 rounded-full", p.bar)} />
      {/* Styled on the span: globals.css styles h1–h3 unlayered, which
          beats utilities on the heading itself. */}
      <h2 className="text-sm leading-normal">
        <span className={cn("font-sans font-bold tracking-[0.2em]", p.text)}>{p.label}</span>
      </h2>
      <span className="text-xs text-subtle">{p.tagline}</span>
    </div>
  );
}

function Panel({
  title, link, pillar, children,
}: {
  title: string;
  link: { label: string; href: string };
  pillar: Pillar;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5" aria-label={title}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-[12px] uppercase tracking-[0.2em] font-bold text-subtle">{title}</p>
        <Link
          href={link.href}
          className={cn("inline-flex items-center gap-1 text-xs font-semibold hover:underline shrink-0", PILLARS[pillar].link)}
        >
          {link.label} <ArrowRight size={12} aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}

function BigStat({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-subtle">{label}</p>
      <p className="mt-0.5 text-3xl font-bold tabular-nums text-fg leading-none">{value.toLocaleString()}</p>
      {caption && <p className="mt-1 text-[11px] text-subtle">{caption}</p>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-subtle">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-fg leading-none">{value.toLocaleString()}</p>
    </div>
  );
}

/** A deadline is a calendar date stored at UTC midnight; format it in UTC
 *  or Toronto would show the day before. */
function formatDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(d);
}
