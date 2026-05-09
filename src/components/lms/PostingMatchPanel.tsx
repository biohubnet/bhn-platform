"use client";
/**
 * Skill-match panel for the posting detail page. Three states:
 *
 *   1. Posting has skill-ontology mappings + trainee has skills →
 *      show numeric score + matched/missing breakdown.
 *   2. Posting has mappings but trainee has no skills → "complete
 *      your profile" prompt with a CTA to /profile/skills.
 *   3. Posting has no skill-ontology mappings (older posting created
 *      before the skill-tagging batch shipped) → minimal "match data
 *      not yet available" hint with a fallback CTA so we don't
 *      render an empty panel.
 *
 * The numeric score (0..100) comes from scoreMatch() in lib/skills/
 * ontology — the same primitive the dashboard SkillGapWidget uses,
 * so the two surfaces stay in sync.
 */
import Link from "next/link";
import { Sparkles, ArrowRight, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchResult {
  score: number;        // 0..100
  matched: number;      // count of posting-skills the trainee has
  missingRequired: string[]; // skillIds the trainee lacks for required skills
}

interface PostingSkillLite {
  skillId: string;
  name: string;
  required: boolean;
}

export function PostingMatchPanel({
  haveOntologyMapping,
  match,
  postingSkills,
  mySkillCount,
}: {
  haveOntologyMapping: boolean;
  match: MatchResult | null;
  postingSkills: PostingSkillLite[];
  mySkillCount: number;
}) {
  // No ontology mapping yet — older posting; render a soft hint, not
  // a blank slot.
  if (!haveOntologyMapping) {
    return (
      <div className="rounded-xl border border-line bg-elevated/40 px-4 py-3 text-sm text-muted inline-flex items-center gap-2">
        <Sparkles size={13} className="text-subtle" />
        <span>Match score isn&apos;t available for this posting yet — but you can still apply or save.</span>
      </div>
    );
  }

  // Trainee has no skills profile. Same shape as the listing-page
  // banner so the experience is consistent.
  if (mySkillCount === 0) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3.5">
        <p className="text-sm font-medium text-brand-900 inline-flex items-center gap-1.5">
          <Sparkles size={13} /> Add skills to see your match
        </p>
        <p className="text-xs text-brand-800/80 mt-1">
          Right now we don&apos;t know what you can do, so we can&apos;t score you against this posting.
          Add a few skills (or upload your resume) and we&apos;ll show your fit + the gaps.
        </p>
        <Link
          href="/profile/skills"
          className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
        >
          Open My Skills <ArrowRight size={11} />
        </Link>
      </div>
    );
  }

  if (!match) return null;

  const tone =
    match.score >= 75 ? "good" :
    match.score >= 45 ? "ok" :
    "low";
  const matchedSkills = postingSkills.filter((s) =>
    !match.missingRequired.includes(s.skillId),
  );
  const missingSkills = postingSkills.filter((s) =>
    match.missingRequired.includes(s.skillId),
  );

  return (
    <div className="rounded-xl border border-line p-4 bg-card">
      <div className="flex items-center gap-4">
        {/* Score gauge */}
        <div className="shrink-0 relative">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg",
              tone === "good"   && "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200",
              tone === "ok"     && "bg-amber-100   text-amber-800   ring-1 ring-inset ring-amber-200",
              tone === "low"    && "bg-rose-100    text-rose-800    ring-1 ring-inset ring-rose-200",
            )}
          >
            {match.score}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">
            Your match
          </p>
          <p className="text-sm text-fg leading-snug mt-0.5">
            You match <strong>{match.matched}</strong> of{" "}
            <strong>{postingSkills.length}</strong> required skills
            {match.missingRequired.length > 0 && (
              <> — <strong>{match.missingRequired.length}</strong> required skill{match.missingRequired.length === 1 ? "" : "s"} to close</>
            )}
            .
          </p>
        </div>
      </div>

      {(matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-line">
          {matchedSkills.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-1.5 inline-flex items-center gap-1">
                <Check size={11} /> Skills you have
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((s) => (
                  <span
                    key={s.skillId}
                    className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/70"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {missingSkills.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold mb-1.5 inline-flex items-center gap-1">
                <AlertCircle size={11} /> Gaps
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((s) => (
                  <span
                    key={s.skillId}
                    className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200/70"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
              <Link
                href="/courses?intent=close-gaps"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Find courses to close these <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
