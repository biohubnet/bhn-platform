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

const asIds = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

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

  // ── Mark a recipient reached — adds to sentPersonIds + logs a touch, and
  // stamps introSentAt if this was their first contact (the intro was sent). ──
  if (typeof body.markSent === "string") {
    const personId = body.markSent;
    const sent = asIds(campaign.sentPersonIds);
    if (!sent.includes(personId)) {
      const person = await prisma.outreachPerson.findUnique({ where: { id: personId }, select: { id: true, introSentAt: true } });
      if (!person) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
      const ops: Prisma.PrismaPromise<unknown>[] = [
        prisma.outreachCampaign.update({
          where: { id },
          data: { sentPersonIds: [...sent, personId] as unknown as Prisma.InputJsonValue },
        }),
        prisma.outreachTouch.create({
          data: { personId, listId: campaign.listId, kind: "email", note: `Campaign: ${campaign.name}`, byId: uid, byName },
        }),
      ];
      // Reaching a contact who had no intro on file = their intro was just sent.
      if (!person.introSentAt) {
        ops.push(prisma.outreachPerson.update({ where: { id: personId }, data: { introSentAt: new Date() } }));
      }
      await prisma.$transaction(ops);
    }
    return NextResponse.json({ ok: true });
  }

  if (typeof body.unmarkSent === "string") {
    const personId = body.unmarkSent;
    const sent = asIds(campaign.sentPersonIds).filter((x) => x !== personId);
    await prisma.outreachCampaign.update({
      where: { id },
      data: { sentPersonIds: sent as unknown as Prisma.InputJsonValue },
    });
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
