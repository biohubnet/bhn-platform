import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HrWorkspace, type PostingSummary, type QueueItem } from "@/components/employer/workspace/HrWorkspace";
import { SetPasswordBanner } from "@/components/employer/SetPasswordBanner";

/**
 * /employer — the unified HR workspace.
 *
 * Single linear scroll. Every action expands inline; the recruiter
 * never clicks through to a separate page. Replaces the earlier
 * navigation tree (postings list → posting detail → applicants
 * board → applicant detail → interview dialog → offer composer)
 * with one page that opens depth in place.
 *
 * Server responsibilities
 *   - Load all postings the recruiter owns (admins see everything)
 *   - Compute per-stage counts in one groupBy
 *   - Build the action queue (new triage / stale / awaiting offer
 *     response) so the workspace can lead with what needs attention
 *   - Detect "fresh employer" (no company profile + zero postings)
 *     so the welcome banner shows the right copy
 *   - Render <HrWorkspace> with everything pre-computed
 *
 * Client (HrWorkspace) handles all interactivity:
 *   - Expand a posting → loads applicants lazily
 *   - Expand an applicant → shows materials / AI fit / stage / comments inline
 *   - Schedule interview / send offer / create new posting → inline forms
 */
export const dynamic = "force-dynamic";

const ACTIVE_STAGES = [
  "new", "reviewing", "shortlisted", "phone_screen", "onsite", "offer",
] as const;

export default async function EmployerWorkspacePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "trainee";
  const userId = (session.user as { id?: string }).id ?? null;
  const isAdmin = role === "admin" || role === "superadmin";
  if (role !== "employer" && !isAdmin) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }

  const me = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, password: true,
          employerCompany: true, companyDescription: true, companyIndustry: true,
          companyLocation: true, companyLogo: true,
        },
      })
    : null;

  const postingsRaw = await prisma.internshipPosting.findMany({
    where: isAdmin ? {} : { createdById: userId ?? "_" },
    select: {
      id: true,
      title: true,
      companyName: true,
      location: true,
      status: true,
      deadline: true,
      contactEmail: true,
      createdAt: true,
      updatedAt: true,
      keySkills: true,
      compensation: true,
      hours: true,
      duration: true,
      type: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Per-stage counts in one groupBy ────────────────────────
  // Returns rows shaped { postingId, status, _count: { status } }.
  // We pivot to a Map keyed by postingId.
  const postingIds = postingsRaw.map((p) => p.id);
  const stageCounts = postingIds.length
    ? await prisma.applicationStatus.groupBy({
        by: ["postingId", "status"],
        where: { postingId: { in: postingIds } },
        _count: { status: true },
      })
    : [];
  const countsByPosting = new Map<string, Record<string, number>>();
  for (const g of stageCounts) {
    const m = countsByPosting.get(g.postingId) ?? {};
    m[g.status] = g._count.status;
    countsByPosting.set(g.postingId, m);
  }

  const since7d = new Date(Date.now() - 7 * 86_400_000);
  const since2d = new Date(Date.now() - 2 * 86_400_000);

  // ── Action queue: things genuinely needing attention ─────
  const queueRows = postingIds.length
    ? await prisma.applicationStatus.findMany({
        where: {
          postingId: { in: postingIds },
          OR: [
            // (1) new applications: status=new for any duration (just-arrived triage)
            { status: "new" },
            // (2) stale: in a non-terminal active stage for ≥7 days
            {
              status: { in: [...ACTIVE_STAGES] as string[] },
              stageEnteredAt: { lt: since7d },
            },
            // (3) offers waiting: status=offer for >2 days (waiting on candidate)
            {
              status: "offer",
              stageEnteredAt: { lt: since2d },
            },
          ],
        },
        select: {
          id: true,
          status: true,
          stageEnteredAt: true,
          posting: { select: { id: true, title: true } },
          applicant: { select: { id: true, name: true, email: true } },
        },
        orderBy: { stageEnteredAt: "asc" },
        take: 12,
      })
    : [];

  const actionQueue: QueueItem[] = queueRows.map((row) => {
    const days = Math.floor((Date.now() - row.stageEnteredAt.getTime()) / 86_400_000);
    const isOffer = row.status === "offer";
    const isStale = ACTIVE_STAGES.includes(row.status as (typeof ACTIVE_STAGES)[number]) && days >= 7 && row.status !== "new";
    const kind: QueueItem["kind"] =
      isOffer ? "offer-waiting" :
      isStale ? "stale" : "new";
    return {
      applicationStatusId: row.id,
      postingId: row.posting.id,
      postingTitle: row.posting.title,
      applicantId: row.applicant.id,
      applicantName: row.applicant.name ?? row.applicant.email,
      kind,
      daysInStage: days,
    };
  });

  const postings: PostingSummary[] = postingsRaw.map((p) => {
    const m = countsByPosting.get(p.id) ?? {};
    const total = Object.values(m).reduce((a, b) => a + b, 0);
    const newCount = m.new ?? 0;
    const inProgress =
      (m.reviewing ?? 0) + (m.shortlisted ?? 0) +
      (m.phone_screen ?? 0) + (m.onsite ?? 0) + (m.offer ?? 0);
    const hired = m.hired ?? 0;
    const closed = (m.rejected ?? 0) + (m.closed ?? 0);
    return {
      id: p.id,
      title: p.title,
      companyName: p.companyName,
      location: p.location,
      status: p.status,
      deadline: p.deadline?.toISOString() ?? null,
      contactEmail: p.contactEmail,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      keySkills: p.keySkills,
      compensation: p.compensation,
      hours: p.hours,
      duration: p.duration,
      type: p.type,
      counts: { total, newCount, inProgress, hired, closed },
    };
  });

  const profileEmpty = !me?.companyDescription && !me?.companyIndustry
    && !me?.companyLocation && !me?.companyLogo;
  const isFresh = postings.length === 0 && profileEmpty;
  const noPassword = !me?.password;

  return (
    <>
      {noPassword && <SetPasswordBanner className="mb-4" />}
      <HrWorkspace
        firstName={me?.name?.split(" ")[0] ?? null}
        companyName={me?.employerCompany ?? null}
        isAdmin={isAdmin}
        isFresh={isFresh}
        postings={postings}
        actionQueue={actionQueue}
      />
    </>
  );
}
