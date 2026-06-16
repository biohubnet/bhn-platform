/**
 * Workspace → Marketing → Outreach → Contacts. Admin-only contact directory +
 * lists for cross-promoting BHN programs. One person can sit on many lists
 * without duplication: shared fields live on the person (edit once, updates
 * everywhere), per-list fields live on the membership.
 */
import { redirect } from "next/navigation";
import { BookUser } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { OutreachBoard, type OutreachData } from "@/components/workspace/OutreachBoard";
import { OutreachNav } from "@/components/workspace/OutreachNav";
import {
  ensureOutreachDirectory, getPersonColumns, DEFAULT_MEMBERSHIP_COLUMNS, type OutreachColumn,
} from "@/lib/outreach/directory";
import {
  getOutreachTemplateOverrides, resolveTemplates, OUTREACH_PLACEHOLDERS,
} from "@/lib/outreach/templates";

export const dynamic = "force-dynamic";

const asValues = (v: unknown): Record<string, string> =>
  typeof v === "object" && v !== null ? (v as Record<string, string>) : {};

export default async function OutreachContactsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  await ensureOutreachDirectory((session.user as { id?: string }).id ?? null);

  const [personColumns, lists, people, templateOverrides] = await Promise.all([
    getPersonColumns(),
    prisma.outreachList.findMany({
      orderBy: { order: "asc" },
      include: {
        shareTokens: {
          orderBy: { createdAt: "desc" },
          select: { id: true, token: true, label: true, createdAt: true },
        },
        memberships: {
          orderBy: { order: "asc" },
          include: {
            person: {
              include: {
                memberships: { select: { listId: true, list: { select: { name: true } } } },
                touches: { orderBy: { happenedAt: "desc" }, take: 1, select: { happenedAt: true } },
                _count: { select: { touches: true } },
              },
            },
          },
        },
      },
    }),
    prisma.outreachPerson.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        memberships: { select: { listId: true, list: { select: { name: true } } } },
        touches: { orderBy: { happenedAt: "desc" }, take: 1, select: { happenedAt: true } },
        _count: { select: { touches: true } },
      },
    }),
    getOutreachTemplateOverrides(),
  ]);

  const data: OutreachData = {
    personColumns,
    lists: lists.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      columns: (Array.isArray(l.columns) ? (l.columns as unknown as OutreachColumn[]) : DEFAULT_MEMBERSHIP_COLUMNS),
      shareLinks: l.shareTokens.map((t) => ({
        id: t.id, token: t.token, label: t.label, createdAt: t.createdAt.toISOString(),
      })),
      rows: l.memberships.map((m) => ({
        membershipId: m.id,
        personId: m.personId,
        personValues: asValues(m.person.values),
        values: asValues(m.values),
        addedByName: m.addedByName,
        createdAt: m.createdAt.toISOString(),
        otherLists: m.person.memberships.filter((x) => x.listId !== l.id).map((x) => x.list.name),
        touchCount: m.person._count.touches,
        lastTouchAt: m.person.touches[0]?.happenedAt.toISOString() ?? null,
      })),
    })),
    directory: people.map((p) => ({
      id: p.id,
      values: asValues(p.values),
      addedByName: p.addedByName,
      createdAt: p.createdAt.toISOString(),
      lists: p.memberships.map((m) => ({ listId: m.listId, name: m.list.name })),
      touchCount: p._count.touches,
      lastTouchAt: p.touches[0]?.happenedAt.toISOString() ?? null,
      introSentAt: p.introSentAt?.toISOString() ?? null,
    })),
  };

  const emailTemplates = resolveTemplates(templateOverrides);
  const senderName = (session.user as { name?: string }).name ?? "";

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><BookUser size={11} /> Workspace · Marketing</>}
        title="Outreach"
        description="One directory of partner contacts, organised into lists. A person can sit on several lists without duplication — edit their shared details once and every list updates. Per-list notes and columns stay separate."
      />
      <OutreachNav />
      <OutreachBoard
        data={data}
        emailTemplates={emailTemplates}
        templatePlaceholders={OUTREACH_PLACEHOLDERS}
        senderName={senderName}
      />
    </div>
  );
}
