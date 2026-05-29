/**
 * Cost-per-hire — total recruiting spend / hires, plus breakdowns by
 * cost type and posting. Decimal `amount` is converted to Number at the
 * read boundary (first Decimal columns in the repo — never arithmetic
 * on raw Prisma Decimals).
 */
import { prisma } from "@/lib/prisma";
import type { DateRange, MetricResult } from "./types";
import { fmtMoney } from "./format";

export interface CostReport {
  costPerHire: MetricResult;
  totalSpend: number;
  hires: number;
  currency: string;
  byType: { costType: string; amount: number }[];
  byPosting: { postingId: string | null; title: string; amount: number }[];
}

export async function costReport(companyId: string, range: DateRange): Promise<CostReport> {
  const [costs, hires] = await Promise.all([
    prisma.recruitingCost
      .findMany({
        where: { companyId, incurredAt: { gte: range.start, lt: range.end } },
        select: { costType: true, amount: true, currency: true, posting: { select: { id: true, title: true } } },
      })
      .catch(() => []),
    prisma.applicationStatus
      .count({ where: { posting: { companyId }, status: "hired", stageEnteredAt: { gte: range.start, lt: range.end } } })
      .catch(() => 0),
  ]);

  let total = 0;
  const currency = costs[0]?.currency ?? "CAD";
  const byTypeMap = new Map<string, number>();
  const byPostMap = new Map<string, { title: string; amount: number }>();

  for (const c of costs) {
    const amt = Number(c.amount); // Decimal → number at the boundary
    total += amt;
    byTypeMap.set(c.costType, (byTypeMap.get(c.costType) ?? 0) + amt);
    const key = c.posting?.id ?? "__company__";
    const title = c.posting?.title ?? "Company-wide";
    const prev = byPostMap.get(key);
    byPostMap.set(key, { title, amount: (prev?.amount ?? 0) + amt });
  }

  const cph = hires > 0 ? total / hires : null;

  return {
    costPerHire: {
      value: cph,
      formatted: cph == null ? "—" : fmtMoney(cph, currency),
      n: hires,
      unit: "currency",
      note: hires === 0 && total > 0 ? `${fmtMoney(total, currency)} spent · no hires in period` : undefined,
    },
    totalSpend: total,
    hires,
    currency,
    byType: [...byTypeMap.entries()].map(([costType, amount]) => ({ costType, amount })).sort((a, b) => b.amount - a.amount),
    byPosting: [...byPostMap.entries()]
      .map(([id, v]) => ({ postingId: id === "__company__" ? null : id, title: v.title, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}
