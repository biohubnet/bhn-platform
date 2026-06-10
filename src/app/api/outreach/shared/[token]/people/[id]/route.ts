/**
 * Public (no login) — edit a person's SHARED fields from a shared list.
 *   PATCH /api/outreach/shared/[token]/people/[id] { values }
 * Allowed only for people who are ON the token's list. E-mail collisions are
 * rejected with a clear message (merging is admin-only).
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveOutreachToken, getOutreachCollaborator } from "@/lib/outreach/share";
import { emailKey } from "@/lib/outreach/directory";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ token: string; id: string }> }

function sanitizeValues(input: unknown): Record<string, string> | null {
  if (typeof input !== "object" || input === null) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k === "string" && k.length <= 40 && typeof v === "string") out[k] = v.slice(0, 1000);
  }
  return out;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { token, id } = await ctx.params;
  const res = await resolveOutreachToken(token);
  if (!res.ok) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  if (!res.token.canEdit) return NextResponse.json({ error: "This link is view-only." }, { status: 403 });
  const collab = await getOutreachCollaborator(res.list.id);
  if (!collab) return NextResponse.json({ error: "Please join with your name first." }, { status: 401 });

  // The person must be on THIS list for a guest to touch them.
  const membership = await prisma.outreachMembership.findUnique({
    where: { listId_personId: { listId: res.list.id, personId: id } },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { values?: unknown };
  const values = sanitizeValues(body.values);
  if (!values) return NextResponse.json({ error: "Invalid values." }, { status: 400 });

  const newEmail = emailKey(values.email);
  if (newEmail) {
    const others = await prisma.outreachPerson.findMany({
      where: { id: { not: id } },
      select: { id: true, values: true },
    });
    const clash = others.find((p) => emailKey((p.values as Record<string, string>)?.email) === newEmail);
    if (clash) {
      const cv = clash.values as Record<string, string>;
      return NextResponse.json(
        { error: `${values.email} already belongs to ${cv?.name || "another contact"}${cv?.org ? ` (${cv.org})` : ""} in the BHN directory — ask the BHN team to merge them.` },
        { status: 409 },
      );
    }
  }

  await prisma.outreachPerson.update({
    where: { id },
    data: { values: values as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json({ ok: true });
}
