/**
 * /mentor/trainees — discovery index for staff reviewers.
 *
 * Lists trainees so an instructor / industrial mentor / admin can jump
 * straight into /resume/[userId] and comment on their structured
 * resume. Sorted by most-recently-edited resume first so reviewers
 * see the trainees who've been actively iterating.
 *
 * Gated to staff roles. Employers see their applicants via the
 * postings board, not here.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, MessageCircle, UserRound, Clock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { isStaffReviewer } from "@/lib/resume/permissions";

export const dynamic = "force-dynamic";

export default async function MentorTraineesPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/mentor/trainees");
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (!isStaffReviewer(role)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-base font-semibold text-rose-900">Staff only.</h1>
          <p className="text-sm text-rose-800/80 mt-2">
            This index is for industrial mentors, instructors, and admins
            reviewing trainees&apos; structured resumes.
          </p>
        </div>
      </div>
    );
  }

  // Pull every trainee who has a structured resume row (i.e. has at
  // least visited /profile/resume once). The Resume row scaffolds on
  // first visit, so this is effectively "trainees engaged with the
  // resume feature." Order by lastEditedAt so the people actively
  // iterating bubble to the top.
  const resumes = await prisma.resume.findMany({
    take: 200,
    orderBy: { lastEditedAt: "desc" },
    select: {
      id: true,
      userId: true,
      version: true,
      lastEditedAt: true,
      parsedAt: true,
      user: {
        select: { id: true, name: true, email: true, role: true, resumeUrl: true },
      },
      _count: { select: { comments: true } },
    },
  });

  // Open-comment counts per resume — separate query so the include
  // tree above stays cheap, and we can filter by status here.
  const openCounts = await prisma.resumeComment.groupBy({
    by: ["resumeId"],
    where: { status: "open" },
    _count: { _all: true },
  });
  const openById = new Map<string, number>();
  for (const row of openCounts) {
    openById.set(row.resumeId, row._count._all);
  }

  // Filter to actual trainees — staff resumes from seeding pollute
  // the list otherwise.
  const rows = resumes.filter((r) => r.user.role === "trainee");

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><UserRound size={11} /> Mentor · Trainee resumes</>}
        title="Trainee resumes"
        description="Open a trainee's structured resume to comment on specific bullets. They control what to apply — comments are visible inline, with Apply / Resolved buttons on their side."
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card-solid p-8 text-center">
            <p className="text-sm text-fg-muted">No trainees have started their structured resume yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-card-solid overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background/40 border-b border-line">
                <tr className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle">
                  <th className="text-left px-4 py-2.5">Trainee</th>
                  <th className="text-left px-3 py-2.5">Comments</th>
                  <th className="text-left px-3 py-2.5">Version</th>
                  <th className="text-left px-3 py-2.5">Last edited</th>
                  <th className="text-right px-4 py-2.5">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const open = openById.get(r.id) ?? 0;
                  const totalComments = r._count.comments;
                  return (
                    <tr key={r.id} className="border-t border-line/60 hover:bg-background/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-fg">{r.user.name ?? r.user.email}</div>
                        <div className="text-[11px] text-fg-subtle">{r.user.email}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        {totalComments === 0 ? (
                          <span className="text-[11px] text-fg-subtle italic">none</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <MessageCircle size={11} className="text-fg-muted" />
                            <span className="font-medium">{totalComments}</span>
                            {open > 0 && (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200">
                                {open} open
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-fg-muted tabular-nums">
                        v{r.version}{r.parsedAt && <span className="ml-1 text-[10px] text-brand-700">· parsed</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-fg-muted inline-flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(r.lastEditedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/resume/${r.userId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100 text-[11px] font-semibold"
                        >
                          <FileText size={11} /> Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
