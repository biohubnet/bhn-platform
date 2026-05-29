/**
 * Recruiter / team productivity — activity volume by member, from the
 * EmployerActivityLog (the attributable-action log) plus interviews
 * scheduled and scorecards submitted. Joined to CompanyMember for names.
 */
import { prisma } from "@/lib/prisma";
import type { DateRange } from "./types";

export interface RecruiterRow {
  userId: string;
  name: string;
  role: string | null;
  title: string | null;
  actions: number;
  interviews: number;
  scorecards: number;
  hires: number;
  byKind: Record<string, number>;
}

export interface ProductivityReport {
  rows: RecruiterRow[];
  totalActions: number;
  kinds: string[];
}

export async function productivityReport(companyId: string, range: DateRange): Promise<ProductivityReport> {
  const [activity, members, interviews, scorecards] = await Promise.all([
    prisma.employerActivityLog
      .findMany({ where: { companyId, createdAt: { gte: range.start, lt: range.end } }, select: { actorId: true, kind: true } })
      .catch(() => [] as { actorId: string; kind: string }[]),
    prisma.companyMember
      .findMany({ where: { companyId }, select: { userId: true, role: true, title: true, user: { select: { name: true, email: true } } } })
      .catch(() => [] as { userId: string; role: string; title: string | null; user: { name: string | null; email: string } }[]),
    prisma.interview
      .findMany({ where: { posting: { companyId }, createdAt: { gte: range.start, lt: range.end } }, select: { scheduledById: true } })
      .catch(() => [] as { scheduledById: string }[]),
    prisma.scorecardSubmission
      .findMany({
        where: { applicationStatus: { posting: { companyId } }, status: "submitted", submittedAt: { gte: range.start, lt: range.end } },
        select: { interviewerId: true },
      })
      .catch(() => [] as { interviewerId: string }[]),
  ]);

  const map = new Map<string, RecruiterRow>();
  const ensure = (userId: string): RecruiterRow => {
    let r = map.get(userId);
    if (!r) {
      r = { userId, name: "", role: null, title: null, actions: 0, interviews: 0, scorecards: 0, hires: 0, byKind: {} };
      map.set(userId, r);
    }
    return r;
  };

  for (const m of members) {
    const r = ensure(m.userId);
    r.name = m.user.name ?? m.user.email ?? "Unknown";
    r.role = m.role;
    r.title = m.title;
  }

  let totalActions = 0;
  const kinds = new Set<string>();
  for (const a of activity) {
    const r = ensure(a.actorId);
    r.actions++;
    totalActions++;
    r.byKind[a.kind] = (r.byKind[a.kind] ?? 0) + 1;
    kinds.add(a.kind);
    if (a.kind === "applicant_hired") r.hires++;
  }
  for (const iv of interviews) ensure(iv.scheduledById).interviews++;
  for (const sc of scorecards) ensure(sc.interviewerId).scorecards++;

  // Resolve names for actors who aren't CompanyMembers (e.g. an admin
  // previewing, or the seeding account).
  const missing = [...map.values()].filter((r) => !r.name);
  if (missing.length) {
    const users = await prisma.user
      .findMany({ where: { id: { in: missing.map((m) => m.userId) } }, select: { id: true, name: true, email: true } })
      .catch(() => [] as { id: string; name: string | null; email: string }[]);
    const byId = new Map(users.map((u) => [u.id, u.name ?? u.email ?? "Unknown"]));
    for (const r of missing) r.name = byId.get(r.userId) ?? "Unknown";
  }

  const rows = [...map.values()]
    .filter((r) => r.actions + r.interviews + r.scorecards > 0)
    .sort((a, b) => b.actions + b.interviews + b.scorecards - (a.actions + a.interviews + a.scorecards));

  return { rows, totalActions, kinds: [...kinds].sort() };
}
