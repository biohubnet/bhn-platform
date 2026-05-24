/**
 * /jobs/[id] — public posting detail page.
 *
 * No auth required. Returns 404 if the posting is not active.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, MapPin, Clock, Briefcase, Mail, ChevronRight, CalendarClock,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LogoMark } from "@/components/ui/Logo";

export const dynamic = "force-dynamic";

const TYPE_COLOURS: Record<string, string> = {
  Internship: "bg-brand/10 text-brand ring-brand/30",
  "Co-op":    "bg-violet-50 text-violet-700 ring-violet-200",
  "Full-time":"bg-emerald-50 text-emerald-700 ring-emerald-200",
  Contract:   "bg-amber-50 text-amber-700 ring-amber-200",
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const posting = await prisma.internshipPosting.findUnique({
    where:  { id },
    select: {
      id:             true,
      title:          true,
      companyName:    true,
      location:       true,
      type:           true,
      compensation:   true,
      hours:          true,
      duration:       true,
      keySkills:      true,
      positionDetails:true,
      deadline:       true,
      contactEmail:   true,
      status:         true,
    },
  });

  if (!posting || posting.status !== "active") notFound();

  const typeClass = posting.type
    ? (TYPE_COLOURS[posting.type] ?? "bg-elevated text-muted ring-line")
    : "bg-elevated text-muted ring-line";

  return (
    <div className="min-h-screen bg-page has-grain">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark size={28} />
          <p className="font-bold text-fg text-sm">
            BHN <span className="text-brand-600">Training</span>
          </p>
        </Link>
        <Link
          href="/login"
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand/90 transition-colors"
        >
          Sign in
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        {/* Back link */}
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg mb-6 transition-colors"
        >
          <ArrowLeft size={12} /> Back to all positions
        </Link>

        {/* ── Company header ───────────────────────────────────── */}
        <div className="rounded-2xl bg-card border border-line shadow-card-rest p-6 mb-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h1 className="text-2xl font-bold text-fg leading-snug">{posting.title}</h1>
              <p className="text-lg text-muted mt-0.5">{posting.companyName}</p>
            </div>
            {posting.type && (
              <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ring-1 ring-inset shrink-0 ${typeClass}`}>
                {posting.type}
              </span>
            )}
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-5">
            {posting.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} className="shrink-0" />
                {posting.location}
              </span>
            )}
            {posting.deadline && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={13} className="shrink-0" />
                Apply by {new Date(posting.deadline).toLocaleDateString(undefined, {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </span>
            )}
          </div>

          {/* 3-column info row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-line">
            {posting.duration && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-0.5">Duration</p>
                <p className="text-sm font-medium text-fg flex items-center gap-1.5">
                  <Clock size={13} className="text-muted shrink-0" /> {posting.duration}
                </p>
              </div>
            )}
            {posting.hours && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-0.5">Hours</p>
                <p className="text-sm font-medium text-fg flex items-center gap-1.5">
                  <Briefcase size={13} className="text-muted shrink-0" /> {posting.hours}
                </p>
              </div>
            )}
            {posting.compensation && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-0.5">Compensation</p>
                <p className="text-sm font-medium text-fg">{posting.compensation}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Key skills ───────────────────────────────────────── */}
        {posting.keySkills.length > 0 && (
          <div className="rounded-2xl bg-card border border-line shadow-card-rest p-5 mb-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-3">
              Key skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {posting.keySkills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-3 py-1 rounded-full bg-elevated border border-line text-fg"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Position details ─────────────────────────────────── */}
        {posting.positionDetails && (
          <div className="rounded-2xl bg-card border border-line shadow-card-rest p-5 mb-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-3">
              About the role
            </h2>
            <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap">
              {posting.positionDetails}
            </p>
          </div>
        )}

        {/* ── Apply CTA ────────────────────────────────────────── */}
        <div className="rounded-2xl bg-brand/5 border border-brand/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-base font-bold text-fg">Ready to apply?</p>
            <p className="text-sm text-muted mt-0.5">
              Your application goes directly to the hiring team at {posting.companyName}.
            </p>
          </div>
          <Link
            href={`/jobs/${posting.id}/apply`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand/90 transition-colors shrink-0"
          >
            Apply now <ChevronRight size={16} />
          </Link>
        </div>

        {/* Contact */}
        {posting.contactEmail && (
          <p className="mt-4 text-xs text-muted text-center">
            Questions? Email{" "}
            <a
              href={`mailto:${posting.contactEmail}`}
              className="font-medium text-brand hover:underline"
            >
              {posting.contactEmail}
            </a>
          </p>
        )}
      </main>
    </div>
  );
}
