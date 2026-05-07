import Link from "next/link";
import { ArrowLeft, Users2, Paperclip, Video, Mail, Calendar } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Read-only roster of talent applications, scoped to employer view.
 *  Stub for the full ATS — saved/shortlist/interview status comes next. */
export default async function EmployerApplicants() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  if (role !== "employer" && !["admin", "superadmin"].includes(role)) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }

  const form = await prisma.eventForm.findUnique({
    where: { slug: "talent-application" },
    select: { id: true },
  });
  const applicants = form
    ? await prisma.eventFormSubmission.findMany({
        where: { formId: form.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/employer"
          className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={12} /> Employer overview
        </Link>
        <h1 className="text-2xl font-bold text-fg">Talent applicants</h1>
        <p className="text-sm text-muted mt-0.5">
          {applicants.length} {applicants.length === 1 ? "applicant" : "applicants"} · sorted by most recent
        </p>
      </div>

      {applicants.length === 0 ? (
        <div className="bg-card border border-line rounded-2xl p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
            <Users2 size={20} />
          </div>
          <p className="font-medium text-muted">No applications yet</p>
          <p className="text-sm text-muted mt-1">Once candidates submit the talent application, they'll show up here for review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applicants.map((s) => {
            const data = s.data as Record<string, string | string[]>;
            const firstName = String(data.first_name ?? "").trim();
            const lastName = String(data.last_name ?? "").trim();
            const initials = ((firstName[0] ?? "?") + (lastName[0] ?? "")).toUpperCase();
            const role = String(data.title_position ?? data.current_position ?? "").trim();
            const skills = Array.isArray(data.locations) ? data.locations : [];
            const pitch = String(data.pitch ?? "").trim();
            const hasResume = typeof data.resume === "string" && data.resume.length > 0;
            const hasVideo = typeof data.video === "string" && data.video.length > 0;
            return (
              <article
                key={s.id}
                className="bg-card border border-line rounded-2xl p-5 flex gap-5 items-start"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-fg leading-tight">
                        {firstName || "Anonymous"} {lastName}
                      </h2>
                      {role && <p className="text-xs text-subtle mt-0.5">{role}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted shrink-0">
                      {hasResume && (
                        <a
                          href={data.resume as string}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 hover:text-brand-700"
                        >
                          <Paperclip size={11} /> Resume
                        </a>
                      )}
                      {hasVideo && (
                        <a
                          href={data.video as string}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 hover:text-brand-700"
                        >
                          <Video size={11} /> 1-min video
                        </a>
                      )}
                      {s.email && (
                        <a
                          href={`mailto:${s.email}`}
                          className="inline-flex items-center gap-1 hover:text-brand-700"
                        >
                          <Mail size={11} /> Contact
                        </a>
                      )}
                    </div>
                  </div>
                  {pitch && (
                    <p className="text-sm text-muted line-clamp-3 mt-3 leading-relaxed">{pitch}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                    {skills.slice(0, 5).map((sk) => (
                      <span key={sk} className="px-2 py-0.5 rounded-full bg-elevated text-muted border border-line">
                        {sk}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-subtle">
                    <Calendar size={11} /> Applied {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8 bg-elevated/50 border border-dashed border-line rounded-2xl p-6 text-sm text-muted">
        <p className="font-semibold text-fg mb-1">ATS workflow coming next</p>
        <p>
          Save / Shortlist / Interview / Hired status flows, candidate notes, side-by-side comparison, and Calendly-style interview booking will land here. For now this view is read-only — use the contact link to reach candidates directly.
        </p>
      </div>
    </div>
  );
}
