/**
 * /profile/tailor — the AI Job-Tailoring workspace.
 *
 * Paste a job URL or JD → ATS detection + eligibility gates + gap
 * analysis → a grounded resume + cover (no invented facts) → a QA gate
 * + Strong/Partial/Gap scorecard → per-ATS file exports. Never submits.
 */
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import { JobTailorClient } from "@/components/profile/JobTailorClient";

export const dynamic = "force-dynamic";

export default async function JobTailorPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile/tailor");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Sparkles size={11} /> Profile · Job Tailor</>}
        title="Tailor an application"
        description="Paste a job link or the JD. AI detects the ATS, checks eligibility, runs an honest gap analysis against your master library, then drafts a grounded resume and cover letter — never inventing a fact. It QA-checks the result and you download the right files for that ATS. It never submits for you."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <JobTailorClient />
      </div>
    </div>
  );
}
