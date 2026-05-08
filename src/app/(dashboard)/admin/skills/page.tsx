import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSkillSeed, embedMissingSkills } from "@/lib/skills/ontology";
import { Sparkles } from "lucide-react";
import { SkillsAdminClient } from "@/components/admin/SkillsAdminClient";

export const dynamic = "force-dynamic";

export default async function SkillsAdminPage() {
  await requireRole("admin");

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
      <header>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Sparkles size={20} className="text-brand-600" />
          Skill ontology
        </h1>
        <p className="text-sm text-muted mt-1">
          The shared vocabulary that wires courses, postings, and trainee profiles together. AI proposes new skills as content flows in; you keep them tidy here.
        </p>
      </header>

      <SkillsAdminClient
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
