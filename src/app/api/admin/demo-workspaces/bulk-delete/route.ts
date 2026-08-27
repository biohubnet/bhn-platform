/**
 * Admin bulk-delete for demo workspaces.
 *
 *   POST /api/admin/demo-workspaces/bulk-delete
 *     body: { employerIds?: string[], inviteIds?: string[] }
 *
 * Lets the admin tick multiple rows on /admin/demo-workspaces and
 * delete them in one round trip, instead of clicking "End demo" on
 * each one in turn. Per-employer deletion routes through the same
 * `deleteDemoWorkspace` helper the single-row path uses, so the
 * cascade behaviour is identical. Invite deletes are scoped to
 * `demoMode = true` defensively — we don't want a malformed payload
 * to ever take a non-demo invite with it.
 *
 * Returns the count of demo workspaces removed (each = employer +
 * their seeded applicants + postings + statuses) and the count of
 * invite rows wiped.
 */
import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";
import { deleteDemoWorkspace } from "@/lib/demo/workspace";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const body = (await req.json().catch(() => ({}))) as {
    employerIds?: unknown;
    inviteIds?: unknown;
  };

  const employerIds = Array.isArray(body.employerIds)
    ? body.employerIds.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
  const inviteIds = Array.isArray(body.inviteIds)
    ? body.inviteIds.filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];

  let removed = 0;
  for (const id of employerIds) {
    const r = await deleteDemoWorkspace(id);
    removed += r.removed;
  }
  const inv = inviteIds.length
    ? await prisma.employerInvite.deleteMany({
        where: { id: { in: inviteIds }, demoMode: true },
      })
    : { count: 0 };

  return NextResponse.json({ ok: true, removed, invitesDeleted: inv.count });
}
