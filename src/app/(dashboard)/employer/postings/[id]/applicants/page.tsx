import Link from "next/link";
import { ArrowLeft, Users2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ApplicantsKanban } from "@/components/employer/ApplicantsKanban";

export const dynamic = "force-dynamic";

export default async function PostingApplicants({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!me) redirect("/login");

  const posting = await prisma.internshipPosting.findUnique({
    where: { id },
    select: { id: true, title: true, companyName: true, createdById: true, status: true },
  });
  if (!posting) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">Posting not found.</p>
      </div>
    );
  }

  const allowed = me.role === "admin" || me.role === "superadmin"
    || (me.role === "employer" && posting.createdById === me.id);
  if (!allowed) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">You don&apos;t have access to this posting.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={me.role === "employer" ? "/employer/postings" : "/admin"}
          className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={12} /> All postings
        </Link>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Users2 size={20} className="text-brand-600" />
          Applicants — {posting.title}
        </h1>
        <p className="text-sm text-muted mt-1">
          {posting.companyName} · scored by skill overlap, drag through the funnel as you screen.
        </p>
      </div>

      <ApplicantsKanban postingId={posting.id} />
    </div>
  );
}
