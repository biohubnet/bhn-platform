/**
 * Helpers for resolving "which resume" an endpoint should operate on.
 *
 * The Resume table dropped its userId-unique constraint in the
 * 20260706 migration to support multiple resumes per user (a base +
 * tailored copies). Endpoints that previously assumed one resume per
 * user now look up either:
 *
 *   • An explicit resumeId — when the client passes one via query
 *     param / body / route param. Must belong to the calling user
 *     (and not be archived, unless `allowArchived: true`).
 *
 *   • The "active" resume — the user's most-recently-edited non-
 *     archived resume. This is the default when no id is given,
 *     keeping every existing endpoint backward-compatible.
 *
 * The lookup is intentionally cheap — a single indexed query off
 * `(userId, isArchived)`.
 */
import { prisma } from "@/lib/prisma";
import { emptyResumeContent } from "@/lib/resume/types";

/** Selector kept narrow on purpose — callers add `include` / `select`
 *  themselves after they have the id. Returning the full record on
 *  every helper call would bloat the GET endpoints that only need
 *  the id + version. */
export interface ActiveResumeRow {
  id: string;
  userId: string;
  version: number;
  name: string;
  isArchived: boolean;
  parsedAt: Date | null;
  sourceFileUrl: string | null;
  lastEditedAt: Date;
}

const SELECT_BASIC = {
  id: true,
  userId: true,
  version: true,
  name: true,
  isArchived: true,
  parsedAt: true,
  sourceFileUrl: true,
  lastEditedAt: true,
} as const;

/** Resolve which resume to operate on for the calling user.
 *
 *  - Pass `resumeId` to target a specific row (verified to belong to
 *    the caller). Returns null if not found / not owned / archived
 *    (unless allowArchived).
 *  - Omit `resumeId` to fall back to the user's most-recently-edited
 *    non-archived resume. Returns null if the user has no resumes
 *    yet.
 *
 *  Endpoints that need to scaffold an empty resume on first call
 *  should use `getOrCreateActiveResume()` below. */
export async function getActiveResume(args: {
  userId: string;
  resumeId?: string | null;
  allowArchived?: boolean;
}): Promise<ActiveResumeRow | null> {
  if (args.resumeId) {
    const r = await prisma.resume.findFirst({
      where: {
        id: args.resumeId,
        userId: args.userId,
        ...(args.allowArchived ? {} : { isArchived: false }),
      },
      select: SELECT_BASIC,
    });
    return r;
  }
  return prisma.resume.findFirst({
    where: { userId: args.userId, isArchived: false },
    orderBy: { lastEditedAt: "desc" },
    select: SELECT_BASIC,
  });
}

/** Same as getActiveResume but auto-creates a "Main resume" if the
 *  user has none. Used by GET /profile/resume/structure + the
 *  /profile/resume page server shell to make the first visit work
 *  without a separate "create resume" step. */
export async function getOrCreateActiveResume(args: {
  userId: string;
  resumeId?: string | null;
}): Promise<ActiveResumeRow> {
  const existing = await getActiveResume(args);
  if (existing) return existing;
  // No id was given AND the user has no resumes — scaffold one.
  if (args.resumeId) {
    // An id was given but it didn't resolve (wrong user / archived /
    // doesn't exist). Caller should treat that as a 404; don't
    // silently create a new one with a different id.
    throw new Error("Resume not found.");
  }
  const created = await prisma.resume.create({
    data: {
      userId: args.userId,
      name: "Main resume",
      content: emptyResumeContent() as unknown as object,
    },
    select: SELECT_BASIC,
  });
  return created;
}
