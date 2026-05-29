/**
 * Requisition status & aging — open/active/closed counts, age buckets,
 * stale-req detection, and a per-req row (applicants, hires, days open).
 * Snapshot "as of" the range end.
 */
import { prisma } from "@/lib/prisma";
import type { DateRange } from "./types";
import { daysBetween } from "./format";

export interface ReqRow {
  id: string;
  title: string;
  status: string;
  daysOpen: number;
  applicants: number;
  hired: number;
  ageBucket: string;
  stale: boolean;
}

export interface RequisitionReport {
  active: number;
  closed: number;
  draft: number;
  expired: number;
  agingBuckets: { label: string; count: number }[];
  rows: ReqRow[];
  staleCount: number;
}

const AGE_LABELS = ["0–14d", "15–30d", "31–60d", "60d+"];
const ageBucketOf = (days: number) =>
  days <= 14 ? AGE_LABELS[0] : days <= 30 ? AGE_LABELS[1] : days <= 60 ? AGE_LABELS[2] : AGE_LABELS[3];

export async function requisitionReport(companyId: string, asOf: DateRange): Promise<RequisitionReport> {
  const postings = await prisma.internshipPosting
    .findMany({
      where: { companyId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        applicationStatuses: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  const now = asOf.end;
  let active = 0, closed = 0, draft = 0, expired = 0, staleCount = 0;
  const bucketCounts = new Map<string, number>();

  const rows: ReqRow[] = postings.map((p) => {
    const daysOpen = daysBetween(p.createdAt, now);
    const applicants = p.applicationStatuses.length;
    const hired = p.applicationStatuses.filter((a) => a.status === "hired").length;
    if (p.status === "active") active++;
    else if (p.status === "closed") closed++;
    else if (p.status === "draft") draft++;
    else if (p.status === "expired") expired++;

    const ageBucket = ageBucketOf(daysOpen);
    if (p.status === "active") bucketCounts.set(ageBucket, (bucketCounts.get(ageBucket) ?? 0) + 1);

    const stale = p.status === "active" && daysOpen > 30 && hired === 0;
    if (stale) staleCount++;

    return { id: p.id, title: p.title, status: p.status, daysOpen, applicants, hired, ageBucket, stale };
  });

  return {
    active,
    closed,
    draft,
    expired,
    agingBuckets: AGE_LABELS.map((label) => ({ label, count: bucketCounts.get(label) ?? 0 })),
    rows,
    staleCount,
  };
}
