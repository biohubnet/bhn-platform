/**
 * Internship listings.
 *
 * Trainee view:
 *   • Active postings only.
 *   • A "complete your profile" nudge until they have ≥5 skills on
 *     file (was: ≥1; partial profiles weren't getting the cue).
 *   • Per-card match score when they have skills + the posting has
 *     ontology mappings.
 *   • Heart icon to save a posting (POST /api/internships/[id]/save).
 *   • A simple text+facet filter bar (search, location, type) so 200
 *     postings doesn't render as a single uncategorisable wall.
 *
 * Staff view: includes drafts/closed (so admins can audit).
 *
 * Filters live in URL searchParams so a saved tab / link preserves
 * what the trainee was looking at.
 */
import Link from "next/link";
import { Briefcase, MapPin, Clock, Calendar, ArrowRight, Plus, Sparkles, Heart, Search } from "lucide-react";
import { getSession, isStaff as checkIsStaff, isAdmin as checkIsAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { Badge } from "@/components/ui/Badge";
import { scoreMatch } from "@/lib/skills/ontology";
import { cn } from "@/lib/utils";
import { InternshipFilters } from "@/components/lms/InternshipFilters";
import { PostingSaveButton } from "@/components/lms/PostingSaveButton";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";
import { InternshipAdminTable, type AdminPostingRow } from "@/components/internships/InternshipAdminTable";

export const dynamic = "force-dynamic";

const PROFILE_NUDGE_THRESHOLD = 5; // less than this → show the "add skills" banner

export default async function InternshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; loc?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const loc = (sp.loc ?? "").trim().slice(0, 80);
  const type = (sp.type ?? "").trim().slice(0, 80);

  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const userId = (session!.user as { id?: string }).id ?? null;
  const isStaff = checkIsStaff(role);
  const isAdmin = checkIsAdmin(role);
  const isTrainee = role === "trainee" || role === "evaluating";

  // Build the WHERE clause from filters. Free-text search runs over
  // title / companyName / positionDetails / keySkills (the array
  // contains-some operator gives us per-skill keyword match for free).
  const where: Record<string, unknown> = isStaff ? {} : { status: "active" };
  if (q) {
    where.OR = [
      { title:           { contains: q, mode: "insensitive" } },
      { companyName:     { contains: q, mode: "insensitive" } },
      { positionDetails: { contains: q, mode: "insensitive" } },
      { keySkills:       { hasSome: [q] } },
    ];
  }
  if (loc) where.location = { contains: loc, mode: "insensitive" };
  if (type) where.type = { contains: type, mode: "insensitive" };

  const [postings, mySkills, savedRows, distinctLocations, distinctTypes] = await Promise.all([
    prisma.internshipPosting.findMany({
      where,
      include: {
        skills: { select: { skillId: true, weight: true, required: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    isTrainee && userId
      ? prisma.userSkill.findMany({
          where: { userId },
          select: { skillId: true, level: true },
        })
      : Promise.resolve<{ skillId: string; level: number }[]>([]),
    isTrainee && userId
      ? prisma.userSavedPosting.findMany({
          where: { userId },
          select: { postingId: true },
        })
      : Promise.resolve<{ postingId: string }[]>([]),
    // Cheap distinct queries to populate the filter dropdowns.
    prisma.internshipPosting.findMany({
      where: { status: "active", location: { not: null } },
      select: { location: true },
      distinct: ["location"],
      take: 50,
    }),
    prisma.internshipPosting.findMany({
      where: { status: "active", type: { not: null } },
      select: { type: true },
      distinct: ["type"],
      take: 50,
    }),
  ]);

  const savedSet = new Set(savedRows.map((s) => s.postingId));
  const showProfileNudge =
    isTrainee && mySkills.length < PROFILE_NUDGE_THRESHOLD && postings.length > 0;

  return (
    <div>
      <PageHero
        eyebrow={<><Briefcase size={11} /> Industry placements</>}
        title="Internship opportunities"
        description="Open internships and co-op postings from BioHubNet's industry partners. Apply directly with the contact on each posting."
        tone="brand"
        actions={
          isStaff ? (
            <Link
              href="/admin/internships/new"
              className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-md transition-colors"
            >
              <Plus size={14} /> New posting
            </Link>
          ) : null
        }
      />

      {/* Admin demo-data tray — seeds plausible postings authored by
          a demo employer account, and wipes everything those accounts
          have authored. Employers / trainees see nothing here; the
          tray is admin-only. */}
      {isAdmin && (
        <div className="mb-4">
          <DemoSeedAndClearTray
            entity="internship_posting"
            noun="demo postings"
            clearHelp="Delete every internship posting authored by a demo employer account. The employer accounts themselves stay (they're reusable). Phantom + showcase aren't touched here — phantoms have their own dedicated cleanup."
          />
        </div>
      )}

      <div>
        {showProfileNudge && (
          <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl border border-brand-200 bg-brand-50/60">
            <span className="mt-0.5 inline-flex w-7 h-7 rounded-md bg-brand-100 text-brand-700 items-center justify-center shrink-0">
              <Sparkles size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-900">
                {mySkills.length === 0
                  ? "Add skills to your profile to see match scores"
                  : `Add ${PROFILE_NUDGE_THRESHOLD - mySkills.length} more skill${PROFILE_NUDGE_THRESHOLD - mySkills.length === 1 ? "" : "s"} for sharper matches`}
              </p>
              <p className="text-xs text-brand-800/80 mt-0.5">
                {mySkills.length === 0
                  ? "Right now we don't know what you can do, so every posting looks the same. Add a few skills (or upload your resume) and we'll surface postings where you're a strong fit and the courses that close any gaps."
                  : "You've got the basics. A fuller profile lets us rank postings more accurately and recommend courses that close specific gaps."}
              </p>
            </div>
            <Link
              href="/profile/skills"
              className="shrink-0 self-start text-xs font-medium text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-brand-200 bg-white hover:bg-brand-50"
            >
              Open My Skills <ArrowRight size={11} />
            </Link>
          </div>
        )}

        {/* Filter bar — visible to everyone; lets trainees narrow 200
            postings to a relevant subset without leaving the page. */}
        <InternshipFilters
          q={q}
          loc={loc}
          type={type}
          locations={distinctLocations.map((d) => d.location ?? "").filter(Boolean)}
          types={distinctTypes.map((d) => d.type ?? "").filter(Boolean)}
        />

        {/* Admin batch view — compact table with checkboxes + sticky
            action toolbar (Activate · Draft · Close · Delete). The
            card grid below is preserved for trainees and employers
            who want the rich visual presentation. */}
        {isAdmin && postings.length > 0 && (
          <div className="mb-5">
            <InternshipAdminTable
              postings={postings.map<AdminPostingRow>((p) => ({
                id: p.id,
                companyName: p.companyName,
                title: p.title,
                status: (p.status as AdminPostingRow["status"]) ?? "draft",
                location: p.location ?? null,
                type: p.type ?? null,
                deadline: p.deadline ? p.deadline.toISOString() : null,
                createdAt: p.createdAt.toISOString(),
                skillCount: p.skills.length,
              }))}
            />
          </div>
        )}

        {/* Admins get the batch table above and skip the card grid —
            no duplication. To preview the trainee view they can use
            "Sit in another role" from the admin dashboard rail. */}
        {postings.length === 0 ? (
          <div className="bg-card rounded-2xl border border-line p-16 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <Search size={20} />
            </div>
            <p className="font-medium text-muted">
              {(q || loc || type) ? "No postings match those filters." : "No open postings right now."}
            </p>
            <p className="text-sm text-muted mt-1">
              {(q || loc || type) ? (
                <>
                  Try a broader search or{" "}
                  <Link href="/internships" className="text-brand-700 underline hover:no-underline">
                    clear filters
                  </Link>
                  .
                </>
              ) : isStaff ? (
                "Click New posting to add one — paste any job description and the AI will pre-fill the fields."
              ) : (
                "Check back soon — new opportunities are added regularly."
              )}
            </p>
          </div>
        ) : isAdmin ? null /* admins already saw the batch table above */ : (
          <div className="grid md:grid-cols-2 gap-5">
            {postings.map((p) => {
              const closed = p.status === "closed";
              const draft = p.status === "draft";
              const saved = savedSet.has(p.id);

              // Per-card match: only meaningful when the trainee has
              // skills + the posting has been ontology-tagged.
              const match =
                isTrainee && mySkills.length > 0 && p.skills.length > 0
                  ? scoreMatch(
                      mySkills,
                      p.skills.map((s) => ({
                        skillId: s.skillId,
                        weight: s.weight ?? 1,
                        required: s.required ?? false,
                      })),
                    )
                  : null;

              return (
                <div
                  key={p.id}
                  className={cn(
                    "relative group bg-card rounded-2xl border border-line hover:border-brand-300 hover:shadow-md transition-all p-6 flex flex-col gap-4",
                    closed && "opacity-60",
                  )}
                >
                  {/* Save heart, top-right */}
                  {isTrainee && userId && !closed && !draft && (
                    <div className="absolute top-3 right-3 z-10">
                      <PostingSaveButton postingId={p.id} initialSaved={saved} />
                    </div>
                  )}

                  <Link href={`/internships/${p.id}`} className="flex flex-col gap-4 flex-1">
                    <div className="flex items-start justify-between gap-3 pr-10">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
                          {p.companyName}
                        </p>
                        <h2 className="font-semibold text-fg leading-tight mt-1 group-hover:text-brand-700 transition-colors">
                          {p.title}
                        </h2>
                      </div>
                      {draft && <Badge tone="warning">Draft</Badge>}
                      {closed && <Badge tone="neutral">Closed</Badge>}
                    </div>

                    {match && (
                      <div className="inline-flex items-center gap-1.5 self-start text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset bg-emerald-50 text-emerald-800 ring-emerald-200">
                        <Sparkles size={11} />
                        {match.score}% match · {match.matched}/{p.skills.length} skills
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
                      {p.location && (
                        <span className="inline-flex items-center gap-1"><MapPin size={11} /> {p.location}</span>
                      )}
                      {p.type && (
                        <span className="inline-flex items-center gap-1"><Briefcase size={11} /> {p.type}</span>
                      )}
                      {p.duration && (
                        <span className="inline-flex items-center gap-1"><Clock size={11} /> {p.duration}</span>
                      )}
                      {p.deadline && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={11} /> Apply by {p.deadline.toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {p.keySkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.keySkills.slice(0, 5).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-elevated text-muted border border-line"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs text-subtle">
                        Posted {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-medium text-brand-700 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        View posting <ArrowRight size={13} />
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
