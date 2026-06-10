/**
 * Share-link plumbing for workspace scripts. A ScriptShareToken row is a
 * public URL (/scripts/<token>) that lets an EXTERNAL person open — and, when
 * canEdit, collaboratively edit — one script without an account. On first
 * visit they give their name → a ScriptCollaborator row; its id is stored in
 * an httpOnly per-script cookie so we recognise them on return and attribute
 * their edits in the revision history.
 *
 * Server-only (prisma + next/headers).
 */
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const collabCookieName = (scriptId: string) => `bhn-collab-${scriptId}`;

export function newShareToken(): string {
  return randomBytes(16).toString("base64url"); // ~22 url-safe chars
}

export type ShareResolution =
  | { ok: true; token: { id: string; token: string; canEdit: boolean }; script: { id: string; title: string; format: string; richContent: unknown } }
  | { ok: false; reason: "not_found" | "expired" };

/** Look up a share token and its script. Expired → reason "expired". */
export async function resolveShareToken(token: string): Promise<ShareResolution> {
  const row = await prisma.scriptShareToken.findUnique({
    where: { token },
    include: { script: { select: { id: true, title: true, format: true, richContent: true, isArchived: true } } },
  });
  if (!row || row.script.isArchived) return { ok: false, reason: "not_found" };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  return {
    ok: true,
    token: { id: row.id, token: row.token, canEdit: row.canEdit },
    script: { id: row.script.id, title: row.script.title, format: row.script.format, richContent: row.script.richContent },
  };
}

/** The collaborator identified by this script's cookie, or null. */
export async function getCollaborator(scriptId: string) {
  const jar = await cookies();
  const id = jar.get(collabCookieName(scriptId))?.value;
  if (!id) return null;
  const collab = await prisma.scriptCollaborator.findUnique({ where: { id } });
  if (!collab || collab.scriptId !== scriptId) return null;
  return collab;
}
