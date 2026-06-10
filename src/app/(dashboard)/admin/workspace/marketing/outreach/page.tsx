/**
 * Workspace → Marketing → Outreach. Admin-only contact lists for
 * cross-promoting BHN programs. Seeds the Cross-promotion Partners list (from
 * the team's CSV) + an empty EXPERIENCE Program list on first visit.
 */
import { redirect } from "next/navigation";
import { BookUser } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { OutreachBoard, type OutreachListData } from "@/components/workspace/OutreachBoard";
import { ensureOutreachSeed, DEFAULT_COLUMNS, type OutreachColumn } from "@/lib/outreach/seed";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  await ensureOutreachSeed((session.user as { id?: string }).id ?? null);

  const lists = await prisma.outreachList.findMany({
    orderBy: { order: "asc" },
    include: { contacts: { orderBy: { order: "asc" } } },
  });

  const data: OutreachListData[] = lists.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    columns: (Array.isArray(l.columns) ? (l.columns as unknown as OutreachColumn[]) : DEFAULT_COLUMNS),
    contacts: l.contacts.map((c) => ({
      id: c.id,
      values: (typeof c.values === "object" && c.values !== null ? (c.values as Record<string, string>) : {}),
      addedByName: c.addedByName,
      createdAt: c.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><BookUser size={11} /> Workspace · Marketing</>}
        title="Outreach"
        description="Partner contacts we can reach out to for promoting BHN programs. Add, reorder, and move contacts between lists; every contact shows who added it, and each list's columns are editable."
      />
      <OutreachBoard initialLists={data} />
    </div>
  );
}
