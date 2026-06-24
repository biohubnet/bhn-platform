/**
 * Learning loop (rule 15). Codified corrections/preferences are loaded
 * into the drafting prompt for every future run in scope, so a
 * correction is only needed once.
 */
import { prisma } from "@/lib/prisma";

export interface RuleContext { ats?: string | null; company?: string | null; roleType?: string | null }

/** Active rules that apply to this run: all global rules for the user
 *  (or anonymous-global), plus scoped rules whose trigger matches. */
export async function loadActiveRules(userId: string, ctx: RuleContext): Promise<string[]> {
  const rules = await prisma.tailoringRule.findMany({
    where: { isActive: true, OR: [{ userId }, { userId: null }] },
    orderBy: { codifiedAt: "asc" },
    select: { scope: true, trigger: true, ruleText: true },
  });
  const match = (scope: string, trigger: string) => {
    if (scope === "global") return true;
    const t = trigger.trim().toLowerCase();
    if (t === "*") return true;
    if (scope === "ats") return !!ctx.ats && ctx.ats.toLowerCase() === t;
    if (scope === "company") return !!ctx.company && ctx.company.toLowerCase().includes(t);
    if (scope === "roleType") return !!ctx.roleType && ctx.roleType.toLowerCase().includes(t);
    return false;
  };
  return rules.filter((r) => match(r.scope, r.trigger)).map((r) => r.ruleText);
}

/** Record a correction the user made, and (optionally) promote it to a
 *  reusable rule applied on all future runs in scope. */
export async function codifyCorrection(args: {
  runId: string;
  userId: string;
  before: string;
  after: string;
  ruleText?: string | null;
  scope?: "global" | "roleType" | "ats" | "company";
  trigger?: string | null;
}): Promise<{ correctionId: string; ruleId: string | null }> {
  let ruleId: string | null = null;
  if (args.ruleText && args.ruleText.trim()) {
    const rule = await prisma.tailoringRule.create({
      data: {
        userId: args.userId,
        scope: args.scope ?? "global",
        trigger: args.trigger?.trim() || "*",
        ruleText: args.ruleText.trim(),
      },
      select: { id: true },
    });
    ruleId = rule.id;
  }
  const correction = await prisma.tailoringCorrection.create({
    data: { runId: args.runId, before: args.before, after: args.after, ruleId },
    select: { id: true },
  });
  return { correctionId: correction.id, ruleId };
}
