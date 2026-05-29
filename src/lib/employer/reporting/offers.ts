/**
 * Offer analytics — acceptance rate, response time, decline reasons,
 * outcome counts. All from the Offer table (windowed on sentAt).
 */
import { prisma } from "@/lib/prisma";
import type { DateRange, MetricResult } from "./types";
import { rate, median, daysBetween, fmtDays, fmtPercent } from "./format";

export interface OfferReport {
  acceptanceRate: MetricResult;   // accepted / responded
  responseTimeDays: MetricResult; // median sentAt → respondedAt
  sent: number;
  accepted: number;
  declined: number;
  expired: number;
  outstanding: number;
  declineReasons: { reason: string; count: number }[];
}

export async function offerReport(companyId: string, range: DateRange): Promise<OfferReport> {
  const offers = await prisma.offer
    .findMany({
      where: { posting: { companyId }, sentAt: { gte: range.start, lt: range.end } },
      select: { status: true, sentAt: true, respondedAt: true, declineReason: true },
    })
    .catch(() => []);

  let accepted = 0, declined = 0, expired = 0, outstanding = 0;
  const responseDays: number[] = [];
  const declineMap = new Map<string, number>();

  for (const o of offers) {
    if (o.status === "accepted") accepted++;
    else if (o.status === "declined") declined++;
    else if (o.status === "expired") expired++;
    else outstanding++; // sent / withdrawn
    if (o.respondedAt && o.sentAt) responseDays.push(daysBetween(o.sentAt, o.respondedAt));
    if (o.status === "declined" && o.declineReason) {
      declineMap.set(o.declineReason, (declineMap.get(o.declineReason) ?? 0) + 1);
    }
  }

  const responded = accepted + declined;
  const accRate = rate(accepted, responded);
  const respMed = median(responseDays);

  return {
    acceptanceRate: { value: accRate, formatted: fmtPercent(accRate, 0), n: responded, unit: "percent" },
    responseTimeDays: { value: respMed, formatted: fmtDays(respMed), n: responseDays.length, unit: "days" },
    sent: offers.length,
    accepted,
    declined,
    expired,
    outstanding,
    declineReasons: [...declineMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}
