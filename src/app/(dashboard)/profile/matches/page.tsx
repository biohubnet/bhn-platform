import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles, ArrowRight, Briefcase, MapPin, Calendar, AlertCircle, Compass,
} from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rankPostingsForTrainee } from "@/lib/matching/fit";
import { FitExplain } from "@/components/matching/FitExplain";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";

/**
 * /profile/matches — trainee's personalised posting recommendations.
 *
 * Three states the page handles, in order of how much value it can
 * deliver:
 *
 *   1. **Healthy.** Trainee has ≥5 skills + active postings exist
 *      with PostingSkill tags. Render the ranked list with the
 *      expandable FitExplain panel per row.
 *
 *   2. **Thin profile.** Trainee has <5 skills. Show the ranked list
 *      anyway (it might still be useful) but lead with a "your
 *      profile is thin — confidence will be lower" banner pointing
 *      to /profile/skills.
 *
 *   3. **Empty profile.** Trainee has 0 skills. Block the matches
 *      surface entirely and route them to /profile/skills first —
 *      anything we'd render here would be noise.
 *
 * Surfaced via:
 *   • Sidebar (trainee/evaluating/instructor/admin/superadmin)
 *   • Posting detail page cross-prompt
 *   • Dashboard widget (future)
 *
 * Design notes:
 *   • Server-rendered. The fit computation runs once per page-load;
 *     we don't cache between requests yet. At Phase-1 traffic (sub-
 *     200 postings × handful of trainees) this is acceptable.
 *   • The page is force-dynamic — every reload re-scores, so adding a
 *     new skill is immediately reflected in the ranking.
 */
export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=%2Fprofile%2Fmatches");
  const userId = (session.user as { id?: string }).id ?? null;
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (!userId) redirect("/login?callbackUrl=%2Fprofile%2Fmatches");

  // Eligibility check — same logic the API uses. Employers + sponsors
  // get a polite "not for your role" instead of an empty page.
  const traineeRoles = ["trainee", "evaluating", "instructor", "admin", "superadmin"];
  if (!traineeRoles.includes(role)) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
            <AlertCircle size={20} />
          </div>
          <h1 className="text-xl font-bold text-fg">Not for your role</h1>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
            The matches surface is for trainees and instructors — it
            ranks active internship postings against the signed-in
            user's own skill profile. Your role doesn't carry a
            trainee profile.
          </p>
        </div>
      </div>
    );
  }

  // Profile-thinness gate. We check the count cheaply before running
  // the (potentially expensive) ranking — saves a wasted compute
  // sweep when the user has nothing on file.
  const skillCount = await prisma.userSkill.count({ where: { userId } });
  const isStaff = checkIsStaff(role);

  if (skillCount === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <PageHeader />
        {/* Admin tray surfaces even on the empty state — one click
            seeds both skills + posting-skill links so the page lights up. */}
        {isStaff && (
          <DemoSeedAndClearTray
            entity="user_matches"
            noun="matches scenario"
            clearHelp="Removes demo UserSkill rows (source=demo) on your user and PostingSkill rows on demo-employer postings. Real skill profile is not touched."
          />
        )}
        <div className="rounded-2xl border border-line bg-card p-8 surface-shadow text-center">
          <div className="w-14 h-14 mx-auto rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
            <Sparkles size={22} />
          </div>
          <h2 className="text-lg font-bold text-fg">
            Add a few skills to unlock matches
          </h2>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
            We can't recommend postings yet — your profile doesn't list
            any skills on file. Add 5 or more (or upload your resume
            and we'll suggest some) and this page lights up.
          </p>
          <Link
            href="/profile/skills"
            className="inline-flex items-center gap-2 mt-5 rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-brand-700 shadow-md shadow-brand-600/25"
          >
            Open My Skills <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const matches = await rankPostingsForTrainee(userId, 20);
  const thinProfile = skillCount < 5;

  // Pull the count of active postings without skill tags so we can
  // be honest about the "we couldn't score N postings" gap.
  const untaggedActive = await prisma.internshipPosting.count({
    where: { status: "active", skills: { none: {} } },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <PageHeader />

      {/* Admin-only seed/clear. Bootstraps the matches scenario in
          one click: 5 demo skills on the calling admin + PostingSkill
          links on demo postings so the fit scorer has something to
          rank. */}
      {isStaff && (
        <DemoSeedAndClearTray
          entity="user_matches"
          noun="matches scenario"
          clearHelp="Removes demo UserSkill rows (source=demo) on your user and PostingSkill rows on demo-employer postings. Real skill profile is not touched."
        />
      )}

      {thinProfile && (
        <div className="rounded-2xl bg-amber-50 ring-1 ring-inset ring-amber-200 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-900">
              Your profile is thin — confidence on these scores will be lower
            </p>
            <p className="text-xs text-amber-900/85 mt-1 leading-relaxed">
              You have {skillCount} skill{skillCount === 1 ? "" : "s"} on
              file. Add {5 - skillCount} more for the ranking to settle
              on a confident signal. Each row below shows its own
              confidence band — that's the truth-in-advertising layer.
            </p>
            <Link
              href="/profile/skills"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline mt-2"
            >
              Add skills <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <p className="font-medium text-muted">
            No active postings are tagged with skills yet — nothing to score against.
          </p>
          <p className="text-sm text-muted mt-1">
            Postings need to be tagged via the admin skill ontology
            before the matcher can rank them. Check back in a day or
            browse all postings directly.
          </p>
          <Link
            href="/internships"
            className="inline-flex items-center gap-1 mt-4 text-sm font-bold text-brand-700 hover:underline"
          >
            Open the internship board <ArrowRight size={12} />
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {matches.map((m) => (
              <li
                key={m.postingId}
                className="rounded-2xl border border-line bg-card p-5 surface-shadow"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                      {m.companyName}
                    </p>
                    <h2 className="text-lg font-bold text-fg mt-0.5 leading-tight">
                      <Link
                        href={`/internships/${m.postingId}`}
                        className="hover:text-brand-700"
                      >
                        {m.title}
                      </Link>
                    </h2>
                    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-2">
                      {m.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} />
                          {m.location}
                        </span>
                      )}
                      {m.deadline && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={11} />
                          Apply by{" "}
                          {new Date(m.deadline).toLocaleDateString("en-CA", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </dl>
                  </div>
                  <Link
                    href={`/internships/${m.postingId}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700 shadow-md shadow-brand-600/25 shrink-0"
                  >
                    Open posting <ArrowRight size={13} />
                  </Link>
                </div>

                <div className="mt-4">
                  <FitExplain fit={m.fit} variant="card" />
                </div>
              </li>
            ))}
          </ul>

          {untaggedActive > 0 && (
            <p className="text-xs text-muted text-center leading-relaxed">
              <Briefcase size={11} className="inline-block mr-1 text-subtle" />
              {untaggedActive} active posting{untaggedActive === 1 ? "" : "s"}{" "}
              aren't yet ontology-tagged so the matcher can't score them. They
              still show up at{" "}
              <Link href="/internships" className="text-brand-700 hover:underline font-semibold">
                /internships
              </Link>
              .
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <header>
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
        Profile · AI matches
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
        <Compass size={22} className="text-brand-600" />
        Postings recommended for you
      </h1>
      <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
        Ranked by how well your skill profile + completed pathways fit each
        posting. Tap <em>Why this score?</em> on any row to see the
        receipts — which of your skills counted, which adjacent skills
        bridged the gap, and what required skills you're missing.
      </p>
    </header>
  );
}
