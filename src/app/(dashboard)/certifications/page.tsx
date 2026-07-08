import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, GraduationCap, ArrowRight, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/ui/PageHero";
import { ensureCertificationPrograms } from "@/lib/certifications/seed";
import { checkCertificationProgress } from "@/lib/certifications/progress";
import { TRAINEE_PERSONAS, PERSONA_META, personaShort, type TraineePersona } from "@/lib/certifications/personas";

export const dynamic = "force-dynamic";

export default async function CertificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id ?? null;

  // Always-present role-based tracks (one per trainee persona).
  await ensureCertificationPrograms(userId);

  const sp = await searchParams;
  const activePersona = (TRAINEE_PERSONAS as readonly string[]).includes(sp.persona ?? "")
    ? (sp.persona as TraineePersona)
    : null;

  const programs = await prisma.certificationProgram.findMany({
    where: {
      status: "published",
      ...(activePersona ? { audience: { has: activePersona } } : {}),
    },
    include: { levels: { orderBy: { order: "asc" }, select: { id: true, tier: true, title: true } } },
    orderBy: { createdAt: "asc" },
  });

  const earnedByProgram = new Map<string, number>();
  if (userId) {
    for (const p of programs) await checkCertificationProgress(userId, p.id);
    const creds = await prisma.certificationCredential.findMany({
      where: { userId, revokedAt: null },
      select: { programId: true },
    });
    for (const c of creds) earnedByProgram.set(c.programId, (earnedByProgram.get(c.programId) ?? 0) + 1);
  }

  const chip = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors";

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><GraduationCap size={11} /> Credentials · Trainees</>}
        title="Certifications"
        description="Role-specific professional certifications for each trainee track. Work up through Foundation, Practitioner, and Advanced tiers — earning a verifiable credential at each step."
      />

      {/* Persona filter — only trainees take training; pick your track. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-subtle"><Users size={13} /> Your track:</span>
        <Link href="/certifications" className={cn(chip, !activePersona ? "border-brand-500 bg-brand-50 text-brand-800" : "border-line text-muted hover:bg-elevated")}>All</Link>
        {TRAINEE_PERSONAS.map((p) => (
          <Link
            key={p}
            href={`/certifications?persona=${p}`}
            className={cn(chip, activePersona === p ? "border-brand-500 bg-brand-50 text-brand-800" : "border-line text-muted hover:bg-elevated")}
          >
            {PERSONA_META[p].label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {programs.map((p) => {
          const earned = earnedByProgram.get(p.id) ?? 0;
          return (
            <Link
              key={p.id}
              href={`/certifications/${p.slug}`}
              className="group flex flex-col rounded-2xl border border-line bg-card-solid p-5 transition-colors hover:border-brand-300 hover:bg-elevated"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {p.audience.length === 0 ? (
                    <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtle">All trainees</span>
                  ) : (
                    p.audience.map((a) => (
                      <span key={a} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">{personaShort(a)}</span>
                    ))
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-elevated px-2.5 py-1 text-xs font-semibold text-fg tabular-nums">
                  <Award size={13} className="text-brand-600" /> {earned}/{p.levels.length}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-bold text-fg">{p.title}</h2>
              {p.summary && <p className="mt-1 flex-1 text-sm text-muted line-clamp-3">{p.summary}</p>}
              <div className="mt-4 flex items-center gap-1.5">
                {p.levels.map((lv, i) => (
                  <span key={lv.id} className="flex items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", i < earned ? "bg-emerald-100 text-emerald-800" : "bg-elevated text-subtle")}>{lv.title}</span>
                    {i < p.levels.length - 1 && <ArrowRight size={11} className="text-subtle" />}
                  </span>
                ))}
                <ArrowRight size={15} className="ml-auto text-subtle transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
        {programs.length === 0 && (
          <p className="text-sm text-muted">No certifications for this track yet.</p>
        )}
      </div>
    </div>
  );
}
