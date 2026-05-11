import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostingsTable } from "@/components/employer/PostingsTable";

/**
 * Employer's own internship postings. Filters by createdById so each
 * employer only sees their own; admins see everything.
 *
 * This page is a fast triage queue. Interactive bits — checkboxes,
 * status cycling, bulk actions — live in <PostingsTable> as a
 * client component. Edit happens on the per-posting detail page at
 * /employer/postings/[id], not here.
 */
export default async function EmployerPostings() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const userId = (session!.user as { id?: string }).id ?? null;
  if (role !== "employer" && !["admin", "superadmin"].includes(role)) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }

  const isAdminLike = role === "admin" || role === "superadmin";
  const postings = await prisma.internshipPosting.findMany({
    where: isAdminLike ? {} : { createdById: userId ?? "_" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      location: true,
      status: true,
      createdAt: true,
      deadline: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <Link
            href="/employer"
            className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={12} /> Employer overview
          </Link>
          <h1 className="text-2xl font-bold text-fg">My internship postings</h1>
          <p className="text-sm text-muted mt-0.5">
            {postings.length} {postings.length === 1 ? "posting" : "postings"}
          </p>
        </div>
        <Link
          href="/admin/internships/new"
          className="text-sm px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 inline-flex items-center gap-2 font-medium shadow-sm shadow-brand-600/25"
        >
          <Plus size={14} /> New posting
        </Link>
      </div>

      <PostingsTable
        postings={postings.map((p) => ({
          id: p.id,
          title: p.title,
          location: p.location,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
          deadline: p.deadline?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
