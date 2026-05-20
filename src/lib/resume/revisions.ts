/**
 * Single helper for recording ResumeRevision rows.
 *
 * The naïve "create a revision on every save" strategy floods the
 * version history — a 5-minute writing session can produce 20+
 * rows none of which are individually meaningful, and the drawer
 * becomes a wall of v47 / v48 / v49 that's not useful for going
 * back to a real "earlier version."
 *
 * The strategy here:
 *
 *   • "Significant" events (AI parse, AI suggest, AI tailor, revert,
 *     demo seed, explicit user snapshot) ALWAYS create a fresh
 *     revision. Those are the moments a user actually wants in their
 *     history — "before / after the tailor", "before I reverted",
 *     "after the AI parse landed."
 *
 *   • Plain auto-save edits (triggeredBy: "user") are COALESCED into
 *     the most-recent "user" revision when one exists within the
 *     last COALESCE_WINDOW_MS. The existing row's content + version
 *     + createdAt are updated in place, so a continuous writing
 *     session collapses to a single revision representing the
 *     session's end-state. After ~5 min of inactivity the next save
 *     creates a new revision, starting a fresh session.
 *
 * Trade-off: you lose intermediate granularity within a session
 * (typing then deleting within 5 min won't be individually
 * recoverable). That's acceptable because (a) browser native undo
 * still handles within-session corrections, (b) bullet / item /
 * section removals are separately undoable via the in-editor
 * snackbar, and (c) the user can hit "Snapshot now" any time they
 * want an explicit marker.
 */
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COALESCE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Triggers that should ALWAYS create a fresh revision row, never
 *  coalesce into a previous one. */
const SIGNIFICANT_TRIGGERS = new Set([
  "ai_parse",
  "ai_suggest",
  "ai_tailor",
  "revert",
  "snapshot", // explicit "Snapshot now" button
  // Demo seed uses "user" but writes its own significance note, so
  // we let it coalesce normally — admins re-seed repeatedly and the
  // version history shouldn't fill up with seed rows.
]);

/** Accepts either the top-level prisma client or a transaction client. */
type PrismaLike =
  | typeof prisma
  | PrismaTypes.TransactionClient;

interface RecordArgs {
  resumeId: string;
  version: number;
  content: object;
  triggeredBy: string;
  note?: string | null;
}

export async function recordRevision(client: PrismaLike, args: RecordArgs) {
  const force = SIGNIFICANT_TRIGGERS.has(args.triggeredBy);
  if (!force) {
    // Look for a recent "user" revision we can fold into. Only "user"
    // rows are coalescing candidates; we'd never overwrite an AI /
    // revert row because those mark meaningful boundaries.
    const recent = await client.resumeRevision.findFirst({
      where: { resumeId: args.resumeId, triggeredBy: args.triggeredBy },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });
    if (recent) {
      const age = Date.now() - recent.createdAt.getTime();
      if (age < COALESCE_WINDOW_MS) {
        // Update in place. We refresh `createdAt` so the row stays
        // at the top of the list, and we bump version + content to
        // the latest. The note is preserved if the caller didn't
        // provide one (rare for user edits) — never overwrite a
        // non-empty note with null.
        return client.resumeRevision.update({
          where: { id: recent.id },
          data: {
            version: args.version,
            content: args.content as unknown as Prisma.InputJsonValue,
            createdAt: new Date(),
            ...(args.note !== undefined ? { note: args.note ?? null } : {}),
          },
        });
      }
    }
  }
  // No coalesce candidate (or trigger forces a fresh row) — create new.
  return client.resumeRevision.create({
    data: {
      resumeId: args.resumeId,
      version: args.version,
      content: args.content as unknown as Prisma.InputJsonValue,
      triggeredBy: args.triggeredBy,
      note: args.note ?? null,
    },
  });
}
