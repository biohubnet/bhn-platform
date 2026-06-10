/**
 * Share-link plumbing for outreach lists. An OutreachShareToken row is a
 * public URL (/outreach/<token>) opening ONE list without an account. First
 * visit asks the person's name → OutreachCollaborator row, id stored in an
 * httpOnly per-list cookie, so contacts they add are attributed to them.
 * Mirrors src/lib/scripts/share.ts. Server-only.
 */
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { OutreachColumn } from "@/lib/outreach/directory";

export const outreachCollabCookieName = (listId: string) => `bhn-outreach-${listId}`;

export function newOutreachToken(): string {
  return randomBytes(16).toString("base64url");
}

export type OutreachShareResolution =
  | {
      ok: true;
      token: { id: string; token: string; canEdit: boolean };
      list: { id: string; name: string; description: string; columns: OutreachColumn[] };
    }
  | { ok: false; reason: "not_found" | "expired" };

export async function resolveOutreachToken(token: string): Promise<OutreachShareResolution> {
  const row = await prisma.outreachShareToken.findUnique({
    where: { token },
    include: { list: { select: { id: true, name: true, description: true, columns: true } } },
  });
  if (!row) return { ok: false, reason: "not_found" };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  return {
    ok: true,
    token: { id: row.id, token: row.token, canEdit: row.canEdit },
    list: {
      id: row.list.id,
      name: row.list.name,
      description: row.list.description,
      columns: (Array.isArray(row.list.columns) ? (row.list.columns as unknown as OutreachColumn[]) : []),
    },
  };
}

export async function getOutreachCollaborator(listId: string) {
  const jar = await cookies();
  const id = jar.get(outreachCollabCookieName(listId))?.value;
  if (!id) return null;
  const collab = await prisma.outreachCollaborator.findUnique({ where: { id } });
  if (!collab || collab.listId !== listId) return null;
  return collab;
}
