import Link from "next/link";
import { Briefcase, MapPin, Clock, Calendar, ArrowRight, Plus, Sparkles } from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { Badge } from "@/components/ui/Badge";

export default async function InternshipsPage() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const userId = (session!.user as { id?: string }).id ?? null;
  const isStaff = checkIsStaff(role);
  const isTrainee = role === "trainee" || role === "evaluating";

  // Posting list + trainee skill-count run in parallel. The skill
  // count gates a "complete your profile" nudge so a fresh trainee
  // browsing internships understands why they don't see match scores
  // and what to do about it.
  const [postings, mySkillCount] = await Promise.all([
    prisma.internshipPosting.findMany({
      where: isStaff ? {} : { status: "active" },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    isTrainee && userId
      ? prisma.userSkill.count({ where: { userId } })
      : Promise.resolve<number | null>(null),
  ]);

  const showProfileNudge = isTrainee && mySkillCount === 0 && postings.length > 0;

  return (
    <div>
      <PageHero
        eyebrow={<><Briefcase size={11} /> Industry placements</>}
        title="Internship opportunities"
        description="Open internships and co-op postings from BioHubNet's industry partners. Apply directly with the contact on each posting."
        tone="brand"
        actions={
          isStaff ? (
            <Link
              href="/admin/internships/new"
              className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-md transition-colors"
            >
              <Plus size={14} /> New posting
            </Link>
          ) : null
        }
      />

      <div>
        {showProfileNudge && (
          <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl border border-brand-200 bg-brand-50/60">
            <span className="mt-0.5 inline-flex w-7 h-7 rounded-md bg-brand-100 text-brand-700 items-center justify-center shrink-0">
              <Sparkles size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-900">
                Add skills to your profile to see match scores
              </p>
              <p className="text-xs text-brand-800/80 mt-0.5">
                Right now we don&apos;t know what you can do, so every posting looks the same. Add a few skills (or upload your resume) and we&apos;ll surface postings where you&apos;re a strong fit and the courses that close any gaps.
              </p>
            </div>
            <Link
              href="/profile/skills"
              className="shrink-0 self-start text-xs font-medium text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-brand-200 bg-white hover:bg-brand-50"
            >
              Open My Skills <ArrowRight size={11} />
            </Link>
          </div>
        )}
        {postings.length === 0 ? (
          <div className="bg-card rounded-2xl border border-line p-16 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <Briefcase size={20} />
            </div>
            <p className="font-medium text-muted">No open postings right now</p>
            <p className="text-sm text-muted mt-1">
              {isStaff
                ? "Click New posting to add one — paste any job description and the AI will pre-fill the fields."
                : "Check back soon — new opportunities are added regularly."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {postings.map((p) => {
              const closed = p.status === "closed";
              const draft = p.status === "draft";
              return (
                <Link
                  key={p.id}
                  href={`/internships/${p.id}`}
                  className={`group bg-card rounded-2xl border border-line hover:border-brand-300 hover:shadow-md transition-all p-6 flex flex-col gap-4 ${
                    closed ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
                        {p.companyName}
                      </p>
                      <h2 className="font-semibold text-fg leading-tight mt-1 group-hover:text-brand-700 transition-colors">
                        {p.title}
                      </h2>
                    </div>
                    {draft && <Badge tone="warning">Draft</Badge>}
                    {closed && <Badge tone="neutral">Closed</Badge>}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
                    {p.location && (
                      <span className="inline-flex items-center gap-1"><MapPin size={11} /> {p.location}</span>
                    )}
                    {p.type && (
                      <span className="inline-flex items-center gap-1"><Briefcase size={11} /> {p.type}</span>
                    )}
                    {p.duration && (
                      <span className="inline-flex items-center gap-1"><Clock size={11} /> {p.duration}</span>
                    )}
                    {p.deadline && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} /> Apply by {p.deadline.toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {p.keySkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.keySkills.slice(0, 5).map((s) => (
                        <span
                          key={s}
                          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-elevated text-muted border border-line"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xs text-subtle">
                      Posted {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-medium text-brand-700 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      View posting <ArrowRight size={13} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
