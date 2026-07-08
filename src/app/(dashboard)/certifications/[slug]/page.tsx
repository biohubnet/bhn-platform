import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Award, Lock, Check, Circle, ArrowRight, GraduationCap } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { ensureCertificationPrograms } from "@/lib/certifications/seed";
import { getProgramProgress, checkCertificationProgress, type LevelStatus } from "@/lib/certifications/progress";
import { tierLabel } from "@/lib/certifications/tiers";
import { personaLabel } from "@/lib/certifications/personas";

export const dynamic = "force-dynamic";

const STATUS_META: Record<LevelStatus, { label: string; badge: string; ring: string }> = {
  earned:      { label: "Earned",      badge: "bg-emerald-100 text-emerald-800", ring: "border-emerald-300" },
  in_progress: { label: "In progress", badge: "bg-amber-100 text-amber-800",     ring: "border-amber-300" },
  available:   { label: "Available",   badge: "bg-brand-100 text-brand-800",     ring: "border-brand-300" },
  locked:      { label: "Locked",      badge: "bg-elevated text-subtle",         ring: "border-line" },
};

export default async function CertificationLadderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id ?? null;

  const { slug } = await params;

  // Lazily seed the role-based tracks so they're always present.
  await ensureCertificationPrograms(userId);

  const program = await prisma.certificationProgram.findUnique({
    where: { slug },
    select: { id: true, status: true, audience: true },
  });
  if (!program || program.status !== "published") notFound();

  // Issue any credential the learner has newly qualified for, then read progress.
  if (userId) await checkCertificationProgress(userId, program.id);
  const progress = await getProgramProgress(userId, program.id);
  if (!progress) notFound();

  // Course titles for every course referenced across the tiers.
  const allCourseIds = Array.from(new Set(progress.levels.flatMap((l) => l.courseIds)));
  const courses = allCourseIds.length
    ? await prisma.course.findMany({
        where: { id: { in: allCourseIds } },
        select: { id: true, title: true, code: true },
      })
    : [];
  const courseById = new Map(courses.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><GraduationCap size={11} /> {progress.discipline ?? "Certification"}{program.audience.length > 0 && <> · {program.audience.map(personaLabel).join(" · ")} track</>}</>}
        title={progress.title}
        description={progress.summary ?? undefined}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5">
            <Award size={18} className="text-brand-600" />
            <div className="leading-tight">
              <div className="text-lg font-bold text-fg tabular-nums">{progress.earnedCount}<span className="text-subtle">/{progress.levelCount}</span></div>
              <div className="text-[11px] text-muted">tiers earned</div>
            </div>
          </div>
        }
      />

      {/* The three-tier ladder */}
      <ol className="space-y-4">
        {progress.levels.map((level, i) => {
          const meta = STATUS_META[level.status];
          const isLast = i === progress.levels.length - 1;
          return (
            <li key={level.levelId} className="relative">
              {!isLast && <span aria-hidden className="absolute left-[27px] top-14 bottom-[-1rem] w-px bg-line" />}
              <div className={`flex gap-4 rounded-2xl border ${meta.ring} bg-card-solid p-4 sm:p-5`}>
                {/* Tier rail node */}
                <div className="shrink-0">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${meta.ring} ${level.status === "earned" ? "bg-emerald-50" : level.status === "locked" ? "bg-elevated" : "bg-brand-50"}`}>
                    {level.status === "earned" ? <Check size={22} className="text-emerald-600" />
                      : level.status === "locked" ? <Lock size={18} className="text-subtle" />
                      : <span className="text-lg font-bold text-brand-700 tabular-nums">{level.order}</span>}
                  </div>
                </div>

                {/* Tier body */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-subtle">Level {level.order}</span>
                    <h2 className="text-lg font-bold text-fg">{tierLabel(level.tier)}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}>{meta.label}</span>
                    <span className="ml-auto text-xs text-muted">Pass mark {level.passingScore}%</span>
                  </div>
                  {level.summary && <p className="mt-1 text-sm text-muted">{level.summary}</p>}

                  {/* Progress bar */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
                      <div
                        className={`h-full rounded-full ${level.status === "earned" ? "bg-emerald-500" : "bg-brand-500"}`}
                        style={{ width: `${level.percent}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted">{level.completedCount}/{level.totalCourses} courses</span>
                  </div>

                  {/* Credential line or course checklist */}
                  {level.status === "earned" ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800">
                      <Award size={13} /> Credential {level.credentialNumber}
                      {level.earnedAt && <span className="text-emerald-600"> · {new Date(level.earnedAt).toLocaleDateString()}</span>}
                    </p>
                  ) : level.status === "locked" ? (
                    <p className="mt-3 text-xs text-subtle">Earn the {tierLabel(progress.levels[i - 1]?.tier ?? "")} credential to unlock this tier.</p>
                  ) : (
                    <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {level.courseIds.map((cid) => {
                        const c = courseById.get(cid);
                        const done = level.completedCourseIds.includes(cid);
                        return (
                          <li key={cid}>
                            <Link
                              href={`/courses/${cid}`}
                              className="group flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm hover:bg-elevated"
                            >
                              {done ? <Check size={14} className="shrink-0 text-emerald-600" /> : <Circle size={14} className="shrink-0 text-subtle" />}
                              <span className={`flex-1 truncate ${done ? "text-muted line-through" : "text-fg"}`}>{c?.title ?? "Course"}</span>
                              {c?.code && <span className="shrink-0 text-[10px] font-semibold text-subtle">{c.code}</span>}
                              <ArrowRight size={13} className="shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                            </Link>
                          </li>
                        );
                      })}
                      {level.courseIds.length === 0 && <li className="text-xs text-subtle">No courses assigned to this tier yet.</li>}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-center text-xs text-muted">
        Complete every course in a tier to earn its credential. Each tier unlocks the next — Foundation → Practitioner → Advanced.
      </p>
    </div>
  );
}
