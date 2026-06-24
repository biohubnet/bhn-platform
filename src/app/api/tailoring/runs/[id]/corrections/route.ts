/**
 * Record a correction on a run and (optionally) codify it into a rule
 * applied to all future runs in scope (rule 15 — the learning loop).
 *   POST { before, after, ruleText?, scope?, trigger? }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { codifyCorrection } from "@/lib/tailoring/rules";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ id: string }> }

async function uid(): Promise<string | null> {
  const s = await requireSession().catch(() => null);
  return s ? (s.user as { id?: string }).id ?? null : null;
}

const Body = z.object({
  before: z.string().default(""),
  after: z.string().default(""),
  ruleText: z.string().optional(),
  scope: z.enum(["global", "roleType", "ats", "company"]).optional(),
  trigger: z.string().optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  // Ownership check.
  const run = await prisma.tailoringRun.findFirst({ where: { id, userId }, select: { id: true } });
  if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const d = parsed.data;
  if (!d.before && !d.after && !d.ruleText) {
    return NextResponse.json({ error: "Nothing to record." }, { status: 400 });
  }

  const res = await codifyCorrection({
    runId: id, userId, before: d.before, after: d.after,
    ruleText: d.ruleText ?? null, scope: d.scope, trigger: d.trigger ?? null,
  });
  return NextResponse.json({ ok: true, ...res });
}
