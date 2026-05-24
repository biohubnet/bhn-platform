/**
 * /jobs/[id]/apply — public application form.
 *
 * No auth required, but if a session exists we prefill name + email.
 * Returns 404 if the posting is not active.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { LogoMark } from "@/components/ui/Logo";
import { JobApplicationForm } from "@/components/jobs/JobApplicationForm";

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [posting, session] = await Promise.all([
    prisma.internshipPosting.findUnique({
      where:  { id },
      select: { id: true, title: true, companyName: true, status: true },
    }),
    getSession(),
  ]);

  if (!posting || posting.status !== "active") notFound();

  const user = session?.user as { name?: string; email?: string } | undefined;
  const prefilledName  = user?.name  ?? undefined;
  const prefilledEmail = user?.email ?? undefined;

  return (
    <div className="min-h-screen bg-page has-grain">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark size={28} />
          <p className="font-bold text-fg text-sm">
            BHN <span className="text-brand-600">Training</span>
          </p>
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        {/* Back link */}
        <Link
          href={`/jobs/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg mb-6 transition-colors"
        >
          <ArrowLeft size={12} /> Back to posting
        </Link>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted mb-1">
            {posting.companyName}
          </p>
          <h1 className="text-2xl font-bold text-fg">{posting.title}</h1>
          <p className="text-sm text-muted mt-1">
            Fill in your details below. Your application goes directly to the hiring team.
          </p>
        </div>

        <JobApplicationForm
          postingId={posting.id}
          postingTitle={posting.title}
          companyName={posting.companyName}
          prefilledName={prefilledName}
          prefilledEmail={prefilledEmail}
        />
      </main>
    </div>
  );
}
