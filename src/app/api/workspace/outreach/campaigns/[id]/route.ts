/**
 * One outreach campaign (admin-only).
 *   PATCH  /api/workspace/outreach/campaigns/[id]
 *     { name? } | { status? } | { notes? } | { vars? }            → edit fields
 *     { markSent: personId }   → mark a recipient reached (logs a reach-out
 *                                touch on that contact, so it shows in history)
 *     { unmarkSent: personId } → undo "reached" (keeps the logged touch)
 *   DELETE /api/workspace/outreach/campaigns/[id]
 *     → delete the campaign (contacts + their history are untouched)
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

const STATUSES = new Set(["draft", "active", "done"]);

function sanitizeVars(input: unknown): Record<string, string> | null {
  if (typeof input !== "object" || input === null) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k === "string" && k.length <= 40 && typeof v === "string") out[k] = v.slice(0, 2000);
  }
  return out;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uid = (session.user as { id?: string }).id ?? null;
  const byName = (session.user as { name?: string }).name ?? "Admin";
  const { id } = await ctx.params;
  const campaign = await prisma.outreachCampaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown; status?: unknown; notes?: unknown; vars?: unknown;
    markSent?: unknown; unmarkSent?: unknown;
  };

  // ── Mark a recipient reached — atomically append to sentPersonIds (a jsonb
  // array), log a touch, and stamp introSentAt on the transition. The append is
  // one row-locked UPDATE guarded by @>, so concurrent "mark A / mark B" clicks
  // can't clobber each other (Postgres serializes writes to the same row) and a
  // double-click is idempotent — no read-modify-write window. ──
  if (typeof body.markSent === "string") {
    const personId = body.markSent;
    const person = await prisma.outreachPerson.findUnique({ where: { id: personId }, select: { introSentAt: true } });
    if (!person) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    const appended = await prisma.$executeRaw`
      UPDATE "OutreachCampaign"
      SET "sentPersonIds" = ("sentPersonIds"::jsonb || to_jsonb(${personId}::text))
      WHERE id = ${id} AND NOT ("sentPersonIds"::jsonb @> to_jsonb(${personId}::text))`;
    // appended === 1 only on the real transition (0 on a repeat/concurrent
    // click), so the touch + intro stamp fire exactly once.
    if (appended > 0) {
      const ops: Prisma.PrismaPromise<unknown>[] = [
        prisma.outreachTouch.create({
          data: { personId, listId: campaign.listId, kind: "email", note: `Campaign: ${campaign.name}`, byId: uid, byName },
        }),
      ];
      if (!person.introSentAt) {
        ops.push(prisma.outreachPerson.update({ where: { id: personId }, data: { introSentAt: new Date() } }));
      }
      await prisma.$transaction(ops);
    }
    return NextResponse.json({ ok: true });
  }

  if (typeof body.unmarkSent === "string") {
    const personId = body.unmarkSent;
    // Atomic filter-out (row-locked single UPDATE — no read-modify-write race).
    await prisma.$executeRaw`
      UPDATE "OutreachCampaign"
      SET "sentPersonIds" = COALESCE(
        (SELECT jsonb_agg(e) FROM jsonb_array_elements_text("sentPersonIds"::jsonb) e WHERE e <> ${personId}),
        '[]'::jsonb)
      WHERE id = ${id}`;
    // If this person is no longer marked reached in ANY campaign, no intro was
    // actually sent — clear introSentAt so they get the intro copy again instead
    // of being permanently misclassified as a returning contact.
    const stillReached = await prisma.outreachCampaign.count({
      where: { sentPersonIds: { array_contains: personId } },
    });
    if (stillReached === 0) {
      await prisma.outreachPerson.update({ where: { id: personId }, data: { introSentAt: null } }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  // ── Field edits ──
  const data: Prisma.OutreachCampaignUpdateInput = {};
  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 120);
    if (!name) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    data.name = name;
  }
  if (typeof body.status === "string") {
    if (!STATUSES.has(body.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    data.status = body.status;
  }
  if (typeof body.notes === "string") data.notes = body.notes.slice(0, 4000);
  if (body.vars !== undefined) {
    const vars = sanitizeVars(body.vars);
    if (!vars) return NextResponse.json({ error: "Invalid details." }, { status: 400 });
    data.vars = vars as unknown as Prisma.InputJsonValue;
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No changes." }, { status: 400 });

  await prisma.outreachCampaign.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.outreachCampaign.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
