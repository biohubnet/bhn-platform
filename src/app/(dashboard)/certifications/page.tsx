import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, GraduationCap, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { ensureBiomanufacturingCertification } from "@/lib/certifications/seed";
import { checkCertificationProgress } from "@/lib/certifications/progress";

export const dynamic = "force-dynamic";

export default async function CertificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id ?? null;

  // Always-present flagship framework.
  await ensureBiomanufacturingCertification(userId);

  const programs = await prisma.certificationProgram.findMany({
    where: { status: "published" },
    include: { levels: { orderBy: { order: "asc" }, select: { id: true, tier: true, title: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Issue any newly-qualified credentials, then count earned tiers per program.
  const earnedByProgram = new Map<string, number>();
  if (userId) {
    for (const p of programs) await checkCertificationProgress(userId, p.id);
    const creds = await prisma.certificationCredential.findMany({
      where: { userId, revokedAt: null },
      select: { programId: true },
    });
    for (const c of creds) earnedByProgram.set(c.programId, (earnedByProgram.get(c.programId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><GraduationCap size={11} /> Credentials</>}
        title="Certifications"
        description="Multi-level professional certifications. Work up through Foundation, Practitioner, and Advanced tiers — earning a verifiable credential at each step."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {programs.map((p) => {
          const earned = earnedByProgram.get(p.id) ?? 0;
          return (
            <Link
              key={p.id}
              href={`/certifications/${p.slug}`}
              className="group flex flex-col rounded-2xl border border-line bg-card-solid p-5 transition-colors hover:border-brand-300 hover:bg-elevated"
            >
              <div className="flex items-center justify-between">
                {p.discipline && <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">{p.discipline}</span>}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated px-2.5 py-1 text-xs font-semibold text-fg tabular-nums">
                  <Award size={13} className="text-brand-600" /> {earned}/{p.levels.length}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-bold text-fg">{p.title}</h2>
              {p.summary && <p className="mt-1 flex-1 text-sm text-muted line-clamp-3">{p.summary}</p>}
              <div className="mt-4 flex items-center gap-1.5">
                {p.levels.map((lv, i) => (
                  <span key={lv.id} className="flex items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${i < earned ? "bg-emerald-100 text-emerald-800" : "bg-elevated text-subtle"}`}>{lv.title}</span>
                    {i < p.levels.length - 1 && <ArrowRight size={11} className="text-subtle" />}
                  </span>
                ))}
                <ArrowRight size={15} className="ml-auto text-subtle transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
        {programs.length === 0 && (
          <p className="text-sm text-muted">No certifications published yet.</p>
        )}
      </div>
    </div>
  );
}
