/**
 * Script content model + persistence for the Workspace video scripts.
 *
 * A script is either "sections" (a list of titled markdown blocks stored as
 * ScriptSection rows) or "richtext" (a single TipTap JSON document on
 * Script.richContent). Either way, every save records a full ScriptRevision
 * snapshot so the history panel can show who changed what and revert.
 *
 * Server-only (imports prisma).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ScriptFormat = "sections" | "richtext" | "html";

export interface SnapshotSection {
  heading: string;
  body: string;
  order: number;
}

export interface ScriptSnapshot {
  format: ScriptFormat;
  sections: SnapshotSection[];
  /** TipTap JSON document when format = "richtext"; null otherwise. */
  richContent: unknown | null;
}

export interface RevisionAuthor {
  /** User.id when a logged-in user saved; null for an anonymous editor. */
  userId: string | null;
  name: string;
  kind: "user" | "anon";
}

/** Load a script's current content as a snapshot (null if not found). */
export async function loadScriptSnapshot(scriptId: string): Promise<ScriptSnapshot | null> {
  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!script) return null;
  return {
    format: script.format as ScriptFormat,
    sections: script.sections.map((s) => ({ heading: s.heading, body: s.body, order: s.order })),
    richContent: (script.richContent as unknown) ?? null,
  };
}

/**
 * Persist new content for a script and record a ScriptRevision. When
 * `sections` is provided the ScriptSection rows are replaced wholesale; when
 * `richContent` is provided (richtext) it's written to the Script row. The
 * full resulting snapshot is stored on the revision for one-click revert.
 */
export async function saveScriptContent(args: {
  scriptId: string;
  format?: ScriptFormat;
  sections?: SnapshotSection[];
  richContent?: unknown;
  author: RevisionAuthor;
  summary?: string;
}): Promise<ScriptSnapshot> {
  const { scriptId, author } = args;
  const script = await prisma.script.findUnique({ where: { id: scriptId } });
  if (!script) throw new Error("Script not found");
  const format = (args.format ?? script.format) as ScriptFormat;

  await prisma.$transaction(async (tx) => {
    const data: Prisma.ScriptUpdateInput = { format, updatedAt: new Date() };
    // Persist richContent for any rich format (richtext doc, or original HTML).
    if (args.richContent !== undefined) {
      data.richContent = (args.richContent ?? Prisma.JsonNull) as Prisma.InputJsonValue;
    }
    await tx.script.update({ where: { id: scriptId }, data });

    if (args.sections) {
      await tx.scriptSection.deleteMany({ where: { scriptId } });
      if (args.sections.length) {
        await tx.scriptSection.createMany({
          data: args.sections.map((s, i) => ({
            scriptId,
            order: typeof s.order === "number" ? s.order : i,
            heading: s.heading ?? "",
            body: s.body ?? "",
          })),
        });
      }
    }
  });

  const snapshot = (await loadScriptSnapshot(scriptId))!;
  await prisma.scriptRevision.create({
    data: {
      scriptId,
      authorUserId: author.userId,
      authorName: author.name || "Someone",
      authorKind: author.kind,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      summary: args.summary ?? "",
    },
  });
  return snapshot;
}

/** Restore a prior revision: writes its snapshot back as a new save. */
export async function revertToRevision(args: {
  scriptId: string;
  revisionId: string;
  author: RevisionAuthor;
}): Promise<ScriptSnapshot> {
  const rev = await prisma.scriptRevision.findUnique({ where: { id: args.revisionId } });
  if (!rev || rev.scriptId !== args.scriptId) throw new Error("Revision not found");
  const snap = rev.snapshot as unknown as ScriptSnapshot;
  return saveScriptContent({
    scriptId: args.scriptId,
    format: snap.format,
    sections: snap.format === "sections" ? snap.sections : undefined,
    richContent: snap.format === "sections" ? undefined : snap.richContent,
    author: args.author,
    summary: `Reverted to an earlier version`,
  });
}
