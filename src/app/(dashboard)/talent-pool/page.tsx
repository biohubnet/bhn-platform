import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Search, ArrowRight, MessageCircle, Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canComment, isCommentable } from "@/lib/talent-pool/comments";

/**
 * /talent-pool — admin + employer + instructor view of approved
 * talent-application submissions. Submissions are listed in
 * reverse-chronological order; only those that have been admin-
 * approved AND haven't left the pool are visible (the
 * eligibility gate operates here, not just in the comment API).
 *
 * Per-row link goes to /talent-pool/[sid] for the full submission
 * + comment thread.
 */
export default async function TalentPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/talent-pool");
  const role = (session.user as { role?: string }).role ?? "";
  if (!canComment(role)) redirect("/dashboard");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const form = await prisma.eventForm.findUnique({
    where: { slug: "talent-application" },
    select: { id: true },
  });
  if (!form) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-muted">Talent application form not configured yet.</p>
      </div>
    );
  }

  const submissions = await prisma.eventFormSubmission.findMany({
    where: {
      formId: form.id,
      reviewStatus: { in: ["approved", "approved_skip_review"] },
      leftPoolAt: null,
      ...(q && {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { user: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true, organization: true, jobTitle: true } },
      _count: { select: { comments: true } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          {role === "employer" ? "Employer" : "Admin"} · Experience
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <Users size={22} className="text-brand-600" />
          Talent pool
          <span className="text-xs font-mono tabular-nums text-subtle">{submissions.length}</span>
        </h1>
        <p className="text-sm text-muted mt-2 max-w-3xl leading-snug">
          Approved talent-application submissions, ordered by most recent. Click
          any entry to view the full application and leave private comments
          (visible to admins + employers only — never to the applicant).
        </p>
      </header>

      <form action="/talent-pool" method="get" className="flex items-center gap-2">
        <label className="relative flex-1 max-w-sm">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            className="w-full bg-card border border-line rounded-xl pl-8 pr-3 py-2 text-sm"
          />
        </label>
        {q && (
          <Link href="/talent-pool" className="text-xs text-muted hover:text-fg">
            Clear
          </Link>
        )}
      </form>

      {submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
          <Users size={24} className="mx-auto text-muted mb-2" />
          <p className="text-sm font-medium text-muted">No matching members in the pool.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {submissions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/talent-pool/${s.id}`}
                className="block rounded-2xl border border-line bg-card hover:border-brand-300 transition-colors p-4 surface-shadow"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-fg">
                        {s.user?.name ?? <span className="italic text-muted">No name</span>}
                      </p>
                      {!isCommentable(s.reviewStatus) && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-amber-50 text-amber-800 ring-amber-200">
                          <Lock size={9} /> Comments locked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {s.user?.email ?? s.email ?? "—"}
                    </p>
                    {(s.user?.jobTitle || s.user?.organization) && (
                      <p className="text-[11px] text-subtle mt-0.5">
                        {s.user?.jobTitle}{s.user?.jobTitle && s.user?.organization && " · "}{s.user?.organization}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted shrink-0">
                    {s._count.comments > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle size={11} />
                        {s._count.comments}
                      </span>
                    )}
                    <span className="text-[11px] text-subtle">
                      {new Date(s.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <ArrowRight size={12} className="text-subtle" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
