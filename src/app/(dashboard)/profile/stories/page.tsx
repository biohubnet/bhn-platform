import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Plus, ArrowRight, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StoryBankClient } from "@/components/prep/StoryBankClient";

/**
 * /profile/stories — reusable STAR Story Bank.
 *
 * Surfaces every StarStory the trainee has authored, with inline
 * edit + delete. The bank is the source of truth — when a trainee
 * polishes a STAR draft in the prep flow and clicks "Save to Bank",
 * the story lives here. A future prep session for a new posting can
 * pick from the bank rather than starting from scratch.
 *
 * Privacy: stories are user-private. No employer or admin can see
 * the contents of a trainee's Story Bank. (Admin can see metadata
 * via /admin/audit for moderation purposes, but the body text isn't
 * surfaced anywhere outside this page.)
 */
export const dynamic = "force-dynamic";

export default async function StoryBankPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=%2Fprofile%2Fstories");
  const userId = (session.user as { id?: string }).id ?? null;
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (!userId) redirect("/login?callbackUrl=%2Fprofile%2Fstories");

  const traineeRoles = ["trainee", "evaluating", "instructor", "admin", "superadmin"];
  if (!traineeRoles.includes(role)) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <h1 className="text-xl font-bold text-fg">Not for your role</h1>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
            The Story Bank is for trainees — a private library of STAR-format
            stories you've authored during application prep.
          </p>
        </div>
      </div>
    );
  }

  const stories = await prisma.starStory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      skills: { include: { skill: { select: { id: true, name: true } } } },
      source: { select: { id: true, title: true, companyName: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Profile · Story Bank
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight mt-1 inline-flex items-center gap-2">
          <BookOpen size={22} className="text-brand-600" />
          Your STAR stories
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          STAR-format stories you've drafted. Reusable across postings — a
          story tagged with "cell culture" works for any role that needs it.
          New stories land here when you click <em>Save to Story Bank</em>{" "}
          in the prep flow.
        </p>
      </header>

      {stories.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-8 text-center surface-shadow">
          <Sparkles size={20} className="text-brand-600 mx-auto" />
          <p className="text-sm font-semibold text-fg mt-2">No stories yet</p>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto leading-snug">
            Find a posting you'd like to apply to, click <strong>Prepare for
            this posting</strong>, walk through to Step 4, and save your first
            STAR story here.
          </p>
          <Link
            href="/internships"
            className="inline-flex items-center gap-2 mt-5 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700"
          >
            Browse internships <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <StoryBankClient
          initialStories={stories.map((s) => ({
            id: s.id,
            title: s.title,
            situation: s.situation,
            task: s.task,
            action: s.action,
            result: s.result,
            tags: s.tags,
            skills: s.skills.map((ss) => ({ id: ss.skill.id, name: ss.skill.name })),
            source: s.source
              ? { id: s.source.id, title: s.source.title, companyName: s.source.companyName }
              : null,
            updatedAt: s.updatedAt.toISOString(),
          }))}
        />
      )}

      <div className="rounded-2xl border border-dashed border-line bg-card p-4 text-xs text-muted leading-relaxed">
        <p className="font-bold text-fg mb-1 inline-flex items-center gap-1.5">
          <Plus size={12} /> Add more stories
        </p>
        STAR stories live in the prep flow at <code className="font-mono bg-elevated px-1 rounded">/internships/[id]/prepare</code> → Step 4. Open a
        posting, scaffold a story for a skill, save it, and it'll appear
        here. Stories are private to you — no employer or admin sees the body.
      </div>
    </div>
  );
}
