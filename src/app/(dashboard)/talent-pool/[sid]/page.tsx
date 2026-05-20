import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Mail, User, Lock, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canComment, isCommentable } from "@/lib/talent-pool/comments";
import { answerFields, type FormField } from "@/lib/forms/types";
import { ApplicationCommentThread } from "@/components/talent-pool/ApplicationCommentThread";

/**
 * /talent-pool/[sid] — full applicant view + comment thread.
 * Shared between admin and employer roles. The comment thread
 * component handles its own role-aware visibility + the
 * eligibility gate; this page just renders the data.
 */
export default async function TalentPoolDetailPage({
  params,
}: {
  params: Promise<{ sid: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "";
  const userId = (session.user as { id?: string }).id ?? "";
  if (!canComment(role)) redirect("/dashboard");

  const { sid } = await params;

  const submission = await prisma.eventFormSubmission.findUnique({
    where: { id: sid },
    include: {
      form: { select: { slug: true, title: true, fields: true } },
      user: {
        select: {
          id: true, name: true, email: true, organization: true, jobTitle: true,
          resumeUrl: true, videoIntroUrl: true,
        },
      },
    },
  });
  if (!submission || submission.form.slug !== "talent-application") notFound();

  // Eligibility gate — direct-URL access for employers must still
  // respect the second admit gate. Admins / instructors keep full
  // visibility so they can verify and approve.
  if (role === "employer" && !submission.eligibilityApprovedAt) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/talent-pool" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={12} /> Back to talent pool
        </Link>
        <div className="bg-rose-50 ring-1 ring-rose-200 rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-rose-800 mb-1">
            This member isn&apos;t eligible for employer view yet.
          </p>
          <p className="text-[12.5px] text-rose-700 leading-relaxed max-w-[58ch] mx-auto">
            Their talent application is in the pool but awaiting an admin&apos;s eligibility approval.
            You&apos;ll see them here once they&apos;re cleared for employer review.
          </p>
        </div>
      </div>
    );
  }

  // Employers can only view in-pool entries; admins can view all
  // statuses (so they can debug pending submissions). Trainees
  // are already redirected by the role gate above.
  if (role === "employer" && (submission.leftPoolAt !== null || !isCommentable(submission.reviewStatus))) {
    notFound();
  }

  const fields = submission.form.fields as unknown as FormField[];
  const answerable = answerFields(fields);
  const data = submission.data as Record<string, string | string[]>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        href="/talent-pool"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Talent pool
      </Link>

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Talent application
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
            <User size={22} className="text-brand-600" />
            {submission.user?.name ?? <span className="italic text-muted">No name</span>}
          </h1>
          <p className="text-sm text-muted mt-2 inline-flex items-center gap-2">
            <Mail size={12} />
            <a href={`mailto:${submission.user?.email ?? submission.email}`} className="hover:text-fg">
              {submission.user?.email ?? submission.email ?? "—"}
            </a>
          </p>
          {(submission.user?.jobTitle || submission.user?.organization) && (
            <p className="text-xs text-subtle mt-0.5">
              {submission.user?.jobTitle}{submission.user?.jobTitle && submission.user?.organization && " · "}{submission.user?.organization}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-muted shrink-0">
          <p>Submitted {new Date(submission.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</p>
          {isCommentable(submission.reviewStatus) ? (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-emerald-50 text-emerald-800 ring-emerald-200">
              <ShieldCheck size={10} /> Eligibility approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset bg-amber-50 text-amber-800 ring-amber-200">
              <Lock size={10} /> Pending review
            </span>
          )}
        </div>
      </header>

      {/* Application data — read-only display of every answerable field. */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle">Application</h2>
        <dl className="divide-y divide-line">
          {answerable.map((f) => {
            const raw = data[f.id];
            const txt = Array.isArray(raw) ? raw.join(", ") : (raw ?? "");
            if (!txt) return null;
            const isUrl = typeof txt === "string" && /^https?:\/\//.test(txt);
            return (
              <div key={f.id} className="py-2.5 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-3">
                <dt className="text-xs font-bold text-subtle uppercase tracking-wider">{f.label}</dt>
                <dd className="text-sm text-fg leading-snug">
                  {isUrl ? (
                    <a href={txt} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                      {txt}
                    </a>
                  ) : (
                    <span className="whitespace-pre-wrap">{txt}</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {/* Comment thread — gated by review status. */}
      <ApplicationCommentThread
        submissionId={submission.id}
        myUserId={userId}
        myRole={role}
      />
    </div>
  );
}
