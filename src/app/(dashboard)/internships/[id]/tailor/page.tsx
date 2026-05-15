import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Wand2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTailorState } from "@/lib/tailor/types";
import { TailorClient } from "@/components/tailor/TailorClient";

/**
 * /internships/[id]/tailor — interactive resume-tailoring loop.
 *
 * Walks the trainee through:
 *   1. Parse JD → list of requirements
 *   2. Initial gap assessment (met / partial / missing) per requirement
 *   3. Per-gap input loop — user types specific evidence per gap
 *   4. Re-assess + hiring-manager verdict (yes / maybe / no)
 *   5. Loop until the verdict is "yes" or the user calls it done
 *
 * State lives in PrepSession.state.tailor (no schema change). The
 * page server-renders the existing state if any so a returning user
 * lands on their last round; everything interactive is in the
 * client.
 */
export const dynamic = "force-dynamic";

export default async function TailorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/internships/${id}/tailor`)}`);
  }
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, resumeUrl: true, elevatorPitch: true, bio: true },
  });
  if (!me) redirect("/login");

  const posting = await prisma.internshipPosting.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      companyName: true,
      positionDetails: true,
      status: true,
    },
  });
  if (!posting) notFound();

  const session_ = await prisma.prepSession.findUnique({
    where: { userId_postingId: { userId: me.id, postingId: id } },
    select: { state: true },
  });
  const baseState = (session_?.state as Record<string, unknown> | null) ?? {};
  const tailor = loadTailorState(baseState.tailor);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <Link
          href={`/internships/${id}`}
          className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={12} /> Back to posting
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight inline-flex items-center gap-2">
          <Wand2 size={22} className="text-brand-600" />
          Tailor your application
        </h1>
        <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed">
          We&apos;ll parse <strong className="text-fg">{posting.title}</strong>{" "}
          at <strong className="text-fg">{posting.companyName}</strong> into
          a list of requirements, score your current materials against each
          one, and walk you through closing the gaps. A simulated hiring
          manager gives a yes/no/maybe verdict at the end of every round —
          you keep iterating until you land at &quot;yes&quot;.
        </p>
      </header>

      <TailorClient
        postingId={id}
        postingTitle={posting.title}
        companyName={posting.companyName}
        applicantHasMaterials={!!(me.bio || me.elevatorPitch || me.resumeUrl)}
        initialState={tailor}
      />
    </div>
  );
}
