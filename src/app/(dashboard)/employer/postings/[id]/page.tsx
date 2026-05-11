import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Users2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostingEditor } from "@/components/employer/PostingEditor";

/**
 * /employer/postings/[id] — the canonical posting page.
 *
 * Edit lives here (instead of on the listing) so the listing can be
 * a fast queue view for triage + bulk actions, and the per-posting
 * page is the place to do full edits. Both employers and admins
 * land here; non-owners get a 404.
 */
export default async function EmployerPostingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const userId = (session.user as { id?: string }).id ?? null;
  const isAdmin = role === "admin" || role === "superadmin";
  if (role !== "employer" && !isAdmin) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }

  const { id } = await params;
  const posting = await prisma.internshipPosting.findUnique({ where: { id } });
  if (!posting) notFound();

  // Ownership gate. Non-admin employers can only manage their own
  // postings; admins see everything.
  if (!isAdmin && posting.createdById !== userId) notFound();

  // Count applicants so the "View applicants" link can show a number.
  const applicantCount = await prisma.applicationStatus.count({
    where: { postingId: id },
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <Link
            href="/employer/postings"
            className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={12} /> All postings
          </Link>
          <h1 className="text-2xl font-bold text-fg tracking-tight">{posting.title}</h1>
          <p className="text-sm text-muted mt-0.5">
            Posted {posting.createdAt.toLocaleDateString()} · last edited {posting.updatedAt.toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/employer/postings/${id}/applicants`}
          className="text-sm px-3 py-2 rounded-lg bg-card border border-line text-fg hover:bg-elevated inline-flex items-center gap-2 font-semibold"
        >
          <Users2 size={14} />
          Applicants {applicantCount > 0 && <span className="text-brand-700">({applicantCount})</span>}
        </Link>
      </div>

      <PostingEditor
        posting={{
          id: posting.id,
          companyName: posting.companyName,
          website: posting.website,
          title: posting.title,
          duration: posting.duration,
          hours: posting.hours,
          location: posting.location,
          type: posting.type,
          compensation: posting.compensation,
          deadline: posting.deadline?.toISOString() ?? null,
          keySkills: posting.keySkills,
          positionDetails: posting.positionDetails,
          status: posting.status,
          contactEmail: posting.contactEmail,
          contactName: posting.contactName,
          contactPhone: posting.contactPhone,
        }}
      />
    </div>
  );
}
