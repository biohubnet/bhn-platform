import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSkillSeed, embedMissingSkills } from "@/lib/skills/ontology";
import { Sparkles } from "lucide-react";
import { SkillsAdminClient } from "@/components/admin/SkillsAdminClient";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";

export default async function SkillsAdminPage() {
  const session = await requireRole("admin");
  const role = (session.user as { role?: string }).role ?? "admin";
  const isSuperadmin = role === "superadmin";

  // First-visit seed + warm a small batch of embeddings.
  await ensureSkillSeed();
  embedMissingSkills(10).catch(() => undefined);

  const skills = await prisma.skill.findMany({
    orderBy: [{ status: "asc" }, { category: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true, category: true, description: true,
      status: true, mergedIntoId: true, createdAt: true,
      aliases: { select: { id: true, alias: true } },
      _count: { select: { courses: true, users: true, postings: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Sparkles size={11} /> Admin · EXPERIENCE</>}
        title="Skill ontology"
        description="The shared vocabulary that wires courses, postings, and trainee profiles together. AI proposes new skills as content flows in; you keep them tidy here."
      />

      <SkillsAdminClient
        isSuperadmin={isSuperadmin}
        initialSkills={skills.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          category: s.category,
          description: s.description,
          status: s.status,
          mergedIntoId: s.mergedIntoId,
          createdAt: s.createdAt.toISOString(),
          aliases: s.aliases,
          counts: s._count,
        }))}
      />
    </div>
  );
}
