import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sparkles, BookOpen, Pencil, Lightbulb } from "lucide-react";
import { SkillProfileClient } from "@/components/lms/SkillProfileClient";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";

export default async function MySkillsPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const isStaff = checkIsStaff(role);

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true },
  });
  if (!user) redirect("/login");

  const mine = await prisma.userSkill.findMany({
    where: { userId: user.id },
    include: { skill: { select: { id: true, name: true, category: true, status: true } } },
    orderBy: [{ level: "desc" }, { createdAt: "asc" }],
  });

  // Suggest a handful of high-frequency canonical skills the user
  // doesn't have yet, sorted by how often they appear on postings.
  const top = await prisma.skill.findMany({
    where: {
      status: "active",
      NOT: { users: { some: { userId: user.id } } },
    },
    orderBy: { postings: { _count: "desc" } },
    select: { id: true, name: true, category: true },
    take: 12,
  });

  // Quick stats
  const completedCourses = await prisma.enrollment.count({
    where: { userId: user.id, status: "completed" },
  });

  return (
    <div>
      <PageHero
        eyebrow={<><Lightbulb size={11} /> Profile · Skills</>}
        title="My Skills"
        description="Skills you've earned through training, mapped against postings so the platform can surface ones you'd be strong for."
      />
      <div className="space-y-6 max-w-4xl mx-auto">
      <header className="hidden">
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Sparkles size={20} className="text-brand-600" />
          My skill profile
        </h1>
        <p className="text-sm text-muted mt-1 max-w-2xl">
          Your skill profile is built three ways: <strong>inferred</strong> from courses you complete,
          <strong> extracted</strong> from your talent application or resume, and what you <strong>self-claim</strong> here.
          Employers use this to match you to internships and postings.
        </p>
      </header>

      {/* Admin-only demo seed/clear. Writes UserSkill rows with
          source="demo" on the viewing admin's user; Clear targets
          exactly that source so real self/resume/ai/inferred/admin
          skill rows aren't touched. */}
      {isStaff && (
        <DemoSeedAndClearTray
          entity="user_skill"
          noun="demo skills"
          clearHelp="Delete every UserSkill row on your user where source='demo'. Real skill rows (self / resume / ai / inferred / admin) are untouched."
        />
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Sparkles} label="Skills" value={mine.length} />
        <Stat icon={BookOpen} label="Courses completed" value={completedCourses} />
        <Stat icon={Pencil}   label="Self-claimed" value={mine.filter((m) => m.source === "self").length} />
      </div>

      <SkillProfileClient
        initialMine={mine
          .filter((m) => m.skill.status !== "merged")
          .map((m) => ({
            id: m.id,
            skillId: m.skillId,
            name: m.skill.name,
            category: m.skill.category,
            level: m.level,
            source: m.source,
            evidence: m.evidence,
          }))}
        suggestions={top}
      />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="bg-card border border-line rounded-xl px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold inline-flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </div>
      <p className="text-2xl font-bold text-fg mt-1">{value}</p>
    </div>
  );
}
