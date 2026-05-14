import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recommendQuestionsForPosting } from "@/lib/prep/library";
import { emptyState, type PrepSessionState } from "@/lib/prep/types";
import { PrepCoach } from "@/components/prep/PrepCoach";

/**
 * /internships/[id]/prepare — multi-step application-prep coach.
 *
 * Four steps walked through a top-level stepper:
 *
 *   1. Compare    — resume keyword analysis vs the JD.
 *   2. Gaps       — actionable tasks to close what's missing.
 *   3. Interview  — common-question drafts.
 *   4. STAR       — story-builder with fill-in scaffolding.
 *
 * State is persisted to PrepSession.state via the /api/prep/[id]
 * routes; the client component owns the editing surface. We
 * server-render the heavy stuff (posting, recommended questions,
 * synth resume) once and hand it to the client. No mid-page
 * client-side fetches for the first paint.
 */
export const dynamic = "force-dynamic";

export default async function PreparePostingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/internships/${id}/prepare`)}`);
  }
  const userId = (session.user as { id?: string }).id ?? null;
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/internships/${id}/prepare`)}`);
  }

  // Eligibility — same logic as /profile/matches. Employers don't
  // prepare for postings.
  const traineeRoles = ["trainee", "evaluating", "instructor", "admin", "superadmin"];
  if (!traineeRoles.includes(role)) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <h1 className="text-xl font-bold text-fg">Not for your role</h1>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
            The application-prep coach is for trainees and instructors. Your
            role doesn't carry a trainee profile.
          </p>
        </div>
      </div>
    );
  }

  const posting = await prisma.internshipPosting.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      companyName: true,
      positionDetails: true,
      keySkills: true,
      status: true,
      skills: { select: { skillId: true, required: true, skill: { select: { id: true, name: true } } } },
    },
  });
  if (!posting) notFound();
  if (posting.status === "draft") notFound();

  // Upsert the session (one row per user × posting).
  let prep = await prisma.prepSession.findUnique({
    where: { userId_postingId: { userId, postingId: id } },
  });
  if (!prep) {
    prep = await prisma.prepSession.create({
      data: {
        userId,
        postingId: id,
        state: emptyState() as unknown as object,
      },
    });
  }

  // Synth resume text from the user's profile artefacts.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      resumeUrl: true,
      elevatorPitch: true,
      bio: true,
      jobTitle: true,
      organization: true,
    },
  });
  const resumeSynth = synthResumeText({
    pitch: user?.elevatorPitch ?? null,
    bio: user?.bio ?? null,
    jobTitle: user?.jobTitle ?? null,
    organization: user?.organization ?? null,
  });

  // Existing STAR stories — for "you already have a story for this skill" hint.
  const existingStories = await prisma.starStory.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      skills: { select: { skillId: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  const recommended = recommendQuestionsForPosting(posting.keySkills);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <Link
        href={`/internships/${posting.id}`}
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Back to posting
      </Link>

      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Application prep · {posting.companyName}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight mt-1 inline-flex items-center gap-2 flex-wrap">
          <Sparkles size={22} className="text-brand-600" />
          Prepare for {posting.title}
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          A four-step coaching flow tailored to this posting. The AI surfaces
          gaps + scaffolding; you write the actual sentences. Your work saves
          automatically — come back any time. STAR stories you save here join
          your{" "}
          <Link href="/profile/stories" className="text-brand-700 hover:underline font-semibold">
            Story Bank
          </Link>{" "}
          and can be reused on the next posting.
        </p>
      </header>

      <PrepCoach
        postingId={posting.id}
        postingTitle={posting.title}
        postingKeySkills={posting.keySkills}
        postingSkills={posting.skills.map((ps) => ({
          id: ps.skill.id,
          name: ps.skill.name,
          required: ps.required ?? false,
        }))}
        initialPrep={{
          id: prep.id,
          currentStep: prep.currentStep,
          state: prep.state as unknown as PrepSessionState,
        }}
        resume={{
          url: user?.resumeUrl ?? null,
          synthText: resumeSynth,
        }}
        questions={recommended}
        existingStories={existingStories.map((s) => ({
          id: s.id,
          title: s.title,
          skillIds: s.skills.map((sk) => sk.skillId),
        }))}
      />
    </div>
  );
}

function synthResumeText(parts: {
  pitch: string | null;
  bio: string | null;
  jobTitle: string | null;
  organization: string | null;
}): string {
  const lines: string[] = [];
  if (parts.jobTitle) lines.push(`Current role: ${parts.jobTitle}`);
  if (parts.organization) lines.push(`Organisation: ${parts.organization}`);
  if (parts.pitch) lines.push(`\n${parts.pitch}`);
  if (parts.bio) lines.push(`\n${parts.bio}`);
  return lines.join("\n");
}
